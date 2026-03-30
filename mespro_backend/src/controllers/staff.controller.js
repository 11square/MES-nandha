const { StaffMember } = require('../models');
const createCrudController = require('./base.controller');
const ApiResponse = require('../utils/ApiResponse');
const { getPagination, getPagingData } = require('../utils/pagination');
const { applyBusinessScope } = require('../middleware/businessScope');

const baseController = createCrudController(StaffMember, {
  resourceName: 'Staff Member',
  searchFields: ['name', 'employee_id', 'department', 'designation', 'phone', 'email'],
  defaultOrder: [['name', 'ASC']],
});

module.exports = {
  ...baseController,

  getAll: async (req, res, next) => {
    try {
      const { Op } = require('sequelize');
      const { search, department, status } = req.query;
      const where = {};

      if (search) {
        where[Op.or] = [
          { name: { [Op.like]: `%${search}%` } },
          { employee_id: { [Op.like]: `%${search}%` } },
          { department: { [Op.like]: `%${search}%` } },
          { designation: { [Op.like]: `%${search}%` } },
        ];
      }
      if (department) where.department = department;
      if (status) where.status = status;

      applyBusinessScope(req, where);

      const { page, limit, offset } = getPagination(req.query);

      const data = await StaffMember.findAndCountAll({
        where,
        order: [['name', 'ASC']],
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
};
