const { User, Role } = require('../models');
const createCrudController = require('./base.controller');
const ApiResponse = require('../utils/ApiResponse');
const { applyBusinessScope } = require('../middleware/businessScope');
const { getPagination, getPagingData } = require('../utils/pagination');

const baseController = createCrudController(User, {
  resourceName: 'User',
  searchFields: ['name', 'username', 'email', 'phone'],
  defaultOrder: [['created_at', 'DESC']],
});

module.exports = {
  ...baseController,

  // Override getAll to exclude passwords
  getAll: async (req, res, next) => {
    try {
      const { Op } = require('sequelize');
      const { search, status, role } = req.query;
      const where = {};

      if (search) {
        where[Op.or] = [
          { name: { [Op.like]: `%${search}%` } },
          { username: { [Op.like]: `%${search}%` } },
          { email: { [Op.like]: `%${search}%` } },
        ];
      }
      if (status) where.status = status;
      if (role) {
        where.role = { [Op.eq]: role, [Op.ne]: 'SuperAdmin' };
      } else {
        where.role = { [Op.ne]: 'SuperAdmin' };
      }

      applyBusinessScope(req, where);

      const { page, limit, offset } = getPagination(req.query);

      const data = await User.findAndCountAll({
        where,
        attributes: { exclude: ['password'] },
        include: [{ model: Role, as: 'role_info', attributes: ['id', 'name', 'color'] }],
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
  },

  // GET /roles
  getRoles: async (req, res, next) => {
    try {
      const { Op } = require('sequelize');
      const where = { name: { [Op.ne]: 'superadmin' } };

      if (req.currentBusiness) {
        where[Op.or] = [
          { business_id: req.currentBusiness },
          { business_id: null },
        ];
      }

      const roles = await Role.findAll({
        where,
        order: [['name', 'ASC']],
      });
      return ApiResponse.success(res, roles);
    } catch (error) {
      next(error);
    }
  },

  // POST /roles
  createRole: async (req, res, next) => {
    try {
      const role = await Role.create({ ...req.body, business_id: req.currentBusiness });
      return ApiResponse.created(res, role, 'Role created successfully');
    } catch (error) {
      next(error);
    }
  },
};
