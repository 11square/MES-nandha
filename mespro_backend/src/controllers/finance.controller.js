const { Transaction, Payment, Bill, Client, Vendor, CreditOutstanding, Order, PurchaseOrder } = require('../models');
const createCrudController = require('./base.controller');
const ApiResponse = require('../utils/ApiResponse');
const { getPagination, getPagingData } = require('../utils/pagination');
const { applyBusinessScope } = require('../middleware/businessScope');
const { sequelize } = require('../models');

const baseController = createCrudController(Transaction, {
  resourceName: 'Transaction',
  searchFields: ['category', 'description', 'reference'],
  defaultOrder: [['created_at', 'DESC']],
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
          { vendor_name: { [Op.like]: `%${search}%` } },
        ];
      }
      if (type) where.type = type;
      if (status) {
        where.status = status;
      } else {
        where.status = { [Op.in]: ['completed', 'cancelled'] };
      }
      if (startDate && endDate) {
        where.date = { [Op.between]: [startDate, endDate] };
      }

      applyBusinessScope(req, where);

      const data = await Transaction.findAndCountAll({
        where,
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

  // GET /finance/transactions/all — combined view from transactions + orders + bills + purchase orders
  getAllCombined: async (req, res, next) => {
    try {
      const { Op } = require('sequelize');
      const where = {};
      applyBusinessScope(req, where);

      // 1. Manual transactions
      const txRows = await Transaction.findAll({ where, order: [['created_at', 'DESC']] });
      const transactions = txRows.map(tx => {
        const d = tx.toJSON();
        return {
          id: `tx-${d.id}`,
          _source: 'transaction',
          _sourceId: d.id,
          date: d.date,
          created_at: d.createdAt || d.created_at,
          type: d.type,
          category: d.category || '',
          description: d.description || '',
          amount: parseFloat(d.amount) || 0,
          payment_method: d.payment_method || '',
          payment_type: d.payment_type || '',
          client_name: d.client_name || '',
          vendor_name: d.vendor_name || '',
          party_type: d.party_type || (d.vendor_name ? 'vendor' : d.client_name ? 'client' : 'others'),
          status: d.status || 'completed',
          reference: d.reference || '',
          address: d.address || '',
          mobile_number: d.mobile_number || '',
          gst_number: d.gst_number || '',
          bill_id: d.bill_id,
          client_id: d.client_id,
          vendor_id: d.vendor_id,
        };
      });

      // 2. Orders → income entries
      const orderRows = await Order.findAll({ where, order: [['created_at', 'DESC']] });
      const orders = orderRows
        .filter(o => parseFloat(o.total_amount) > 0)
        .map(o => {
          const d = o.toJSON();
          const statusMap = { 'Paid': 'completed', 'Partial': 'pending', 'Unpaid': 'pending' };
          return {
            id: `ord-${d.id}`,
            _source: 'order',
            _sourceId: d.id,
            date: d.createdAt || d.created_at || d.required_date || d.converted_date || new Date().toISOString(),
            created_at: d.createdAt || d.created_at || d.required_date || d.converted_date || new Date().toISOString(),
            type: 'income',
            category: 'Order',
            description: `${d.order_number} — ${d.product || 'Order'}`,
            amount: parseFloat(d.total_amount) || 0,
            payment_method: '',
            payment_type: '',
            client_name: d.customer || '',
            vendor_name: '',
            party_type: 'client',
            status: statusMap[d.payment_status] || 'pending',
            reference: d.order_number,
            address: d.address || '',
            mobile_number: d.mobile || '',
            gst_number: d.gst_number || '',
          };
        });

      // 3. Bills / Invoices → income entries (exclude drafts)
      const billRows = await Bill.findAll({ where, order: [['created_at', 'DESC']] });
      const bills = billRows
        .filter(b => b.status !== 'draft')
        .map(b => {
          const d = b.toJSON();
          const statusMap = { 'paid': 'completed', 'partial': 'partial', 'pending': 'pending', 'overdue': 'pending' };
          return {
            id: `bill-${d.id}`,
            _source: 'bill',
            _sourceId: d.id,
            date: d.date,
            created_at: d.createdAt || d.created_at,
            type: 'income',
            category: 'Invoice',
            description: `${d.bill_no} — ${d.client_name}`,
            amount: parseFloat(d.grand_total) || 0,
            payment_method: d.payment_method || '',
            payment_type: d.payment_type || '',
            client_name: d.client_name || '',
            vendor_name: '',
            party_type: 'client',
            status: statusMap[d.payment_status] || 'pending',
            reference: d.bill_no,
            address: d.client_address || '',
            mobile_number: '',
            gst_number: d.client_gst || '',
          };
        });

      // 4. Purchase Orders → expense entries
      const poRows = await PurchaseOrder.findAll({ where, order: [['created_at', 'DESC']] });
      const pos = poRows
        .filter(p => parseFloat(p.total_amount) > 0)
        .map(p => {
          const d = p.toJSON();
          const statusMap = { 'draft': 'pending', 'sent': 'pending', 'confirmed': 'pending', 'received': 'completed', 'cancelled': 'cancelled' };
          return {
            id: `po-${d.id}`,
            _source: 'purchase_order',
            _sourceId: d.id,
            date: d.date,
            created_at: d.createdAt || d.created_at,
            type: 'expense',
            category: 'Purchase Order',
            description: `${d.po_number} — ${d.vendor_name || 'Vendor'}`,
            amount: parseFloat(d.total_amount) || 0,
            payment_method: '',
            payment_type: '',
            client_name: '',
            vendor_name: d.vendor_name || '',
            party_type: 'vendor',
            status: statusMap[d.status] || 'pending',
            reference: d.po_number,
            address: d.vendor_address || '',
            mobile_number: d.vendor_contact || '',
            gst_number: d.vendor_gst || '',
          };
        });

      // Collect bill references to deduplicate — exclude transaction records
      // that were auto-created for bills (to avoid double-counting)
      const billRefs = new Set(bills.map(b => b.reference).filter(Boolean));
      const dedupedTx = transactions.filter(tx => !tx.reference || !billRefs.has(tx.reference));

      // Merge and sort by date descending, then by sourceId descending — only show completed (paid) entries
      const combined = [...dedupedTx, ...orders, ...bills, ...pos]
        .filter(t => t.status === 'completed')
        .sort((a, b) => {
          const aTime = new Date(a.created_at || a.date).getTime() || 0;
          const bTime = new Date(b.created_at || b.date).getTime() || 0;
          const dateDiff = bTime - aTime;
          if (dateDiff !== 0) return dateDiff;
          // Same created_at: sort by source record id descending (newest first)
          return (b._sourceId || 0) - (a._sourceId || 0);
        });

      return ApiResponse.success(res, {
        items: combined,
        pagination: {
          totalItems: combined.length,
          totalPages: 1,
          currentPage: 1,
          itemsPerPage: combined.length,
          hasNextPage: false,
          hasPrevPage: false,
        },
      });
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

      // Map frontend 'vendor' field to 'vendor_name'
      if (data.vendor && !data.vendor_name) {
        data.vendor_name = data.vendor;
      }
      delete data.vendor;

      // Resolve client_id from client_name
      if (data.client_name && !data.client_id) {
        const client = await Client.findOne({
          where: applyBusinessScope(req, { name: data.client_name }),
          attributes: ['id'],
          transaction: t,
        });
        if (client) data.client_id = client.id;
      }

      // Resolve vendor_id from vendor_name
      if (data.vendor_name && !data.vendor_id) {
        const vendor = await Vendor.findOne({
          where: applyBusinessScope(req, { name: data.vendor_name }),
          attributes: ['id'],
          transaction: t,
        });
        if (vendor) data.vendor_id = vendor.id;
      }

      // Create the transaction record
      const record = await Transaction.create(data, { transaction: t });

      // --- Outstanding balance logic for Client ---
      // Income from client → deduct (reduce) client outstanding
      // Expense to client → increase client outstanding
      if (data.party_type === 'client' && data.client_id && parseFloat(data.amount) > 0) {
        const amount = parseFloat(data.amount);

        if (data.type === 'income') {
          // Income: apply payment to oldest pending credit bills first
          let remainingAmount = amount;
          const methodMap = { 'cash': 'cash', 'upi': 'upi', 'bank transfer': 'bank', 'bank': 'bank', 'cheque': 'cheque', 'credit card': 'card', 'card': 'card', 'online': 'upi' };
          const paymentMethod = methodMap[(data.payment_method || 'cash').toLowerCase()] || 'cash';

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

            const newPaidAmount = parseFloat(outstanding.paid_amount) + payAmount;
            const newBalance = parseFloat(outstanding.grand_total) - newPaidAmount;
            await outstanding.update({
              paid_amount: newPaidAmount,
              balance: newBalance,
              status: newBalance <= 0 ? 'cleared' : 'partial',
            }, { transaction: t });

            if (outstanding.bill_id) {
              const bill = await Bill.findByPk(outstanding.bill_id, { transaction: t });
              if (bill) {
                const billNewPaid = parseFloat(bill.paid_amount || 0) + payAmount;
                const billStatus = billNewPaid >= parseFloat(bill.grand_total) ? 'paid' : 'partial';
                await bill.update({ paid_amount: billNewPaid, payment_status: billStatus }, { transaction: t });
              }
            }
            remainingAmount -= payAmount;
          }

          // Also reduce opening_outstanding on client if still remaining
          if (remainingAmount > 0) {
            const client = await Client.findByPk(data.client_id, { transaction: t });
            if (client && parseFloat(client.opening_outstanding) > 0) {
              const newOutstanding = Math.max(0, parseFloat(client.opening_outstanding) - remainingAmount);
              await client.update({ opening_outstanding: newOutstanding }, { transaction: t });
            }
          }
        } else if (data.type === 'expense') {
          // Expense to client → increase client outstanding
          const client = await Client.findByPk(data.client_id, { transaction: t });
          if (client) {
            const newOutstanding = parseFloat(client.opening_outstanding || 0) + amount;
            await client.update({ opening_outstanding: newOutstanding }, { transaction: t });
          }
        }
      }

      // --- Outstanding balance logic for Vendor ---
      // Expense to vendor (payment made) → reduce vendor outstanding
      // Income from vendor (refund/credit received) → also reduce vendor outstanding
      // PO creation is what INCREASES vendor outstanding, not a finance transaction.
      if (data.party_type === 'vendor' && data.vendor_id && parseFloat(data.amount) > 0) {
        const amount = parseFloat(data.amount);
        const vendor = await Vendor.findByPk(data.vendor_id, { transaction: t });
        if (vendor) {
          if (data.type === 'expense' || data.type === 'income') {
            // Both expense (payment) and income (refund) from vendor reduce what we owe
            const newOutstanding = Math.max(0, parseFloat(vendor.outstanding_amount || 0) - amount);
            await vendor.update({ outstanding_amount: newOutstanding }, { transaction: t });
          }
        }
      }

      await t.commit();
      return ApiResponse.created(res, record, 'Transaction created successfully');
    } catch (error) {
      await t.rollback();
      next(error);
    }
  },

  // PUT /finance/transactions/:id — override to map client/vendor fields
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
      // Map frontend 'vendor' field to 'vendor_name'
      if (data.vendor !== undefined) {
        data.vendor_name = data.vendor;
        delete data.vendor;
      }
      // Resolve client_id from client_name
      if (data.client_name && !data.client_id) {
        const client = await Client.findOne({
          where: applyBusinessScope(req, { name: data.client_name }),
          attributes: ['id'],
        });
        if (client) data.client_id = client.id;
      }
      // Resolve vendor_id from vendor_name
      if (data.vendor_name && !data.vendor_id) {
        const vendor = await Vendor.findOne({
          where: applyBusinessScope(req, { name: data.vendor_name }),
          attributes: ['id'],
        });
        if (vendor) data.vendor_id = vendor.id;
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
        order: [['date', 'DESC'], ['id', 'DESC']],
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
