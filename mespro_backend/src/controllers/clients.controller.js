const { Client, ClientFollowup, CreditOutstanding, Order, Bill, Payment } = require('../models');
const createCrudController = require('./base.controller');
const ApiResponse = require('../utils/ApiResponse');
const { applyBusinessScope } = require('../middleware/businessScope');
const { getPagination, getPagingData } = require('../utils/pagination');

const baseController = createCrudController(Client, {
  resourceName: 'Client',
  searchFields: ['name', 'contact_person', 'email', 'phone'],
  defaultOrder: [['created_at', 'DESC']],
});

module.exports = {
  ...baseController,

  // GET /clients/:id/payments
  getClientPayments: async (req, res, next) => {
    try {
      const { page, limit, offset } = getPagination(req.query);
      const data = await Payment.findAndCountAll({
        where: applyBusinessScope(req),
        include: [{
          model: Bill,
          as: 'bill',
          where: { client_id: req.params.id },
          attributes: ['bill_no', 'grand_total'],
        }],
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

  // GET /clients/:id/sales
  getClientSales: async (req, res, next) => {
    try {
      const { page, limit, offset } = getPagination(req.query);
      const data = await Order.findAndCountAll({
        where: applyBusinessScope(req, { client_id: req.params.id }),
        attributes: ['id', 'order_number', 'product', 'quantity', 'total_amount', 'status', 'payment_status', 'created_at'],
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

  // GET /clients/outstandings
  getOutstandings: async (req, res, next) => {
    try {
      const { page, limit, offset } = getPagination(req.query);
      const data = await CreditOutstanding.findAndCountAll({
        where: applyBusinessScope(req),
        include: [{ model: Client, as: 'client', attributes: ['id', 'name'] }],
        order: [['days_overdue', 'DESC']],
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

  // GET /clients/followups
  getFollowups: async (req, res, next) => {
    try {
      const { page, limit, offset } = getPagination(req.query);
      const data = await ClientFollowup.findAndCountAll({
        where: applyBusinessScope(req),
        include: [{ model: Client, as: 'client', attributes: ['id', 'name'] }],
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

  // GET /clients/:id/bills
  getClientBills: async (req, res, next) => {
    try {
      const { page, limit, offset } = getPagination(req.query);
      const data = await Bill.findAndCountAll({
        where: applyBusinessScope(req, { client_id: req.params.id }),
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

  // POST /clients/:id/followups
  createFollowup: async (req, res, next) => {
    try {
      const followup = await ClientFollowup.create({
        ...req.body,
        client_id: req.params.id,
        business_id: req.currentBusiness,
      });
      return ApiResponse.created(res, followup);
    } catch (error) {
      next(error);
    }
  },
};
