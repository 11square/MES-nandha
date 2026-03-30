const { Dispatch, Order, Client } = require('../models');
const createCrudController = require('./base.controller');
const ApiResponse = require('../utils/ApiResponse');
const { getPagination, getPagingData } = require('../utils/pagination');
const { applyBusinessScope } = require('../middleware/businessScope');

const baseController = createCrudController(Dispatch, {
  resourceName: 'Dispatch',
  searchFields: ['dispatch_number', 'vehicle_number', 'driver_name', 'tracking_number'],
  defaultOrder: [['dispatch_date', 'DESC']],
});

module.exports = {
  ...baseController,

  getAll: async (req, res, next) => {
    try {
      const { Op } = require('sequelize');
      const { search, status } = req.query;
      const where = {};

      if (search) {
        where[Op.or] = [
          { dispatch_number: { [Op.like]: `%${search}%` } },
          { vehicle_number: { [Op.like]: `%${search}%` } },
          { driver_name: { [Op.like]: `%${search}%` } },
          { tracking_number: { [Op.like]: `%${search}%` } },
        ];
      }
      if (status) where.status = status;

      applyBusinessScope(req, where);

      const { page, limit, offset } = getPagination(req.query);

      const dispatches = await Dispatch.findAndCountAll({
        where,
        include: [
          { model: Order, as: 'order', attributes: ['id', 'order_number', 'status'] },
        ],
        order: [['dispatch_date', 'DESC']],
        limit,
        offset,
        distinct: true,
      });
      const { items, pagination } = getPagingData(dispatches, page, limit);

      return ApiResponse.paginated(res, items, pagination);
    } catch (error) {
      next(error);
    }
  },

  getById: async (req, res, next) => {
    try {
      const dispatch = await Dispatch.findOne({
        where: { id: req.params.id, ...applyBusinessScope(req) },
        include: [
          {
            model: Order,
            as: 'order',
            attributes: ['id', 'order_number', 'status'],
            include: [{ model: Client, as: 'client', attributes: ['id', 'name', 'phone', 'address'] }],
          },
        ],
      });

      if (!dispatch) return ApiResponse.notFound(res, 'Dispatch not found');
      return ApiResponse.success(res, dispatch);
    } catch (error) {
      next(error);
    }
  },

  // PUT /dispatch/:id/status
  updateStatus: async (req, res, next) => {
    try {
      const { status, notes } = req.body;
      const dispatch = await Dispatch.findOne({ where: { id: req.params.id, ...applyBusinessScope(req) } });

      if (!dispatch) return ApiResponse.notFound(res, 'Dispatch not found');

      await dispatch.update({
        status,
        notes: notes || dispatch.notes,
        ...(status === 'delivered' ? { delivery_date: new Date() } : {}),
      });

      return ApiResponse.success(res, dispatch, 'Dispatch status updated');
    } catch (error) {
      next(error);
    }
  },
};
