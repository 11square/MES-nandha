const { Client, ClientFollowup, CreditOutstanding, Order, Bill, BillItem, Payment, Transaction, Dispatch } = require('../models');
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
      const { Op } = require('sequelize');
      const { page, limit, offset } = getPagination(req.query);
      // Look up client name to also match by customer field
      const client = await Client.findByPk(req.params.id, { attributes: ['id', 'name'] });
      const clientName = client ? client.name : '';
      const orConditions = [{ client_id: req.params.id }];
      if (clientName) orConditions.push({ customer: clientName });
      const data = await Order.findAndCountAll({
        where: applyBusinessScope(req, { [Op.or]: orConditions }),
        attributes: ['id', 'order_number', 'product', 'quantity', 'total_amount', 'grand_total', 'status', 'payment_status', 'created_at'],
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

  // GET /clients/outstandings or /clients/:id/outstandings
  getOutstandings: async (req, res, next) => {
    try {
      const { page, limit, offset } = getPagination(req.query);
      const where = applyBusinessScope(req);
      if (req.params.id) where.client_id = req.params.id;
      const data = await CreditOutstanding.findAndCountAll({
        where,
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

  // GET /clients/followups or /clients/:id/followups
  getFollowups: async (req, res, next) => {
    try {
      const { page, limit, offset } = getPagination(req.query);
      const where = applyBusinessScope(req);
      if (req.params.id) where.client_id = req.params.id;
      const data = await ClientFollowup.findAndCountAll({
        where,
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
        include: [{ model: BillItem, as: 'items' }],
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

  // GET /clients/:id/dispatches
  getClientDispatches: async (req, res, next) => {
    try {
      const { Op } = require('sequelize');
      const { page, limit, offset } = getPagination(req.query);
      const client = await Client.findByPk(req.params.id, { attributes: ['id', 'name'] });
      const clientName = client ? client.name : '';
      const orConditions = [];
      if (clientName) orConditions.push({ customer: clientName });
      // Also match dispatches linked to orders that belong to this client
      const data = await Dispatch.findAndCountAll({
        where: applyBusinessScope(req, orConditions.length > 0 ? { [Op.or]: orConditions } : { customer: '' }),
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

  // GET /clients/:id/transactions
  getClientTransactions: async (req, res, next) => {
    try {
      const { Op } = require('sequelize');
      const { page, limit, offset } = getPagination(req.query);
      const client = await Client.findByPk(req.params.id, { attributes: ['id', 'name'] });
      const clientName = client ? client.name : '';
      const orConditions = [{ client_id: req.params.id }];
      if (clientName) orConditions.push({ client_name: clientName });
      const data = await Transaction.findAndCountAll({
        where: applyBusinessScope(req, { [Op.or]: orConditions }),
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
};
