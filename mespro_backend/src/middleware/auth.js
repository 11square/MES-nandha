const jwt = require('jsonwebtoken');
const appConfig = require('../config/app');
const ApiResponse = require('../utils/ApiResponse');
const { User, Role } = require('../models');

/**
 * Map role name strings to one of the 4 normalized permission keys:
 * admin, manager, staff, viewer
 */
function normalizeRole(roleName) {
  const normalized = (roleName || '').toLowerCase().trim();
  if (['admin', 'administrator', 'businessadmin', 'business_admin'].includes(normalized)) return 'admin';
  if (['manager', 'production_manager', 'sales_manager', 'inventory_manager'].includes(normalized)) return 'manager';
  if (['viewer', 'readonly', 'read_only', 'guest'].includes(normalized)) return 'viewer';
  if (['staff', 'employee', 'worker', 'sales', 'production', 'operator'].includes(normalized)) return 'staff';
  if (normalized === 'superadmin') return 'superadmin';
  return normalized; // fallback: return as-is
}

/**
 * Authentication middleware - verifies JWT token
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return ApiResponse.unauthorized(res, 'No token provided');
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, appConfig.jwt.secret);

    const user = await User.findByPk(decoded.id, {
      attributes: { exclude: ['password'] },
      include: [{ model: Role, as: 'role_info', attributes: ['id', 'name', 'description', 'color'] }],
    });

    if (!user || user.status !== 'Active') {
      return ApiResponse.unauthorized(res, 'User not found or inactive');
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return ApiResponse.unauthorized(res, 'Invalid token');
    }
    if (error.name === 'TokenExpiredError') {
      return ApiResponse.unauthorized(res, 'Token expired');
    }
    next(error);
  }
};

/**
 * Authorization middleware - checks user role
 * Accepts normalized role names: 'admin', 'manager', 'staff', 'viewer'
 * Normalizes the user's actual role before comparing, so 'BusinessAdmin' → 'admin',
 * 'Sales' → 'staff', etc.
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return ApiResponse.unauthorized(res, 'Not authenticated');
    }

    // Normalize the user's roles from both the role field and the Role model name
    const userNormalizedRoles = [
      normalizeRole(req.user.role),
      normalizeRole(req.user.role_info?.name),
    ].filter(Boolean);

    // Also keep the raw lowercase values for backward compatibility
    const userRawRoles = [
      req.user.role?.toLowerCase(),
      req.user.role_info?.name?.toLowerCase(),
    ].filter(Boolean);

    const allUserRoles = [...new Set([...userNormalizedRoles, ...userRawRoles])];

    // SuperAdmin bypasses all authorization checks
    if (allUserRoles.includes('superadmin')) {
      return next();
    }

    const allowed = roles.some(r => allUserRoles.includes(r.toLowerCase()));

    if (!allowed) {
      return ApiResponse.forbidden(
        res,
        'You do not have permission to perform this action'
      );
    }

    next();
  };
};

module.exports = { authenticate, authorize };
