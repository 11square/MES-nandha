const { Dispatch, Order, Client } = require('../models');
const createCrudController = require('./base.controller');
const ApiResponse = require('../utils/ApiResponse');
const { getPagination, getPagingData } = require('../utils/pagination');
const { applyBusinessScope } = require('../middleware/businessScope');

const baseController = createCrudController(Dispatch, {
  resourceName: 'Dispatch',
  searchFields: ['customer', 'lr_number', 'driver_name', 'vehicle_no'],
  defaultOrder: [['dispatch_date', 'DESC']],
});

module.exports = {
  ...baseController,

  // Normalize date-like fields to null when empty or invalid
  _sanitizeDates: (body) => {
    const dateFields = ['dispatch_date', 'expected_delivery', 'delivered_date'];
    for (const f of dateFields) {
      if (f in body) {
        const v = body[f];
        if (v === '' || v === undefined || v === null || v === 'Invalid date') {
          body[f] = null;
          continue;
        }
        const d = new Date(v);
        if (isNaN(d.getTime())) {
          body[f] = null;
        }
      }
    }
    return body;
  },

  // POST /dispatch — override create with validation + file upload
  create: async (req, res, next) => {
    try {
      module.exports._sanitizeDates(req.body);
      const { customer, product, lr_number, transporter, dispatch_date } = req.body;
      const missing = [];
      if (!customer) missing.push('customer');
      if (!product) missing.push('product');
      // lr_number is optional if LR image is uploaded
      if (!lr_number && !req.file) missing.push('lr_number or lr_image');
      if (!transporter) missing.push('transporter');
      if (!dispatch_date) missing.push('dispatch_date');
      if (missing.length) {
        return ApiResponse.error(res, `Missing required fields: ${missing.join(', ')}`, 400);
      }
      req.body.dispatch_type = 'stock';
      if (req.currentBusiness) req.body.business_id = req.currentBusiness;
      if (req.file) {
        req.body.lr_image = `/uploads/dispatch/${req.file.filename}`;
      }
      const record = await Dispatch.create(req.body);
      return ApiResponse.created(res, record, 'Dispatch created successfully');
    } catch (error) {
      next(error);
    }
  },

  // PUT /dispatch/:id — override update with file upload
  update: async (req, res, next) => {
    try {
      module.exports._sanitizeDates(req.body);
      const where = { id: req.params.id };
      applyBusinessScope(req, where);
      const record = await Dispatch.findOne({ where });
      if (!record) return ApiResponse.notFound(res, 'Dispatch not found');

      if (req.file) {
        req.body.lr_image = `/uploads/dispatch/${req.file.filename}`;
      } else if (req.body.lr_image === '') {
        req.body.lr_image = null;
      }
      req.body.dispatch_type = 'stock';
      await record.update(req.body);
      await record.reload();
      return ApiResponse.success(res, record, 'Dispatch updated successfully');
    } catch (error) {
      next(error);
    }
  },

  getAll: async (req, res, next) => {
    try {
      const { Op } = require('sequelize');
      const { search, status } = req.query;
      const where = {};

      if (search) {
        where[Op.or] = [
          { customer: { [Op.like]: `%${search}%` } },
          { lr_number: { [Op.like]: `%${search}%` } },
          { driver_name: { [Op.like]: `%${search}%` } },
          { vehicle_no: { [Op.like]: `%${search}%` } },
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
        ...(status === 'Delivered' ? { delivered_date: new Date() } : {}),
      });

      return ApiResponse.success(res, dispatch, 'Dispatch status updated');
    } catch (error) {
      next(error);
    }
  },
};
