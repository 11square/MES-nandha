const { Transaction, Payment, Bill, Client, CreditOutstanding } = require('../models');
const createCrudController = require('./base.controller');
const ApiResponse = require('../utils/ApiResponse');
const { getPagination, getPagingData } = require('../utils/pagination');
const { applyBusinessScope } = require('../middleware/businessScope');
const { sequelize } = require('../models');

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
          { client_name: { [Op.like]: `%${search}%` } },
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

  // POST /finance/transactions — override base create to handle credit payment flow
  create: async (req, res, next) => {
    const t = await sequelize.transaction();
    try {
      const { Op } = require('sequelize');
      const data = { ...req.body, business_id: req.currentBusiness };

      // Map frontend 'client' field to 'client_name'
      if (data.client && !data.client_name) {
        data.client_name = data.client;
      }
      delete data.client;

      // Try to find client_id from client_name
      if (data.client_name && !data.client_id) {
        const client = await Client.findOne({
          where: applyBusinessScope(req, { name: data.client_name }),
          attributes: ['id'],
          transaction: t,
        });
        if (client) data.client_id = client.id;
      }

      // Create the transaction record
      const record = await Transaction.create(data, { transaction: t });

      // If income transaction with a client, apply payment to oldest pending credit bill
      if (data.type === 'income' && data.client_id && parseFloat(data.amount) > 0) {
        let remainingAmount = parseFloat(data.amount);

        // Map frontend payment method names to Payment model ENUM values
        const methodMap = { 'cash': 'cash', 'upi': 'upi', 'bank transfer': 'bank', 'bank': 'bank', 'cheque': 'cheque', 'credit card': 'card', 'card': 'card', 'online': 'upi' };
        const paymentMethod = methodMap[(data.payment_method || 'cash').toLowerCase()] || 'cash';

        // Find all pending/partial credit outstandings for this client, oldest first
        const outstandings = await CreditOutstanding.findAll({
          where: applyBusinessScope(req, {
            client_id: data.client_id,
            status: { [Op.in]: ['pending', 'partial', 'overdue'] },
            balance: { [Op.gt]: 0 },
          }),
          order: [['date', 'ASC']],
          transaction: t,
        });

        for (const outstanding of outstandings) {
          if (remainingAmount <= 0) break;

          const outstandingBalance = parseFloat(outstanding.balance);
          const payAmount = Math.min(remainingAmount, outstandingBalance);

          // Create Payment record linked to the bill
          await Payment.create({
            bill_id: outstanding.bill_id,
            bill_no: outstanding.bill_no,
            client_name: data.client_name,
            date: data.date,
            amount: payAmount,
            method: paymentMethod,
            reference: data.description || `Payment for ${outstanding.bill_no}`,
            status: 'completed',
            business_id: req.currentBusiness,
          }, { transaction: t });

          // Update CreditOutstanding
          const newPaidAmount = parseFloat(outstanding.paid_amount) + payAmount;
          const newBalance = parseFloat(outstanding.grand_total) - newPaidAmount;
          await outstanding.update({
            paid_amount: newPaidAmount,
            balance: newBalance,
            status: newBalance <= 0 ? 'cleared' : 'partial',
          }, { transaction: t });

          // Update Bill paid_amount and payment_status
          if (outstanding.bill_id) {
            const bill = await Bill.findByPk(outstanding.bill_id, { transaction: t });
            if (bill) {
              const billNewPaid = parseFloat(bill.paid_amount || 0) + payAmount;
              const billStatus = billNewPaid >= parseFloat(bill.grand_total) ? 'paid' : 'partial';
              await bill.update({
                paid_amount: billNewPaid,
                payment_status: billStatus,
              }, { transaction: t });
            }
          }

          remainingAmount -= payAmount;
        }
      }

      await t.commit();
      return ApiResponse.created(res, record, 'Transaction created successfully');
    } catch (error) {
      await t.rollback();
      next(error);
    }
  },

  // PUT /finance/transactions/:id — override to map client field
  update: async (req, res, next) => {
    try {
      const where = { id: req.params.id };
      applyBusinessScope(req, where);
      const record = await Transaction.findOne({ where });
      if (!record) return ApiResponse.notFound(res, 'Transaction not found');

      const data = { ...req.body };
      // Map frontend 'client' field to 'client_name'
      if (data.client !== undefined) {
        data.client_name = data.client;
        delete data.client;
      }
      // Resolve client_id from client_name
      if (data.client_name && !data.client_id) {
        const client = await Client.findOne({
          where: applyBusinessScope(req, { name: data.client_name }),
          attributes: ['id'],
        });
        if (client) data.client_id = client.id;
      }

      await record.update(data);
      await record.reload();
      return ApiResponse.success(res, record, 'Transaction updated successfully');
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
