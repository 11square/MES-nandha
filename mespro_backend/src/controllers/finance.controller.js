const { Transaction, Payment, Bill } = require('../models');
const createCrudController = require('./base.controller');
const ApiResponse = require('../utils/ApiResponse');
const { getPagination, getPagingData } = require('../utils/pagination');
const { applyBusinessScope } = require('../middleware/businessScope');

const baseController = createCrudController(Transaction, {
  resourceName: 'Transaction',
  searchFields: ['category', 'description', 'reference'],
  defaultOrder: [['date', 'DESC']],
});

module.exports = {
  ...baseController,

  // GET /finance/transactions with filters
  getAll: async (req, res, next) => {
    try {
      const { Op } = require('sequelize');
      const { search, type, status, startDate, endDate } = req.query;
      const { page, limit, offset } = getPagination(req.query);
      const where = {};

      if (search) {
        where[Op.or] = [
          { category: { [Op.like]: `%${search}%` } },
          { description: { [Op.like]: `%${search}%` } },
          { reference: { [Op.like]: `%${search}%` } },
        ];
      }
      if (type) where.type = type;
      if (status) where.status = status;
      if (startDate && endDate) {
        where.date = { [Op.between]: [startDate, endDate] };
      }

      applyBusinessScope(req, where);

      const data = await Transaction.findAndCountAll({
        where,
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

  // GET /finance/receipts
  getReceipts: async (req, res, next) => {
    try {
      const { page, limit, offset } = getPagination(req.query);
      const data = await Payment.findAndCountAll({
        where: applyBusinessScope(req),
        include: [{ model: Bill, as: 'bill', attributes: ['id', 'bill_no', 'grand_total'] }],
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
  // POST /finance/receipts
  createReceipt: async (req, res, next) => {
    try {
      const receipt = await Payment.create({ ...req.body, business_id: req.currentBusiness });
      return ApiResponse.created(res, receipt);
    } catch (error) {
      next(error);
    }
  },
  // GET /finance/summary
  getSummary: async (req, res, next) => {
    try {
      const { sequelize: seq } = require('../models');

      const [incomeResult] = await seq.query(
        "SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'income' AND status = 'completed' AND (:businessId IS NULL OR business_id = :businessId)",
        { replacements: { businessId: req.currentBusiness || null } }
      );
      const [expenseResult] = await seq.query(
        "SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'expense' AND status = 'completed' AND (:businessId IS NULL OR business_id = :businessId)",
        { replacements: { businessId: req.currentBusiness || null } }
      );

      const totalIncome = parseFloat(incomeResult[0]?.total || 0);
      const totalExpense = parseFloat(expenseResult[0]?.total || 0);

      return ApiResponse.success(res, {
        totalIncome,
        totalExpense,
        netProfit: totalIncome - totalExpense,
      });
    } catch (error) {
      next(error);
    }
  },
};
