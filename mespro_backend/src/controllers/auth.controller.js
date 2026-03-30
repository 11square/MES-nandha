const jwt = require('jsonwebtoken');
const { User, Role, FeatureSetting, FeatureSettingValue } = require('../models');
const ApiResponse = require('../utils/ApiResponse');
const appConfig = require('../config/app');
const logger = require('../utils/logger');

const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    appConfig.jwt.secret,
    { expiresIn: appConfig.jwt.expiresIn }
  );
};

/**
 * Map role name strings to one of the 4 permission keys:
 * admin, manager, staff, viewer
 */
function mapRoleToPermissionKey(roleName) {
  const normalized = (roleName || '').toLowerCase().trim();
  if (['admin', 'administrator', 'businessadmin', 'business_admin'].includes(normalized)) return 'admin';
  if (['manager', 'production_manager', 'sales_manager', 'inventory_manager'].includes(normalized)) return 'manager';
  if (['viewer', 'readonly', 'read_only', 'guest'].includes(normalized)) return 'viewer';
  if (['staff', 'employee', 'worker', 'sales', 'production', 'operator'].includes(normalized)) return 'staff';
  return 'staff';
}

exports.login = async (req, res, next) => {
  try {
    const { email, username, password } = req.body;

    if (!password || (!email && !username)) {
      return ApiResponse.badRequest(res, 'Email/username and password are required');
    }

    const { Op } = require('sequelize');
    const whereClause = email ? { email } : { username };

    const user = await User.findOne({
      where: whereClause,
      include: [{ model: Role, as: 'role_info', attributes: ['id', 'name', 'description'] }],
    });
    if (!user) {
      return ApiResponse.unauthorized(res, 'Invalid credentials');
    }

    if (user.status !== 'Active') {
      return ApiResponse.forbidden(res, 'Account is inactive');
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return ApiResponse.unauthorized(res, 'Invalid credentials');
    }

    await user.update({ last_login: new Date() });

    const token = generateToken(user);

    // Fetch enabled modules for the user's business
    let modules = [];
    const isSuperAdmin = user.role === 'SuperAdmin';

    if (isSuperAdmin) {
      const allFeatures = await FeatureSetting.findAll({
        where: { is_active: true },
        order: [['display_order', 'ASC']],
        attributes: ['feature_key', 'feature_name', 'url'],
      });
      modules = allFeatures.map(f => ({ key: f.feature_key, label: f.feature_name, url: f.url }));
    } else if (user.business_id) {
      // Get user's role permission key
      const userRoleName = user.role_info?.name || user.role || '';
      const rolePermissionKey = mapRoleToPermissionKey(userRoleName);

      const enabledValues = await FeatureSettingValue.findAll({
        where: { business_id: user.business_id, is_enabled: true },
        include: [{
          model: FeatureSetting,
          as: 'featureSetting',
          where: { is_active: true },
          attributes: ['feature_key', 'feature_name', 'url'],
        }],
        order: [[{ model: FeatureSetting, as: 'featureSetting' }, 'display_order', 'ASC']],
      });

      modules = enabledValues
        .filter(v => {
          // If no role_permissions set, allow all (backward compat)
          if (!v.role_permissions) return true;
          return v.role_permissions[rolePermissionKey] === true;
        })
        .map(v => ({
          key: v.featureSetting.feature_key,
          label: v.featureSetting.feature_name,
          url: v.featureSetting.url,
        }));
    }

    return ApiResponse.success(res, {
      token,
      user: user.toJSON(),
      modules,
    }, 'Login successful');
  } catch (error) {
    next(error);
  }
};

exports.register = async (req, res, next) => {
  try {
    const { username, name, email, phone, password, role } = req.body;

    if (!email || !password || !name) {
      return ApiResponse.badRequest(res, 'Name, email and password are required');
    }

    const { Op } = require('sequelize');
    const existingUser = await User.findOne({
      where: {
        [Op.or]: [
          { email },
          ...(username ? [{ username }] : []),
        ],
      },
    });
    if (existingUser) {
      return ApiResponse.badRequest(res, 'User with this email or username already exists');
    }

    const user = await User.create({
      username: username || email.split('@')[0],
      name,
      email,
      phone,
      password,
      role: role || 'Sales',
    });

    const token = generateToken(user);

    return ApiResponse.created(res, {
      token,
      user: user.toJSON(),
    }, 'User registered successfully');
  } catch (error) {
    next(error);
  }
};

exports.getProfile = async (req, res, next) => {
  try {
    return ApiResponse.success(res, req.user);
  } catch (error) {
    next(error);
  }
};

exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findByPk(req.user.id);

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return ApiResponse.badRequest(res, 'Current password is incorrect');
    }

    await user.update({ password: newPassword });

    return ApiResponse.success(res, null, 'Password changed successfully');
  } catch (error) {
    next(error);
  }
};
