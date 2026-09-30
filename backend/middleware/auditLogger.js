const { runAsync } = require('../db');

const logTransaction = async (req, action, resource, details) => {
  try {
    const user = req.user || { id: 0, username: 'system', role: 'system', base_id: null };
    const detailsStr = typeof details === 'object' ? JSON.stringify(details) : details;

    await runAsync(
      'INSERT INTO audit_logs (user_id, username, user_role, base_id, action, resource, details) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [user.id, user.username, user.role, user.base_id || null, action, resource, detailsStr]
    );
  } catch (err) {
    console.error('Failed to record audit log:', err);
  }
};

module.exports = {
  logTransaction
};
