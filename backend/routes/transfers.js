const express = require('express');
const router = express.Router();
const { allAsync, runAsync, getAsync } = require('../db');
const { authenticateUser, authorizeRoles, scopeBaseAccess } = require('../middleware/auth');
const { logTransaction } = require('../middleware/auditLogger');

// GET /api/transfers - List transfers with filters
router.get('/', authenticateUser, scopeBaseAccess, authorizeRoles('admin', 'base_commander', 'logistics_officer'), async (req, res) => {
  try {
    const { base_id, equipment_id, status, start_date, end_date } = req.query;
    const effectiveBaseId = req.user.role === 'base_commander' ? req.user.base_id : base_id;

    let where = [];
    let params = [];

    if (effectiveBaseId && effectiveBaseId !== 'all') {
      where.push('(t.source_base_id = ? OR t.dest_base_id = ?)');
      params.push(effectiveBaseId, effectiveBaseId);
    }
    if (equipment_id && equipment_id !== 'all') {
      where.push('t.equipment_id = ?');
      params.push(equipment_id);
    }
    if (status && status !== 'all') {
      where.push('t.status = ?');
      params.push(status);
    }
    if (start_date) {
      where.push('t.transfer_date >= ?');
      params.push(start_date);
    }
    if (end_date) {
      where.push('t.transfer_date <= ?');
      params.push(end_date);
    }

    const transfers = await allAsync(`
      SELECT t.*, 
             sb.name as source_base_name, sb.code as source_base_code,
             db.name as dest_base_name, db.code as dest_base_code,
             e.name as equipment_name, e.category as equipment_category, e.unit_of_measure
      FROM transfers t
      JOIN bases sb ON t.source_base_id = sb.id
      JOIN bases db ON t.dest_base_id = db.id
      JOIN equipment_types e ON t.equipment_id = e.id
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
      ORDER BY t.transfer_date DESC, t.id DESC
    `, params);

    res.json(transfers);
  } catch (err) {
    console.error('Fetch transfers error:', err);
    res.status(500).json({ error: 'Failed to fetch transfers', details: err.message });
  }
});

// POST /api/transfers - Initiate inter-base transfer
router.post('/', authenticateUser, authorizeRoles('admin', 'base_commander', 'logistics_officer'), async (req, res) => {
  try {
    const { source_base_id, dest_base_id, equipment_id, quantity, transfer_date, tracking_number, notes, status } = req.body;

    if (parseInt(source_base_id) === parseInt(dest_base_id)) {
      return res.status(400).json({ error: 'Source base and destination base cannot be the same.' });
    }

    // Base Commander restriction: Source base must be their base
    if (req.user.role === 'base_commander' && parseInt(source_base_id) !== parseInt(req.user.base_id)) {
      return res.status(403).json({ error: 'Base Commanders can only initiate outgoing transfers from their assigned base.' });
    }

    if (!source_base_id || !dest_base_id || !equipment_id || !quantity || quantity <= 0 || !transfer_date || !tracking_number) {
      return res.status(400).json({ error: 'Source, destination, equipment, valid quantity, date, and tracking number are required.' });
    }

    // Check if source base has sufficient available stock
    const sourceStockRow = await getAsync('SELECT current_stock FROM inventory WHERE base_id = ? AND equipment_id = ?', [source_base_id, equipment_id]);
    const availableStock = sourceStockRow ? sourceStockRow.current_stock : 0;

    if (availableStock < quantity) {
      return res.status(400).json({ error: `Insufficient stock at source base. Available: ${availableStock} units, Requested: ${quantity} units.` });
    }

    const transferStatus = status || 'Completed'; // Default to Completed or Pending/In-Transit

    // Insert transfer
    const result = await runAsync(`
      INSERT INTO transfers (source_base_id, dest_base_id, equipment_id, quantity, transfer_date, status, tracking_number, notes, initiated_by_user)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [source_base_id, dest_base_id, equipment_id, quantity, transfer_date, transferStatus, tracking_number, notes || '', req.user.username]);

    // If status is Completed right away, adjust stock for both bases
    if (transferStatus === 'Completed') {
      await runAsync('UPDATE inventory SET current_stock = current_stock - ? WHERE base_id = ? AND equipment_id = ?', [quantity, source_base_id, equipment_id]);

      const destStock = await getAsync('SELECT * FROM inventory WHERE base_id = ? AND equipment_id = ?', [dest_base_id, equipment_id]);
      if (destStock) {
        await runAsync('UPDATE inventory SET current_stock = current_stock + ? WHERE base_id = ? AND equipment_id = ?', [quantity, dest_base_id, equipment_id]);
      } else {
        await runAsync('INSERT INTO inventory (base_id, equipment_id, opening_balance, current_stock) VALUES (?, ?, 0, ?)', [dest_base_id, equipment_id, quantity]);
      }
    }

    // Log Audit
    await logTransaction(req, 'TRANSFER_INITIATED', 'Transfers', {
      transfer_id: result.lastID,
      source_base_id,
      dest_base_id,
      equipment_id,
      quantity,
      status: transferStatus,
      tracking_number
    });

    res.status(201).json({
      message: 'Transfer recorded successfully',
      transferId: result.lastID,
      status: transferStatus
    });
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE constraint failed: transfers.tracking_number')) {
      return res.status(400).json({ error: 'Tracking number already exists. Please provide a unique tracking ref.' });
    }
    console.error('Create transfer error:', err);
    res.status(500).json({ error: 'Failed to initiate transfer', details: err.message });
  }
});

// PATCH /api/transfers/:id/status - Update transfer status (e.g. In-Transit -> Completed)
router.patch('/:id/status', authenticateUser, authorizeRoles('admin', 'base_commander', 'logistics_officer'), async (req, res) => {
  try {
    const { status } = req.body;
    const transferId = req.params.id;

    const transfer = await getAsync('SELECT * FROM transfers WHERE id = ?', [transferId]);
    if (!transfer) return res.status(404).json({ error: 'Transfer record not found.' });

    if (transfer.status === 'Completed') {
      return res.status(400).json({ error: 'Transfer has already been marked as Completed.' });
    }

    if (['Completed', 'Cancelled', 'In-Transit'].indexOf(status) === -1) {
      return res.status(400).json({ error: 'Invalid status update.' });
    }

    // Update status
    await runAsync('UPDATE transfers SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [status, transferId]);

    // If status became Completed, reflect inventory stock changes
    if (status === 'Completed') {
      await runAsync('UPDATE inventory SET current_stock = current_stock - ? WHERE base_id = ? AND equipment_id = ?', [transfer.quantity, transfer.source_base_id, transfer.equipment_id]);

      const destStock = await getAsync('SELECT * FROM inventory WHERE base_id = ? AND equipment_id = ?', [transfer.dest_base_id, transfer.equipment_id]);
      if (destStock) {
        await runAsync('UPDATE inventory SET current_stock = current_stock + ? WHERE base_id = ? AND equipment_id = ?', [transfer.quantity, transfer.dest_base_id, transfer.equipment_id]);
      } else {
        await runAsync('INSERT INTO inventory (base_id, equipment_id, opening_balance, current_stock) VALUES (?, ?, 0, ?)', [transfer.dest_base_id, transfer.equipment_id, transfer.quantity]);
      }
    }

    await logTransaction(req, 'TRANSFER_STATUS_UPDATED', 'Transfers', {
      transfer_id: transferId,
      old_status: transfer.status,
      new_status: status,
      tracking_number: transfer.tracking_number
    });

    res.json({ message: `Transfer status updated to ${status}` });
  } catch (err) {
    console.error('Update transfer status error:', err);
    res.status(500).json({ error: 'Failed to update transfer status', details: err.message });
  }
});

module.exports = router;
