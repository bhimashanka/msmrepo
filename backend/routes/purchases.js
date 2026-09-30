const express = require('express');
const router = express.Router();
const { allAsync, runAsync, getAsync } = require('../db');
const { authenticateUser, authorizeRoles, scopeBaseAccess } = require('../middleware/auth');
const { logTransaction } = require('../middleware/auditLogger');

// GET /api/purchases - View historical purchases with filters
router.get('/', authenticateUser, scopeBaseAccess, authorizeRoles('admin', 'base_commander', 'logistics_officer'), async (req, res) => {
  try {
    const { base_id, equipment_id, start_date, end_date } = req.query;
    const effectiveBaseId = req.user.role === 'base_commander' ? req.user.base_id : base_id;

    let where = [];
    let params = [];

    if (effectiveBaseId && effectiveBaseId !== 'all') {
      where.push('p.base_id = ?');
      params.push(effectiveBaseId);
    }
    if (equipment_id && equipment_id !== 'all') {
      where.push('p.equipment_id = ?');
      params.push(equipment_id);
    }
    if (start_date) {
      where.push('p.purchase_date >= ?');
      params.push(start_date);
    }
    if (end_date) {
      where.push('p.purchase_date <= ?');
      params.push(end_date);
    }

    const purchases = await allAsync(`
      SELECT p.*, b.name as base_name, b.code as base_code, e.name as equipment_name, e.category as equipment_category, e.unit_of_measure
      FROM purchases p
      JOIN bases b ON p.base_id = b.id
      JOIN equipment_types e ON p.equipment_id = e.id
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
      ORDER BY p.purchase_date DESC, p.id DESC
    `, params);

    res.json(purchases);
  } catch (err) {
    console.error('Fetch purchases error:', err);
    res.status(500).json({ error: 'Failed to fetch purchases', details: err.message });
  }
});

// POST /api/purchases - Record a new purchase
router.get('/:id', authenticateUser, async (req, res) => {
  try {
    const purchase = await getAsync(`
      SELECT p.*, b.name as base_name, e.name as equipment_name 
      FROM purchases p 
      JOIN bases b ON p.base_id = b.id 
      JOIN equipment_types e ON p.equipment_id = e.id 
      WHERE p.id = ?
    `, [req.params.id]);

    if (!purchase) return res.status(404).json({ error: 'Purchase record not found' });
    res.json(purchase);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', authenticateUser, authorizeRoles('admin', 'base_commander', 'logistics_officer'), async (req, res) => {
  try {
    const { base_id, equipment_id, quantity, unit_cost, supplier, po_reference, purchase_date } = req.body;

    // RBAC check: Base Commanders can only record purchases for their assigned base
    if (req.user.role === 'base_commander' && parseInt(base_id) !== parseInt(req.user.base_id)) {
      return res.status(403).json({ error: 'Base Commanders can only record purchases for their assigned base.' });
    }

    if (!base_id || !equipment_id || !quantity || quantity <= 0 || unit_cost === undefined || !supplier || !po_reference || !purchase_date) {
      return res.status(400).json({ error: 'All fields are required and quantity must be greater than 0.' });
    }

    const totalCost = Number(quantity) * Number(unit_cost);

    // Insert purchase
    const result = await runAsync(`
      INSERT INTO purchases (base_id, equipment_id, quantity, unit_cost, total_cost, supplier, po_reference, purchase_date, created_by_user)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [base_id, equipment_id, quantity, unit_cost, totalCost, supplier, po_reference, purchase_date, req.user.username]);

    // Upsert Inventory Stock
    const existingInv = await getAsync('SELECT * FROM inventory WHERE base_id = ? AND equipment_id = ?', [base_id, equipment_id]);
    if (existingInv) {
      await runAsync('UPDATE inventory SET current_stock = current_stock + ? WHERE base_id = ? AND equipment_id = ?', [quantity, base_id, equipment_id]);
    } else {
      await runAsync('INSERT INTO inventory (base_id, equipment_id, opening_balance, current_stock) VALUES (?, ?, 0, ?)', [base_id, equipment_id, quantity]);
    }

    // Log Audit
    await logTransaction(req, 'PURCHASE_RECORDED', 'Purchases', {
      purchase_id: result.lastID,
      base_id,
      equipment_id,
      quantity,
      unit_cost,
      totalCost,
      supplier,
      po_reference
    });

    res.status(201).json({
      message: 'Purchase recorded successfully',
      purchaseId: result.lastID,
      totalCost
    });
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE constraint failed: purchases.po_reference')) {
      return res.status(400).json({ error: 'PO Reference number already exists. Please use a unique PO number.' });
    }
    console.error('Create purchase error:', err);
    res.status(500).json({ error: 'Failed to record purchase', details: err.message });
  }
});

// DELETE /api/purchases/:id - Remove a purchase record
router.delete('/:id', authenticateUser, authorizeRoles('admin', 'base_commander', 'logistics_officer'), async (req, res) => {
  try {
    const purchase = await getAsync('SELECT * FROM purchases WHERE id = ?', [req.params.id]);
    if (!purchase) return res.status(404).json({ error: 'Purchase record not found' });

    // RBAC Check for Base Commander
    if (req.user.role === 'base_commander' && parseInt(purchase.base_id) !== parseInt(req.user.base_id)) {
      return res.status(403).json({ error: 'Base Commanders can only delete purchases for their assigned base.' });
    }

    // Delete purchase
    await runAsync('DELETE FROM purchases WHERE id = ?', [req.params.id]);

    // Adjust inventory stock back
    await runAsync('UPDATE inventory SET current_stock = MAX(0, current_stock - ?) WHERE base_id = ? AND equipment_id = ?', [purchase.quantity, purchase.base_id, purchase.equipment_id]);

    // Log Audit
    await logTransaction(req, 'PURCHASE_DELETED', 'Purchases', {
      purchase_id: req.params.id,
      po_reference: purchase.po_reference,
      quantity: purchase.quantity
    });

    res.json({ message: 'Purchase record deleted successfully' });
  } catch (err) {
    console.error('Delete purchase error:', err);
    res.status(500).json({ error: 'Failed to delete purchase', details: err.message });
  }
});

module.exports = router;
