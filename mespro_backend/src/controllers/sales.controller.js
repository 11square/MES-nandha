const { Sale, SalesTarget, SalesFollowup, User, Client } = require('../models');
const createCrudController = require('./base.controller');
const ApiResponse = require('../utils/ApiResponse');
const { getPagination, getPagingData } = require('../utils/pagination');
const { applyBusinessScope } = require('../middleware/businessScope');

const salesController = createCrudController(Sale, {
  resourceName: 'Sale',
  searchFields: ['invoice_number', 'customer_name'],
  defaultOrder: [['date', 'DESC']],
});

const targetsController = createCrudController(SalesTarget, {
  resourceName: 'Sales Target',
  defaultOrder: [['month', 'DESC']],
});

module.exports = {
  // Sales CRUD
  ...salesController,

  getAll: async (req, res, next) => {
    try {
      const { Op } = require('sequelize');
      const { search, status, startDate, endDate } = req.query;
      const { page, limit, offset } = getPagination(req.query);
      const where = {};

      if (search) {
        where[Op.or] = [
          { invoice_number: { [Op.like]: `%${search}%` } },
          { customer_name: { [Op.like]: `%${search}%` } },
        ];
      }
      if (status) where.status = status;
      if (startDate && endDate) {
        where.date = { [Op.between]: [startDate, endDate] };
      }

      applyBusinessScope(req, where);

      const data = await Sale.findAndCountAll({
        where,
        include: [
          { model: User, as: 'salesPerson', attributes: ['id', 'name', 'email'] },
        ],
        order: [['date', 'DESC']],
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

  // Targets CRUD
  getTargets: async (req, res, next) => {
    try {
      const { page, limit, offset } = getPagination(req.query);
      const data = await SalesTarget.findAndCountAll({
        where: applyBusinessScope(req),
        include: [{ model: User, as: 'salesPerson', attributes: ['id', 'name', 'email'] }],
        order: [['month', 'DESC']],
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

  createTarget: async (req, res, next) => {
    try {
      const target = await SalesTarget.create({ ...req.body, business_id: req.currentBusiness });
      return ApiResponse.created(res, target);
    } catch (error) {
      next(error);
    }
  },

  updateTarget: async (req, res, next) => {
    try {
      const target = await SalesTarget.findOne({ where: { id: req.params.id, ...applyBusinessScope(req) } });
      if (!target) return ApiResponse.notFound(res, 'Sales target not found');
      await target.update(req.body);
      return ApiResponse.success(res, target, 'Sales target updated');
    } catch (error) {
      next(error);
    }
  },

  // Followups
  getFollowups: async (req, res, next) => {
    try {
      const { page, limit, offset } = getPagination(req.query);
      const data = await SalesFollowup.findAndCountAll({
        where: applyBusinessScope(req),
        order: [['next_followup', 'ASC']],
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

  createFollowup: async (req, res, next) => {
    try {
      const followup = await SalesFollowup.create({ ...req.body, business_id: req.currentBusiness });
      return ApiResponse.created(res, followup);
    } catch (error) {
      next(error);
    }
  },

  updateFollowup: async (req, res, next) => {
    try {
      const followup = await SalesFollowup.findOne({ where: { id: req.params.id, ...applyBusinessScope(req) } });
      if (!followup) return ApiResponse.notFound(res, 'Sales followup not found');
      await followup.update(req.body);
      return ApiResponse.success(res, followup, 'Sales followup updated');
    } catch (error) {
      next(error);
    }
  },
};
