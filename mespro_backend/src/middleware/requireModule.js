const { FeatureSetting, FeatureSettingValue } = require('../models');
const ApiResponse = require('../utils/ApiResponse');

/**
 * Middleware factory — checks that the given module key is enabled
 * for the current user's business.
 *
 * SuperAdmin users bypass this check.
 * Users without a business_id are denied.
 *
 * Returns 404 (not 403) so that disabled modules appear non-existent.
 *
 * Usage:
 *   router.use('/leads', authenticate, requireModule('leads'), leadsRoutes);
 */
const requireModule = (moduleKey) => {
  return async (req, res, next) => {
    try {
      // SuperAdmin bypasses module checks
      const isSuperAdmin =
        req.user?.role === 'SuperAdmin' ||
        req.user?.role_info?.name === 'superadmin';

      if (isSuperAdmin) return next();

      const businessId = req.user?.business_id;
      if (!businessId) {
        return ApiResponse.notFound(res, 'Not found');
      }

      // Find the feature by key
      const feature = await FeatureSetting.findOne({
        where: { feature_key: moduleKey, is_active: true },
        attributes: ['id'],
      });

      if (!feature) {
        return ApiResponse.notFound(res, 'Not found');
      }

      // Check if enabled for this business
      const featureValue = await FeatureSettingValue.findOne({
        where: {
          business_id: businessId,
          feature_setting_id: feature.id,
          is_enabled: true,
        },
      });

      if (!featureValue) {
        return ApiResponse.notFound(res, 'Not found');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = { requireModule };
