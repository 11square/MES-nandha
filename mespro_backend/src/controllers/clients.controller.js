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

  // GET /clients — overrides base getAll to enrich each client with billing totals.
  getAll: async (req, res, next) => {
    try {
      const { Op, fn, col } = require('sequelize');
      const { page, limit, offset } = getPagination(req.query);
      const { search, status, sort, order: sortOrder } = req.query;

      const where = applyBusinessScope(req, {});
      if (search) {
        where[Op.or] = ['name', 'contact_person', 'email', 'phone'].map((f) => ({ [f]: { [Op.like]: `%${search}%` } }));
      }
      if (status) where.status = status;

      const data = await Client.findAndCountAll({
        where,
        order: sort ? [[sort, sortOrder === 'asc' ? 'ASC' : 'DESC']] : [['created_at', 'DESC']],
        limit,
        offset,
        distinct: true,
      });

      const ids = data.rows.map((c) => c.id);
      const names = data.rows.map((c) => c.name).filter(Boolean);

      // Aggregate bills per client (excluding cancelled).
      const billAgg = ids.length
        ? await Bill.findAll({
            where: applyBusinessScope(req, {
              client_id: { [Op.in]: ids },
              payment_status: { [Op.ne]: 'cancelled' },
            }),
            attributes: [
              'client_id',
              [fn('COUNT', col('id')), 'bill_count'],
              [fn('COALESCE', fn('SUM', col('grand_total')), 0), 'total_billed'],
            ],
            group: ['client_id'],
            raw: true,
          })
        : [];
      const billByClient = new Map(billAgg.map((r) => [Number(r.client_id), r]));

      // Aggregate transactions per client (income reduces outstanding, expense/refund increases).
      const txWhere = applyBusinessScope(req, {
        [Op.or]: [
          ids.length ? { client_id: { [Op.in]: ids } } : null,
          names.length ? { client_name: { [Op.in]: names } } : null,
        ].filter(Boolean),
      });
      const txAgg = (ids.length || names.length)
        ? await Transaction.findAll({
            where: txWhere,
            attributes: ['client_id', 'client_name', 'type', [fn('COALESCE', fn('SUM', col('amount')), 0), 'sum_amount']],
            group: ['client_id', 'client_name', 'type'],
            raw: true,
          })
        : [];
      const txByClient = new Map();
      for (const row of txAgg) {
        let cid = row.client_id ? Number(row.client_id) : null;
        if (!cid && row.client_name) {
          const match = data.rows.find((c) => c.name === row.client_name);
          if (match) cid = match.id;
        }
        if (!cid) continue;
        const cur = txByClient.get(cid) || { income: 0, expense: 0 };
        if (row.type === 'income') cur.income += Number(row.sum_amount) || 0;
        else cur.expense += Number(row.sum_amount) || 0;
        txByClient.set(cid, cur);
      }

      const items = data.rows.map((c) => {
        const plain = c.toJSON();
        const b = billByClient.get(c.id) || {};
        const tx = txByClient.get(c.id) || { income: 0, expense: 0 };
        const total_billed = Number(b.total_billed) || 0;
        const bill_count = Number(b.bill_count) || 0;
        const total_paid = tx.income; // payments received
        const opening = Number(plain.opening_outstanding) || 0;
        const outstanding_amount = opening + total_billed + tx.expense - tx.income;
        return {
          ...plain,
          total_orders: bill_count || plain.total_orders || 0,
          total_amount: total_billed,
          total_billed,
          total_paid,
          outstanding_amount,
        };
      });

      const { pagination } = getPagingData(data, page, limit);
      return ApiResponse.paginated(res, items, pagination);
    } catch (error) {
      next(error);
    }
  },

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
