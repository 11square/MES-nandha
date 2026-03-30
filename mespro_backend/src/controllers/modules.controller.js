const { FeatureSetting, FeatureSettingValue, Role } = require('../models');
const ApiResponse = require('../utils/ApiResponse');

/**
 * GET /auth/modules
 * Returns the list of enabled modules for the authenticated user's business,
 * filtered by the user's role permissions.
 * Each module includes: key, label, url.
 * SuperAdmin gets all active modules.
 */
exports.getModules = async (req, res, next) => {
  try {
    const isSuperAdmin =
      req.user.role === 'SuperAdmin' ||
      req.user.role_info?.name === 'superadmin';

    const businessId = req.user.business_id;

    // If not superadmin and no business, return empty
    if (!isSuperAdmin && !businessId) {
      return ApiResponse.success(res, { modules: [] }, 'No business assigned');
    }

    if (isSuperAdmin) {
      // SuperAdmin gets every active module
      const allFeatures = await FeatureSetting.findAll({
        where: { is_active: true },
        order: [['display_order', 'ASC']],
        attributes: ['feature_key', 'feature_name', 'url'],
      });

      const modules = allFeatures.map((f) => ({
        key: f.feature_key,
        label: f.feature_name,
        url: f.url,
      }));

      return ApiResponse.success(res, { modules }, 'Modules retrieved');
    }

    // Determine user's role name for permission checking
    // Check role_info (from association), role_id lookup, or direct role field
    let userRoleName = '';
    if (req.user.role_info?.name) {
      userRoleName = req.user.role_info.name.toLowerCase();
    } else if (req.user.role) {
      userRoleName = req.user.role.toLowerCase();
    }

    // Map various role names to our 4 permission keys
    const rolePermissionKey = mapRoleToPermissionKey(userRoleName);

    // Regular user — only modules enabled for their business AND their role
    const enabledValues = await FeatureSettingValue.findAll({
      where: { business_id: businessId, is_enabled: true },
      include: [
        {
          model: FeatureSetting,
          as: 'featureSetting',
          where: { is_active: true },
          attributes: ['feature_key', 'feature_name', 'url'],
        },
      ],
      order: [[{ model: FeatureSetting, as: 'featureSetting' }, 'display_order', 'ASC']],
    });

    const modules = enabledValues
      .filter((v) => {
        // If no role_permissions set, allow all roles (backward compatibility)
        if (!v.role_permissions) return true;
        // Check if this user's role has permission
        return v.role_permissions[rolePermissionKey] === true;
      })
      .map((v) => ({
        key: v.featureSetting.feature_key,
        label: v.featureSetting.feature_name,
        url: v.featureSetting.url,
      }));

    return ApiResponse.success(res, { modules }, 'Modules retrieved');
  } catch (error) {
    next(error);
  }
};

/**
 * Map role name strings to one of the 4 permission keys:
 * admin, manager, staff, viewer
 */
function mapRoleToPermissionKey(roleName) {
  const normalized = (roleName || '').toLowerCase().trim();

  // Admin variants
  if (['admin', 'administrator', 'businessadmin', 'business_admin'].includes(normalized)) {
    return 'admin';
  }
  // Manager variants
  if (['manager', 'production_manager', 'sales_manager', 'inventory_manager'].includes(normalized)) {
    return 'manager';
  }
  // Viewer variants
  if (['viewer', 'readonly', 'read_only', 'guest'].includes(normalized)) {
    return 'viewer';
  }
  // Staff / default
  if (['staff', 'employee', 'worker', 'sales', 'production', 'operator'].includes(normalized)) {
    return 'staff';
  }

  // Default: treat as staff if unknown
  return 'staff';
}
