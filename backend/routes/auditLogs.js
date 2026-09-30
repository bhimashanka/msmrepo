const express = require('express');
const router = express.Router();
const { allAsync } = require('../db');
const { authenticateUser, authorizeRoles } = require('../middleware/auth');

// GET /api/audit-logs - View audit trail
router.get('/', authenticateUser, authorizeRoles('admin', 'base_commander'), async (req, res) => {
  try {
    const { action, username, limit } = req.query;

    let where = [];
    let params = [];

    // Base commander sees logs for their base or actions done by them
    if (req.user.role === 'base_commander') {
      where.push('(base_id = ? OR username = ?)');
      params.push(req.user.base_id, req.user.username);
    }

    if (action && action !== 'all') {
      where.push('action = ?');
      params.push(action);
    }

    if (username) {
      where.push('username LIKE ?');
      params.push(`%${username}%`);
    }

    const logLimit = limit ? parseInt(limit) : 100;

    const logs = await allAsync(`
      SELECT a.*, b.name as base_name 
      FROM audit_logs a
      LEFT JOIN bases b ON a.base_id = b.id
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
      ORDER BY a.id DESC
      LIMIT ?
    `, [...params, logLimit]);

    res.json(logs);
  } catch (err) {
    console.error('Fetch audit logs error:', err);
    res.status(500).json({ error: 'Failed to fetch audit logs', details: err.message });
  }
});

module.exports = router;
