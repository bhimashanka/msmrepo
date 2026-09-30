const express = require('express');
const router = express.Router();
const { allAsync, runAsync, getAsync } = require('../db');
const { authenticateUser, authorizeRoles, scopeBaseAccess } = require('../middleware/auth');
const { logTransaction } = require('../middleware/auditLogger');

// ----------------------------------------------------
// ASSIGNMENTS ENDPOINTS
// Restricted: 'admin', 'base_commander' ONLY
// ----------------------------------------------------

// GET /api/assignments - View assigned assets
router.get('/', authenticateUser, scopeBaseAccess, authorizeRoles('admin', 'base_commander'), async (req, res) => {
  try {
    const { base_id, equipment_id, status, start_date, end_date } = req.query;
    const effectiveBaseId = req.user.role === 'base_commander' ? req.user.base_id : base_id;

    let where = [];
    let params = [];

    if (effectiveBaseId && effectiveBaseId !== 'all') {
      where.push('a.base_id = ?');
      params.push(effectiveBaseId);
    }
    if (equipment_id && equipment_id !== 'all') {
      where.push('a.equipment_id = ?');
      params.push(equipment_id);
    }
    if (status && status !== 'all') {
      where.push('a.status = ?');
      params.push(status);
    }
    if (start_date) {
      where.push('a.assignment_date >= ?');
      params.push(start_date);
    }
    if (end_date) {
      where.push('a.assignment_date <= ?');
      params.push(end_date);
    }

    const assignments = await allAsync(`
      SELECT a.*, 
             b.name as base_name, b.code as base_code,
             e.name as equipment_name, e.category as equipment_category, e.unit_of_measure
      FROM assignments a
      JOIN bases b ON a.base_id = b.id
      JOIN equipment_types e ON a.equipment_id = e.id
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
      ORDER BY a.assignment_date DESC, a.id DESC
    `, params);

    res.json(assignments);
  } catch (err) {
    console.error('Fetch assignments error:', err);
    res.status(500).json({ error: 'Failed to fetch asset assignments', details: err.message });
  }
});

// POST /api/assignments - Assign asset to personnel
router.post('/', authenticateUser, authorizeRoles('admin', 'base_commander'), async (req, res) => {
  try {
    const { base_id, equipment_id, quantity, personnel_name, personnel_rank, service_id, unit, assignment_date, expected_return_date, notes } = req.body;

    if (req.user.role === 'base_commander' && parseInt(base_id) !== parseInt(req.user.base_id)) {
      return res.status(403).json({ error: 'Base Commanders can only assign assets within their assigned base.' });
    }

    if (!base_id || !equipment_id || !quantity || quantity <= 0 || !personnel_name || !personnel_rank || !service_id || !unit || !assignment_date) {
      return res.status(400).json({ error: 'Base, equipment, valid quantity, personnel details, and assignment date are required.' });
    }

    // Check available stock
    const stockRow = await getAsync('SELECT current_stock FROM inventory WHERE base_id = ? AND equipment_id = ?', [base_id, equipment_id]);
    const availableStock = stockRow ? stockRow.current_stock : 0;

    if (availableStock < quantity) {
      return res.status(400).json({ error: `Insufficient stock at base. Available: ${availableStock}, Requested: ${quantity}` });
    }

    // Create assignment
    const result = await runAsync(`
      INSERT INTO assignments (base_id, equipment_id, quantity, personnel_name, personnel_rank, service_id, unit, assignment_date, expected_return_date, status, notes, assigned_by_user)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active', ?, ?)
    `, [base_id, equipment_id, quantity, personnel_name, personnel_rank, service_id, unit, assignment_date, expected_return_date || null, notes || '', req.user.username]);

    // Note: Stock remains in inventory list but is flagged as assigned in dashboard metrics

    // Audit Log
    await logTransaction(req, 'ASSET_ASSIGNED', 'Assignments', {
      assignment_id: result.lastID,
      base_id,
      equipment_id,
      quantity,
      personnel_name,
      service_id
    });

    res.status(201).json({
      message: 'Asset successfully assigned to personnel',
      assignmentId: result.lastID
    });
  } catch (err) {
    console.error('Create assignment error:', err);
    res.status(500).json({ error: 'Failed to create assignment', details: err.message });
  }
});

// PATCH /api/assignments/:id/return - Return assigned asset
router.patch('/:id/return', authenticateUser, authorizeRoles('admin', 'base_commander'), async (req, res) => {
  try {
    const assignmentId = req.params.id;
    const assignment = await getAsync('SELECT * FROM assignments WHERE id = ?', [assignmentId]);

    if (!assignment) return res.status(404).json({ error: 'Assignment record not found.' });
    if (assignment.status === 'Returned') return res.status(400).json({ error: 'Asset has already been returned.' });

    await runAsync("UPDATE assignments SET status = 'Returned' WHERE id = ?", [assignmentId]);

    await logTransaction(req, 'ASSET_RETURNED', 'Assignments', {
      assignment_id: assignmentId,
      personnel_name: assignment.personnel_name,
      equipment_id: assignment.equipment_id,
      quantity: assignment.quantity
    });

    res.json({ message: 'Asset successfully returned to armory' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to process asset return', details: err.message });
  }
});

// ----------------------------------------------------
// EXPENDITURES ENDPOINTS
// Restricted: 'admin', 'base_commander' ONLY
// ----------------------------------------------------

// GET /api/expenditures - View expended assets
router.get('/expenditures', authenticateUser, scopeBaseAccess, authorizeRoles('admin', 'base_commander'), async (req, res) => {
  try {
    const { base_id, equipment_id, start_date, end_date } = req.query;
    const effectiveBaseId = req.user.role === 'base_commander' ? req.user.base_id : base_id;

    let where = [];
    let params = [];

    if (effectiveBaseId && effectiveBaseId !== 'all') {
      where.push('ex.base_id = ?');
      params.push(effectiveBaseId);
    }
    if (equipment_id && equipment_id !== 'all') {
      where.push('ex.equipment_id = ?');
      params.push(equipment_id);
    }
    if (start_date) {
      where.push('ex.expenditure_date >= ?');
      params.push(start_date);
    }
    if (end_date) {
      where.push('ex.expenditure_date <= ?');
      params.push(end_date);
    }

    const expenditures = await allAsync(`
      SELECT ex.*, 
             b.name as base_name, b.code as base_code,
             e.name as equipment_name, e.category as equipment_category, e.unit_of_measure
      FROM expenditures ex
      JOIN bases b ON ex.base_id = b.id
      JOIN equipment_types e ON ex.equipment_id = e.id
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
      ORDER BY ex.expenditure_date DESC, ex.id DESC
    `, params);

    res.json(expenditures);
  } catch (err) {
    console.error('Fetch expenditures error:', err);
    res.status(500).json({ error: 'Failed to fetch expenditures', details: err.message });
  }
});

// POST /api/expenditures - Record asset expenditure/consumption
router.post('/expenditures', authenticateUser, authorizeRoles('admin', 'base_commander'), async (req, res) => {
  try {
    const { base_id, equipment_id, quantity, expenditure_date, reason, operation_name } = req.body;

    if (req.user.role === 'base_commander' && parseInt(base_id) !== parseInt(req.user.base_id)) {
      return res.status(403).json({ error: 'Base Commanders can only record expenditures for their assigned base.' });
    }

    if (!base_id || !equipment_id || !quantity || quantity <= 0 || !expenditure_date || !reason || !operation_name) {
      return res.status(400).json({ error: 'All expenditure details (base, equipment, qty > 0, date, reason, operation) are required.' });
    }

    // Check available stock
    const stockRow = await getAsync('SELECT current_stock FROM inventory WHERE base_id = ? AND equipment_id = ?', [base_id, equipment_id]);
    const availableStock = stockRow ? stockRow.current_stock : 0;

    if (availableStock < quantity) {
      return res.status(400).json({ error: `Cannot expend quantity greater than current stock. Available: ${availableStock}` });
    }

    // Create expenditure
    const result = await runAsync(`
      INSERT INTO expenditures (base_id, equipment_id, quantity, expenditure_date, reason, operation_name, authorized_by_user)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [base_id, equipment_id, quantity, expenditure_date, reason, operation_name, req.user.username]);

    // Deduct stock from inventory
    await runAsync('UPDATE inventory SET current_stock = current_stock - ? WHERE base_id = ? AND equipment_id = ?', [quantity, base_id, equipment_id]);

    // Audit log
    await logTransaction(req, 'ASSET_EXPENDED', 'Expenditures', {
      expenditure_id: result.lastID,
      base_id,
      equipment_id,
      quantity,
      reason,
      operation_name
    });

    res.status(201).json({
      message: 'Asset expenditure recorded successfully and stock updated.',
      expenditureId: result.lastID
    });
  } catch (err) {
    console.error('Record expenditure error:', err);
    res.status(500).json({ error: 'Failed to record asset expenditure', details: err.message });
  }
});

module.exports = router;
