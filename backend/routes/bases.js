const express = require('express');
const router = express.Router();
const { allAsync } = require('../db');
const { authenticateUser } = require('../middleware/auth');

// Get all bases
router.get('/bases', authenticateUser, async (req, res) => {
  try {
    const bases = await allAsync('SELECT * FROM bases ORDER BY name ASC');
    res.json(bases);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch bases', details: err.message });
  }
});

// Get all equipment types
router.get('/equipment-types', authenticateUser, async (req, res) => {
  try {
    const equipment = await allAsync('SELECT * FROM equipment_types ORDER BY category, name ASC');
    res.json(equipment);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch equipment types', details: err.message });
  }
});

// Get users (for demo role switching)
router.get('/users', authenticateUser, async (req, res) => {
  try {
    const users = await allAsync(`
      SELECT u.*, b.name as base_name 
      FROM users u 
      LEFT JOIN bases b ON u.base_id = b.id 
      ORDER BY u.id ASC
    `);
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users', details: err.message });
  }
});

module.exports = router;
