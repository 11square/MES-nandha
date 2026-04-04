const { Bill, BillItem, Payment, Client, CreditOutstanding, Transaction } = require('../models');
const createCrudController = require('./base.controller');
const ApiResponse = require('../utils/ApiResponse');
const { sequelize } = require('../models');
const { getPagination, getPagingData } = require('../utils/pagination');
const { applyBusinessScope } = require('../middleware/businessScope');

const baseController = createCrudController(Bill, {
  resourceName: 'Bill',
  include: [
    { model: BillItem, as: 'items' },
    { model: Payment, as: 'payments' },
  ],
  searchFields: ['bill_no', 'client_name'],
  defaultOrder: [['date', 'DESC']],
});

module.exports = {
  ...baseController,

  // Override update to handle items replacement
  update: async (req, res, next) => {
    const t = await sequelize.transaction();
    try {
      const { items, ...billData } = req.body;

      const where = { id: req.params.id };
      const scopeWhere = applyBusinessScope(req, where);

      const bill = await Bill.findOne({ where: scopeWhere, transaction: t });

      if (!bill) {
        await t.rollback();
        return ApiResponse.notFound(res, 'Bill not found');
      }

      // Update bill header fields
      await bill.update(billData, { transaction: t });

      // Replace bill items: delete old, insert new
      if (items && Array.isArray(items)) {
        await BillItem.destroy({ where: { bill_id: bill.id }, transaction: t });
        if (items.length > 0) {
          await BillItem.bulkCreate(
            items.map((item) => ({
              item_id: item.item_id || null,
              name: item.name,
              category: item.category || null,
              subcategory: item.subcategory || null,
              size: item.size || null,
              quantity: item.quantity,
              unit: item.unit || null,
              unit_price: item.unit_price,
              discount: item.discount || 0,
              tax: item.tax || 0,
              total: item.total,
              bill_id: bill.id,
              business_id: req.currentBusiness,
            })),
            { transaction: t }
          );
        }
      }

      // Update credit outstanding if exists
      if (billData.payment_type === 'credit') {
        const outstanding = await CreditOutstanding.findOne({
          where: applyBusinessScope(req, { bill_id: bill.id }),
          transaction: t,
        });
        if (outstanding) {
          await outstanding.update({
            client_id: billData.client_id,
            client_name: billData.client_name,
            date: billData.date,
            grand_total: billData.grand_total || 0,
            balance: (billData.grand_total || 0) - parseFloat(outstanding.paid_amount || 0),
          }, { transaction: t });
        }
      }

      await t.commit();

      const updated = await Bill.findByPk(bill.id, {
        include: [
          { model: BillItem, as: 'items' },
          { model: Payment, as: 'payments' },
        ],
      });

      return ApiResponse.success(res, updated, 'Bill updated successfully');
    } catch (error) {
      await t.rollback();
      next(error);
    }
  },

  // Override create to handle items
  create: async (req, res, next) => {
    const t = await sequelize.transaction();
    try {
      const { items, ...billData } = req.body;

      // Auto-generate bill number based on max existing bill number
      if (!billData.bill_no) {
        const year = new Date().getFullYear();
        const allBills = await Bill.findAll({
          where: applyBusinessScope(req),
          attributes: ['bill_no'],
          transaction: t,
        });
        let maxNum = 0;
        allBills.forEach(b => {
          const match = (b.bill_no || '').match(/INV-\d{4}-(\d+)/);
          if (match) {
            const num = parseInt(match[1], 10);
            if (num > maxNum) maxNum = num;
          }
        });
        billData.bill_no = `INV-${year}-${String(maxNum + 1).padStart(3, '0')}`;
      }

      billData.business_id = req.currentBusiness;
      const bill = await Bill.create(billData, { transaction: t });

      if (items && items.length > 0) {
        await BillItem.bulkCreate(
          items.map((item) => ({ ...item, bill_id: bill.id, business_id: req.currentBusiness })),
          { transaction: t }
        );
      }

      // Handle payment based on payment type (skip for drafts)
      if (billData.status !== 'draft' && billData.payment_type === 'cash') {
        // Cash bill: auto-create payment record and mark as paid
        const cashAmount = parseFloat(billData.grand_total || 0);
        await Payment.create({
          bill_id: bill.id,
          bill_no: bill.bill_no,
          client_name: billData.client_name,
          date: billData.date,
          amount: cashAmount,
          method: billData.payment_method || 'cash',
          reference: `Cash payment for ${bill.bill_no}`,
          received_by: billData.created_by || null,
          status: 'completed',
          business_id: req.currentBusiness,
        }, { transaction: t });

        // Create finance transaction for cash bill
        await Transaction.create({
          date: billData.date,
          type: 'income',
          category: 'Sales',
          description: `Cash payment received for invoice ${bill.bill_no} - ${billData.client_name}`,
          amount: cashAmount,
          payment_method: billData.payment_method || 'cash',
          reference: bill.bill_no,
          status: 'completed',
          business_id: req.currentBusiness,
        }, { transaction: t });

        // Mark bill as paid
        await bill.update({
          payment_status: 'paid',
          paid_amount: cashAmount,
        }, { transaction: t });

      } else if (billData.status !== 'draft' && billData.payment_type === 'credit') {
        // Credit bill: create outstanding record
        await CreditOutstanding.create({
          bill_id: bill.id,
          bill_no: bill.bill_no,
          client_id: billData.client_id,
          client_name: billData.client_name,
          date: billData.date,
          grand_total: billData.grand_total || 0,
          paid_amount: billData.paid_amount || 0,
          balance: (billData.grand_total || 0) - (billData.paid_amount || 0),
          due_date: billData.due_date,
          status: 'pending',
          business_id: req.currentBusiness,
        }, { transaction: t });
      }

      await t.commit();

      const created = await Bill.findByPk(bill.id, {
        include: [
          { model: BillItem, as: 'items' },
          { model: Payment, as: 'payments' },
        ],
      });

      return ApiResponse.created(res, created, 'Bill created successfully');
    } catch (error) {
      await t.rollback();
      next(error);
    }
  },

  // GET /billing/payments
  getPayments: async (req, res, next) => {
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

  // POST /billing/payments
  createPayment: async (req, res, next) => {
    const t = await sequelize.transaction();
    try {
      const payment = await Payment.create({ ...req.body, business_id: req.currentBusiness }, { transaction: t });

      // Update bill paid amount
      if (req.body.bill_id) {
        const bill = await Bill.findOne({ where: { id: req.body.bill_id, ...applyBusinessScope(req) }, transaction: t });
        if (bill) {
          const newPaidAmount = parseFloat(bill.paid_amount) + parseFloat(req.body.amount);
          const newStatus = newPaidAmount >= parseFloat(bill.grand_total) ? 'paid' : 'partial';

          await bill.update({
            paid_amount: newPaidAmount,
            payment_status: newStatus,
          }, { transaction: t });

          // Update credit outstanding
          const outstanding = await CreditOutstanding.findOne({
            where: applyBusinessScope(req, { bill_id: bill.id }),
            transaction: t,
          });
          if (outstanding) {
            const newBalance = parseFloat(outstanding.grand_total) - newPaidAmount;
            await outstanding.update({
              paid_amount: newPaidAmount,
              balance: newBalance,
              status: newBalance <= 0 ? 'cleared' : 'partial',
            }, { transaction: t });
          }
        }
      }

      await t.commit();
      return ApiResponse.created(res, payment, 'Payment recorded');
    } catch (error) {
      await t.rollback();
      next(error);
    }
  },

  // GET /billing/stock-items
  getStockItems: async (req, res, next) => {
    try {
      const { StockItem } = require('../models');
      const items = await StockItem.findAll({
        where: applyBusinessScope(req),
        attributes: ['id', 'name', 'sku', 'unit_price', 'unit', 'current_stock', 'category', 'subcategory'],
        order: [['name', 'ASC']],
      });
      return ApiResponse.success(res, items);
    } catch (error) {
      next(error);
    }
  },

  // GET /billing/clients
  getBillingClients: async (req, res, next) => {
    try {
      const clients = await Client.findAll({
        where: applyBusinessScope(req),
        attributes: ['id', 'name', 'contact_person', 'phone', 'email', 'address', 'gst_number'],
        order: [['name', 'ASC']],
      });
      return ApiResponse.success(res, clients);
    } catch (error) {
      next(error);
    }
  },
};
