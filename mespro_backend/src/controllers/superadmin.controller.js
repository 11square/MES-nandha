const { Business, FeatureSetting, FeatureSettingValue, User } = require('../models');
const ApiResponse = require('../utils/ApiResponse');
const { getPagination, getPagingData } = require('../utils/pagination');
const uploadService = require('../services/upload.service');
const logger = require('../utils/logger');

// Helper: resolve a relative logo_url to a full URL using the request origin
function resolveLogoUrl(req, business) {
  if (!business || !business.logo_url) return;
  if (business.logo_url.startsWith('http://') || business.logo_url.startsWith('https://')) return;
  const protocol = req.protocol;
  const host = req.get('host');
  business.logo_url = `${protocol}://${host}${business.logo_url}`;
}

function resolveLogosInList(req, items) {
  if (!Array.isArray(items)) return items;
  items.forEach((item) => {
    if (item.dataValues) {
      if (item.dataValues.logo_url && !item.dataValues.logo_url.startsWith('http')) {
        const protocol = req.protocol;
        const host = req.get('host');
        item.dataValues.logo_url = `${protocol}://${host}${item.dataValues.logo_url}`;
      }
    }
  });
  return items;
}

// ─── Business CRUD ──────────────────────────────────────────────────────────

exports.getBusinesses = async (req, res, next) => {
  try {
    const { page, limit, offset } = getPagination(req.query);
    const { search, status } = req.query;

    const where = {};
    if (search) {
      const { Op } = require('sequelize');
      where.name = { [Op.like]: `%${search}%` };
    }
    if (status) where.status = status;

    const data = await Business.findAndCountAll({
      where,
      include: [
        { model: User, as: 'businessUsers', attributes: ['id', 'name', 'email', 'status'] },
        {
          model: FeatureSettingValue, as: 'featureValues',
          include: [{ model: FeatureSetting, as: 'featureSetting' }],
        },
      ],
      order: [['created_at', 'DESC']],
      limit,
      offset,
      distinct: true,
    });

    const { items, pagination } = getPagingData(data, page, limit);
    resolveLogosInList(req, items);
    return ApiResponse.paginated(res, items, pagination);
  } catch (error) {
    next(error);
  }
};

exports.getBusinessById = async (req, res, next) => {
  try {
    const business = await Business.findByPk(req.params.id, {
      include: [
        { model: User, as: 'businessUsers', attributes: { exclude: ['password'] } },
        {
          model: FeatureSettingValue, as: 'featureValues',
          include: [{ model: FeatureSetting, as: 'featureSetting' }],
        },
      ],
    });

    if (!business) return ApiResponse.notFound(res, 'Business not found');
    if (business.dataValues && business.dataValues.logo_url && !business.dataValues.logo_url.startsWith('http')) {
      const protocol = req.protocol;
      const host = req.get('host');
      business.dataValues.logo_url = `${protocol}://${host}${business.dataValues.logo_url}`;
    }
    return ApiResponse.success(res, business);
  } catch (error) {
    next(error);
  }
};

exports.createBusiness = async (req, res, next) => {
  try {
    const { name, status } = req.body;
    if (!name) return ApiResponse.badRequest(res, 'Business name is required');

    let logoData = {};
    if (req.file) {
      const result = await uploadService.uploadFile(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype,
        'business-logos'
      );
      logoData = {
        logo_url: result.storageType === 's3' ? result.s3Url : `/uploads/${result.localPath}`,
        logo_storage_type: result.storageType,
        logo_s3_key: result.s3Key,
        logo_local_path: result.localPath,
      };
    }

    const business = await Business.create({ name, status: status || 'Active', ...logoData });
    if (business.dataValues && business.dataValues.logo_url && !business.dataValues.logo_url.startsWith('http')) {
      const protocol = req.protocol;
      const host = req.get('host');
      business.dataValues.logo_url = `${protocol}://${host}${business.dataValues.logo_url}`;
    }
    return ApiResponse.created(res, business, 'Business created successfully');
  } catch (error) {
    next(error);
  }
};

exports.updateBusiness = async (req, res, next) => {
  try {
    const business = await Business.findByPk(req.params.id);
    if (!business) return ApiResponse.notFound(res, 'Business not found');

    const { name, status } = req.body;
    const updateData = {};
    if (name) updateData.name = name;
    if (status) updateData.status = status;

    if (req.file) {
      if (business.logo_storage_type) {
        try {
          await uploadService.deleteFile({
            storage_type: business.logo_storage_type,
            s3_bucket: process.env.AWS_S3_BUCKET,
            s3_key: business.logo_s3_key,
            local_path: business.logo_local_path,
          });
        } catch (e) {
          logger.warn('Failed to delete old logo', e);
        }
      }

      const result = await uploadService.uploadFile(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype,
        'business-logos'
      );
      updateData.logo_url = result.storageType === 's3' ? result.s3Url : `/uploads/${result.localPath}`;
      updateData.logo_storage_type = result.storageType;
      updateData.logo_s3_key = result.s3Key;
      updateData.logo_local_path = result.localPath;
    }

    await business.update(updateData);
    await business.reload({
      include: [
        { model: FeatureSettingValue, as: 'featureValues', include: [{ model: FeatureSetting, as: 'featureSetting' }] },
      ],
    });

    if (business.dataValues && business.dataValues.logo_url && !business.dataValues.logo_url.startsWith('http')) {
      const protocol = req.protocol;
      const host = req.get('host');
      business.dataValues.logo_url = `${protocol}://${host}${business.dataValues.logo_url}`;
    }

    return ApiResponse.success(res, business, 'Business updated successfully');
  } catch (error) {
    next(error);
  }
};

exports.deleteBusiness = async (req, res, next) => {
  try {
    const business = await Business.findByPk(req.params.id);
    if (!business) return ApiResponse.notFound(res, 'Business not found');

    if (business.logo_storage_type) {
      try {
        await uploadService.deleteFile({
          storage_type: business.logo_storage_type,
          s3_bucket: process.env.AWS_S3_BUCKET,
          s3_key: business.logo_s3_key,
          local_path: business.logo_local_path,
        });
      } catch (e) {
        logger.warn('Failed to delete business logo', e);
      }
    }

    await business.destroy();
    return ApiResponse.success(res, null, 'Business deleted successfully');
  } catch (error) {
    next(error);
  }
};

// ─── Feature Settings ────────────────────────────────────────────────────────

exports.getFeatureSettings = async (req, res, next) => {
  try {
    const features = await FeatureSetting.findAll({
      where: { is_active: true },
      order: [['display_order', 'ASC']],
    });
    return ApiResponse.success(res, features);
  } catch (error) {
    next(error);
  }
};

// ─── Feature Setting Values (Business Module Toggle) ─────────────────────────

exports.getBusinessFeatures = async (req, res, next) => {
  try {
    const { businessId } = req.params;
    const values = await FeatureSettingValue.findAll({
      where: { business_id: businessId },
      include: [{ model: FeatureSetting, as: 'featureSetting' }],
    });
    return ApiResponse.success(res, values);
  } catch (error) {
    next(error);
  }
};

exports.saveBusinessFeatures = async (req, res, next) => {
  try {
    const { businessId } = req.params;
    const { features } = req.body;
    // features: Array of { feature_setting_id, is_enabled, role_permissions? }
    // role_permissions: { admin: bool, manager: bool, staff: bool, viewer: bool }

    if (!Array.isArray(features)) {
      return ApiResponse.badRequest(res, 'features must be an array of { feature_setting_id, is_enabled, role_permissions? }');
    }

    const business = await Business.findByPk(businessId);
    if (!business) return ApiResponse.notFound(res, 'Business not found');

    // Default role permissions when a module is enabled
    const defaultRolePermissions = { admin: true, manager: true, staff: true, viewer: true };

    const results = [];
    for (const feat of features) {
      const [record] = await FeatureSettingValue.findOrCreate({
        where: { business_id: businessId, feature_setting_id: feat.feature_setting_id },
        defaults: {
          is_enabled: feat.is_enabled,
          role_permissions: feat.role_permissions || (feat.is_enabled ? defaultRolePermissions : null),
        },
      });

      const updateData = {};
      if (record.is_enabled !== feat.is_enabled) {
        updateData.is_enabled = feat.is_enabled;
      }
      // Always update role_permissions if provided
      if (feat.role_permissions !== undefined) {
        updateData.role_permissions = feat.role_permissions;
      } else if (feat.is_enabled && !record.role_permissions) {
        // If enabling and no role_permissions set yet, use defaults
        updateData.role_permissions = defaultRolePermissions;
      } else if (!feat.is_enabled) {
        updateData.role_permissions = null;
      }

      if (Object.keys(updateData).length > 0) {
        await record.update(updateData);
      }
      results.push(record);
    }

    // Reload full list
    const allValues = await FeatureSettingValue.findAll({
      where: { business_id: businessId },
      include: [{ model: FeatureSetting, as: 'featureSetting' }],
    });

    return ApiResponse.success(res, allValues, 'Business features updated successfully');
  } catch (error) {
    next(error);
  }
};

// ─── Business Users CRUD ─────────────────────────────────────────────────────

exports.getBusinessUsers = async (req, res, next) => {
  try {
    const { page, limit, offset } = getPagination(req.query);
    const { search, business_id } = req.query;

    const { Op } = require('sequelize');
    const where = { role: { [Op.ne]: 'SuperAdmin' } };
    if (business_id) where.business_id = business_id;
    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
      ];
    }

    const data = await User.findAndCountAll({
      where,
      include: [{ model: Business, as: 'business', attributes: ['id', 'name'] }],
      attributes: { exclude: ['password'] },
      order: [['created_at', 'DESC']],
      limit,
      offset,
      distinct: true,
    });

    const { items, pagination } = getPagingData(data, page, limit);
    return ApiResponse.paginated(res, items, pagination);
  } catch (error) {
    next(error);
  }
};

exports.getBusinessUserById = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id, {
      include: [{ model: Business, as: 'business', attributes: ['id', 'name'] }],
      attributes: { exclude: ['password'] },
    });
    if (!user) return ApiResponse.notFound(res, 'Business user not found');
    return ApiResponse.success(res, user);
  } catch (error) {
    next(error);
  }
};

exports.createBusinessUser = async (req, res, next) => {
  try {
    const { business_id, name, email, phone, password, role } = req.body;

    if (!business_id || !name || !email || !password) {
      return ApiResponse.badRequest(res, 'business_id, name, email and password are required');
    }

    const business = await Business.findByPk(business_id);
    if (!business) return ApiResponse.notFound(res, 'Business not found');

    const existing = await User.findOne({ where: { email } });
    if (existing) return ApiResponse.badRequest(res, 'A user with this email already exists');

    const user = await User.create({
      username: email.split('@')[0] + '_' + Date.now(),
      business_id,
      name,
      email,
      phone,
      password,
      role: role || 'BusinessAdmin',
    });

    return ApiResponse.created(res, user.toJSON(), 'Business user created successfully');
  } catch (error) {
    next(error);
  }
};

exports.updateBusinessUser = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return ApiResponse.notFound(res, 'Business user not found');

    const { name, email, phone, password, status, role, business_id } = req.body;
    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (password) updateData.password = password;
    if (status) updateData.status = status;
    if (role) updateData.role = role;
    if (business_id) updateData.business_id = business_id;

    await user.update(updateData);
    await user.reload({
      include: [{ model: Business, as: 'business', attributes: ['id', 'name'] }],
    });

    return ApiResponse.success(res, user.toJSON(), 'Business user updated successfully');
  } catch (error) {
    next(error);
  }
};

exports.deleteBusinessUser = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return ApiResponse.notFound(res, 'Business user not found');

    await user.destroy();
    return ApiResponse.success(res, null, 'Business user deleted successfully');
  } catch (error) {
    next(error);
  }
};
