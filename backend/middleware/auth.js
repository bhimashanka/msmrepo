const { getAsync } = require('../db');

// Roles Definition:
// 'admin': Full access to all bases and all features
// 'base_commander': Full access to operations for their assigned base
// 'logistics_officer': Access to Purchases and Transfers only

const authenticateUser = async (req, res, next) => {
  try {
    // Standard header check or demo headers
    const roleHeader = req.headers['x-user-role'] || 'admin';
    const usernameHeader = req.headers['x-user-username'] || 'admin_gen';
    const baseIdHeader = req.headers['x-user-base-id'] ? parseInt(req.headers['x-user-base-id']) : null;

    // Fetch user from DB if possible or construct user object
    const userInDb = await getAsync('SELECT * FROM users WHERE username = ?', [usernameHeader]);

    if (userInDb) {
      req.user = {
        id: userInDb.id,
        username: userInDb.username,
        name: userInDb.name,
        role: userInDb.role,
        base_id: userInDb.base_id,
        rank: userInDb.rank,
        title: userInDb.title
      };
    } else {
      req.user = {
        id: 1,
        username: usernameHeader,
        name: 'General Arthur Vance',
        role: roleHeader,
        base_id: baseIdHeader,
        rank: 'General',
        title: 'Command Staff'
      };
    }

    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    return res.status(401).json({ error: 'Authentication failed' });
  }
};

// Middleware to enforce specific roles
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'User unauthenticated' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Access Denied: Role '${req.user.role}' is not authorized to access this resource.`,
        requiredRoles: allowedRoles,
        userRole: req.user.role
      });
    }

    next();
  };
};

// Middleware to enforce base-level data scoping for Base Commanders
const scopeBaseAccess = (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'User unauthenticated' });

  // Admin has access to all bases
  if (req.user.role === 'admin') {
    return next();
  }

  // Base Commander is restricted to their assigned base_id
  if (req.user.role === 'base_commander') {
    const userBase = req.user.base_id;

    // If query/body specifies base_id, check if it matches
    const targetBase = req.query.base_id || req.body.base_id || req.params.base_id;
    if (targetBase && parseInt(targetBase) !== parseInt(userBase)) {
      return res.status(403).json({
        error: `Access Denied: Base Commanders are restricted to their assigned base (Base ID: ${userBase}).`
      });
    }

    // Force default base_id filter to user's assigned base if not specified
    req.userScopeBaseId = userBase;
  }

  next();
};

module.exports = {
  authenticateUser,
  authorizeRoles,
  scopeBaseAccess
};
