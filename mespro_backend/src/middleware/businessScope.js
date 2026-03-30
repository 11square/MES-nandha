const ApiResponse = require('../utils/ApiResponse');

/**
 * Business scoping middleware — equivalent to Rails' current_business.
 *
 * Sets req.currentBusiness (the business_id of the logged-in user).
 * SuperAdmin users bypass scoping (req.currentBusiness = null).
 *
 * Usage: place AFTER authenticate middleware on all non-superadmin routes.
 */
const setCurrentBusiness = (req, res, next) => {
  if (!req.user) {
    return ApiResponse.unauthorized(res, 'Not authenticated');
  }

  // SuperAdmin is not scoped to any business
  const isSuperAdmin =
    req.user.role === 'SuperAdmin' ||
    req.user.role_info?.name === 'superadmin';

  if (isSuperAdmin) {
    req.currentBusiness = null;
    return next();
  }

  if (!req.user.business_id) {
    return ApiResponse.forbidden(
      res,
      'User is not assigned to any business. Contact your administrator.'
    );
  }

  req.currentBusiness = req.user.business_id;
  next();
};

/**
 * Helper to inject business_id into a Sequelize where clause.
 * Use in controllers: where = applyBusinessScope(req, where);
 */
const applyBusinessScope = (req, where = {}) => {
  if (req.currentBusiness) {
    where.business_id = req.currentBusiness;
  }
  return where;
};

module.exports = { setCurrentBusiness, applyBusinessScope };
