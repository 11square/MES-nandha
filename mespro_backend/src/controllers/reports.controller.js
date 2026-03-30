const {
  Order, Client, Sale, ProductionOrder, Bill, Payment,
  Lead, StaffMember, AttendanceRecord, Dispatch,
  RawMaterial, FinishedGood, Transaction, StockItem,
  PurchaseOrder, Vendor, PayrollRecord, CreditOutstanding,
} = require('../models');
const { sequelize } = require('../models');
const ApiResponse = require('../utils/ApiResponse');
const { getPagination, getPagingData } = require('../utils/pagination');
const { applyBusinessScope } = require('../middleware/businessScope');

module.exports = {
  // GET /reports/sales
  getSalesReport: async (req, res, next) => {
    try {
      const { Op } = require('sequelize');
      const { startDate, endDate, page: pageParam, limit: limitParam } = req.query;
      const { page, limit, offset } = getPagination({ page: pageParam, limit: limitParam });
      const where = {};
      if (startDate && endDate) {
        where.date = { [Op.between]: [startDate, endDate] };
      }

      const [summaryResult] = await sequelize.query(
        `SELECT COUNT(*) as count,
                COALESCE(SUM(total_amount), 0) as totalSales
         FROM sales
         WHERE (:hasDateFilter = 0 OR date BETWEEN :startDate AND :endDate)
           AND (:businessId IS NULL OR business_id = :businessId)`,
        {
          replacements: {
            hasDateFilter: (startDate && endDate) ? 1 : 0,
            startDate: startDate || '1970-01-01',
            endDate: endDate || '2099-12-31',
            businessId: req.currentBusiness || null,
          },
          type: sequelize.QueryTypes.SELECT,
        }
      );

      applyBusinessScope(req, where);

      const data = await Sale.findAndCountAll({
        where,
        order: [['date', 'DESC']],
        limit,
        offset,
        distinct: true,
      });
      const { items, pagination } = getPagingData(data, page, limit);

      return ApiResponse.success(res, {
        sales: items,
        pagination,
        summary: {
          totalSales: parseFloat(summaryResult.totalSales || 0),
          count: parseInt(summaryResult.count || 0, 10),
          avgSale: summaryResult.count > 0
            ? parseFloat(summaryResult.totalSales) / parseInt(summaryResult.count, 10)
            : 0,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  // GET /reports/production
  getProductionReport: async (req, res, next) => {
    try {
      const { Op } = require('sequelize');
      const { status, page: pageParam, limit: limitParam } = req.query;
      const { page, limit, offset } = getPagination({ page: pageParam, limit: limitParam });
      const where = {};
      if (status) where.status = status;

      applyBusinessScope(req, where);

      const statusCounts = await ProductionOrder.findAll({
        attributes: [
          'status',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        ],
        where: { ...applyBusinessScope(req) },
        group: ['status'],
        raw: true,
      });

      const statusCountsMap = {};
      statusCounts.forEach(row => {
        statusCountsMap[row.status] = parseInt(row.count, 10);
      });

      const data = await ProductionOrder.findAndCountAll({
        where,
        include: [{ model: Order, as: 'order', attributes: ['id', 'order_number', 'client_id'] }],
        order: [['created_at', 'DESC']],
        limit,
        offset,
        distinct: true,
      });
      const { items, pagination } = getPagingData(data, page, limit);

      return ApiResponse.success(res, {
        orders: items,
        pagination,
        summary: {
          total: Object.values(statusCountsMap).reduce((a, b) => a + b, 0),
          statusCounts: statusCountsMap,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  // GET /reports/financial
  getFinancialReport: async (req, res, next) => {
    try {
      const { startDate, endDate } = req.query;

      let dateWhere = '';
      const replacements = {};
      if (startDate && endDate) {
        dateWhere = ' AND date BETWEEN :startDate AND :endDate';
        replacements.startDate = startDate;
        replacements.endDate = endDate;
      }

      replacements.businessId = req.currentBusiness || null;
      const businessWhere = ' AND (:businessId IS NULL OR business_id = :businessId)';

      const [[income], [expense], [receivables]] = await Promise.all([
        sequelize.query(
          `SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'income'${dateWhere}${businessWhere}`,
          { replacements, type: sequelize.QueryTypes.SELECT }
        ),
        sequelize.query(
          `SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'expense'${dateWhere}${businessWhere}`,
          { replacements, type: sequelize.QueryTypes.SELECT }
        ),
        sequelize.query(
          "SELECT COALESCE(SUM(co.balance), 0) as total FROM credit_outstandings co INNER JOIN bills b ON co.bill_id = b.id WHERE co.balance > 0 AND (:businessId IS NULL OR b.business_id = :businessId)",
          { replacements: { businessId: req.currentBusiness || null }, type: sequelize.QueryTypes.SELECT }
        ),
      ]);

      const totalIncome = parseFloat(income?.total || 0);
      const totalExpense = parseFloat(expense?.total || 0);

      return ApiResponse.success(res, {
        totalIncome,
        totalExpense,
        netProfit: totalIncome - totalExpense,
        totalReceivables: parseFloat(receivables?.total || 0),
      });
    } catch (error) {
      next(error);
    }
  },

  // GET /reports/attendance
  getAttendanceReport: async (req, res, next) => {
    try {
      const { Op } = require('sequelize');
      const { startDate, endDate, workerId, page: pageParam, limit: limitParam } = req.query;
      const { page, limit, offset } = getPagination({ page: pageParam, limit: limitParam });
      const where = {};

      if (startDate && endDate) {
        where.date = { [Op.between]: [startDate, endDate] };
      }
      if (workerId) where.staff_id = workerId;

      applyBusinessScope(req, where);

      const summaryCounts = await AttendanceRecord.findAll({
        where,
        attributes: [
          'present',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        ],
        group: ['present'],
        raw: true,
      });

      const totalCount = await AttendanceRecord.count({ where });
      const summary = { total: totalCount, present: 0, absent: 0 };
      summaryCounts.forEach(row => {
        const count = parseInt(row.count, 10);
        if (row.present === 1 || row.present === true) summary.present = count;
        else summary.absent = count;
      });

      const data = await AttendanceRecord.findAndCountAll({
        where,
        include: [{ model: StaffMember, as: 'staff', attributes: ['id', 'employee_id', 'name', 'role', 'department'] }],
        order: [['date', 'DESC']],
        limit,
        offset,
        distinct: true,
      });
      const { items, pagination } = getPagingData(data, page, limit);

      return ApiResponse.success(res, { records: items, pagination, summary });
    } catch (error) {
      next(error);
    }
  },

  // GET /reports/inventory
  getInventoryReport: async (req, res, next) => {
    try {
      const { Op } = require('sequelize');
      const [rawTotal, rawLowStock, finishedTotal, finishedLowStock] = await Promise.all([
        RawMaterial.count({ where: applyBusinessScope(req) }),
        RawMaterial.count({
          where: {
            ...applyBusinessScope(req),
            [Op.and]: sequelize.where(
              sequelize.col('stock'),
              Op.lte,
              sequelize.col('reorder_point')
            ),
          },
        }),
        FinishedGood.count({ where: applyBusinessScope(req) }),
        FinishedGood.count({
          where: applyBusinessScope(req, { stock: { [Op.lte]: 0 } }),
        }),
      ]);

      const rawMaterials = await RawMaterial.findAll({
        where: applyBusinessScope(req),
        order: [['name', 'ASC']],
        limit: 100,
      });
      const finishedGoods = await FinishedGood.findAll({
        where: applyBusinessScope(req),
        order: [['product', 'ASC']],
        limit: 100,
      });

      return ApiResponse.success(res, {
        rawMaterials: { total: rawTotal, lowStock: rawLowStock, items: rawMaterials },
        finishedGoods: { total: finishedTotal, lowStock: finishedLowStock, items: finishedGoods },
      });
    } catch (error) {
      next(error);
    }
  },

  // GET /reports/dispatch
  getDispatchReport: async (req, res, next) => {
    try {
      const { Op } = require('sequelize');
      const { status, startDate, endDate, page: pageParam, limit: limitParam } = req.query;
      const { page, limit, offset } = getPagination({ page: pageParam, limit: limitParam });
      const where = {};
      if (status) where.status = status;
      if (startDate && endDate) {
        where.dispatch_date = { [Op.between]: [startDate, endDate] };
      }

      applyBusinessScope(req, where);

      const statusCounts = await Dispatch.findAll({
        where,
        attributes: [
          'status',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        ],
        group: ['status'],
        raw: true,
      });

      const statusCountsMap = {};
      statusCounts.forEach(row => {
        statusCountsMap[row.status] = parseInt(row.count, 10);
      });

      const data = await Dispatch.findAndCountAll({
        where,
        include: [{ model: Order, as: 'order', attributes: ['id', 'order_number'] }],
        order: [['dispatch_date', 'DESC']],
        limit,
        offset,
        distinct: true,
      });
      const { items, pagination } = getPagingData(data, page, limit);

      return ApiResponse.success(res, {
        dispatches: items,
        pagination,
        summary: {
          total: Object.values(statusCountsMap).reduce((a, b) => a + b, 0),
          statusCounts: statusCountsMap,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  // ═══════════════════════════════════════════════════════════
  // NEW ENDPOINTS BELOW
  // ═══════════════════════════════════════════════════════════

  // GET /reports/billing
  getBillingReport: async (req, res, next) => {
    try {
      const { Op } = require('sequelize');
      const { startDate, endDate } = req.query;
      const where = {};
      if (startDate && endDate) {
        where.date = { [Op.between]: [startDate, endDate] };
      }
      applyBusinessScope(req, where);

      // Summary aggregation
      const [summary] = await sequelize.query(
        `SELECT
           COUNT(*) as totalBills,
           COALESCE(SUM(grand_total), 0) as totalAmount,
           COALESCE(SUM(paid_amount), 0) as totalPaid,
           COALESCE(SUM(grand_total) - SUM(paid_amount), 0) as totalPending
         FROM bills
         WHERE (:hasDateFilter = 0 OR date BETWEEN :startDate AND :endDate)
           AND (:businessId IS NULL OR business_id = :businessId)`,
        {
          replacements: {
            hasDateFilter: (startDate && endDate) ? 1 : 0,
            startDate: startDate || '1970-01-01',
            endDate: endDate || '2099-12-31',
            businessId: req.currentBusiness || null,
          },
          type: sequelize.QueryTypes.SELECT,
        }
      );

      // Payment status breakdown
      const statusBreakdown = await Bill.findAll({
        where,
        attributes: [
          'payment_status',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
          [sequelize.fn('SUM', sequelize.col('grand_total')), 'total'],
        ],
        group: ['payment_status'],
        raw: true,
      });

      // Recent bills
      const recentBills = await Bill.findAll({
        where,
        order: [['date', 'DESC']],
        limit: 10,
        include: [{ model: Client, as: 'client', attributes: ['id', 'name'] }],
      });

      return ApiResponse.success(res, {
        summary: {
          totalBills: parseInt(summary.totalBills || 0, 10),
          totalAmount: parseFloat(summary.totalAmount || 0),
          totalPaid: parseFloat(summary.totalPaid || 0),
          totalPending: parseFloat(summary.totalPending || 0),
        },
        statusBreakdown,
        recentBills,
      });
    } catch (error) {
      next(error);
    }
  },

  // GET /reports/orders
  getOrdersReport: async (req, res, next) => {
    try {
      const { Op } = require('sequelize');
      const { status, startDate, endDate } = req.query;
      const where = {};
      if (status) where.status = status;
      if (startDate && endDate) {
        where.created_at = { [Op.between]: [startDate, endDate] };
      }
      applyBusinessScope(req, where);

      // Status breakdown
      const statusCounts = await Order.findAll({
        where: applyBusinessScope(req),
        attributes: [
          'status',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        ],
        group: ['status'],
        raw: true,
      });
      const statusCountsMap = {};
      let totalOrders = 0;
      statusCounts.forEach(row => {
        const c = parseInt(row.count, 10);
        statusCountsMap[row.status] = c;
        totalOrders += c;
      });

      // Revenue summary
      const [revSummary] = await sequelize.query(
        `SELECT
           COALESCE(SUM(total_amount), 0) as totalRevenue,
           COALESCE(AVG(total_amount), 0) as avgOrderValue
         FROM orders
         WHERE (:businessId IS NULL OR business_id = :businessId)`,
        {
          replacements: { businessId: req.currentBusiness || null },
          type: sequelize.QueryTypes.SELECT,
        }
      );

      // Recent orders
      const recentOrders = await Order.findAll({
        where,
        order: [['created_at', 'DESC']],
        limit: 10,
      });

      return ApiResponse.success(res, {
        summary: {
          totalOrders,
          totalRevenue: parseFloat(revSummary.totalRevenue || 0),
          avgOrderValue: parseFloat(revSummary.avgOrderValue || 0),
          statusCounts: statusCountsMap,
        },
        recentOrders,
      });
    } catch (error) {
      next(error);
    }
  },

  // GET /reports/stock
  getStockReport: async (req, res, next) => {
    try {
      const { Op } = require('sequelize');
      const where = applyBusinessScope(req);

      // Summary
      const [totalItems, lowStockItems, outOfStock] = await Promise.all([
        StockItem.count({ where }),
        StockItem.count({
          where: {
            ...where,
            status: { [Op.in]: ['Low Stock', 'Critical'] },
          },
        }),
        StockItem.count({
          where: { ...where, status: 'Out of Stock' },
        }),
      ]);

      // Total stock value
      const [valResult] = await sequelize.query(
        `SELECT COALESCE(SUM(current_stock * unit_price), 0) as totalValue
         FROM stock_items
         WHERE (:businessId IS NULL OR business_id = :businessId)`,
        {
          replacements: { businessId: req.currentBusiness || null },
          type: sequelize.QueryTypes.SELECT,
        }
      );

      // Category breakdown
      const categoryBreakdown = await StockItem.findAll({
        where,
        attributes: [
          'category',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
          [sequelize.fn('SUM', sequelize.literal('current_stock * unit_price')), 'value'],
        ],
        group: ['category'],
        raw: true,
      });

      // Low stock items list
      const lowStockList = await StockItem.findAll({
        where: {
          ...where,
          status: { [Op.in]: ['Low Stock', 'Critical', 'Out of Stock'] },
        },
        order: [['current_stock', 'ASC']],
        limit: 20,
      });

      return ApiResponse.success(res, {
        summary: {
          totalItems,
          lowStockItems,
          outOfStock,
          totalValue: parseFloat(valResult.totalValue || 0),
        },
        categoryBreakdown,
        lowStockList,
      });
    } catch (error) {
      next(error);
    }
  },

  // GET /reports/purchase-orders
  getPurchaseOrderReport: async (req, res, next) => {
    try {
      const { Op } = require('sequelize');
      const { status } = req.query;
      const where = {};
      if (status) where.status = status;
      applyBusinessScope(req, where);

      // Status breakdown
      const statusCounts = await PurchaseOrder.findAll({
        where: applyBusinessScope(req),
        attributes: [
          'status',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
          [sequelize.fn('SUM', sequelize.col('total_amount')), 'total'],
        ],
        group: ['status'],
        raw: true,
      });
      const statusCountsMap = {};
      let totalPOs = 0;
      let totalSpent = 0;
      statusCounts.forEach(row => {
        const c = parseInt(row.count, 10);
        statusCountsMap[row.status] = c;
        totalPOs += c;
        totalSpent += parseFloat(row.total || 0);
      });

      // Recent POs
      const recentPOs = await PurchaseOrder.findAll({
        where,
        order: [['date', 'DESC']],
        limit: 10,
        include: [{ model: Vendor, as: 'vendor', attributes: ['id', 'name'] }],
      });

      return ApiResponse.success(res, {
        summary: {
          totalPOs,
          totalSpent,
          statusCounts: statusCountsMap,
        },
        recentPOs,
      });
    } catch (error) {
      next(error);
    }
  },

  // GET /reports/vendors
  getVendorReport: async (req, res, next) => {
    try {
      const where = applyBusinessScope(req);

      const [totalVendors, activeVendors] = await Promise.all([
        Vendor.count({ where }),
        Vendor.count({ where: { ...where, status: 'Active' } }),
      ]);

      // Total purchases & outstanding
      const [aggResult] = await sequelize.query(
        `SELECT
           COALESCE(SUM(total_purchases), 0) as totalPurchases,
           COALESCE(SUM(total_amount), 0) as totalAmount,
           COALESCE(SUM(outstanding_amount), 0) as totalOutstanding
         FROM vendors
         WHERE (:businessId IS NULL OR business_id = :businessId)`,
        {
          replacements: { businessId: req.currentBusiness || null },
          type: sequelize.QueryTypes.SELECT,
        }
      );

      // Top vendors by amount
      const topVendors = await Vendor.findAll({
        where,
        order: [['total_amount', 'DESC']],
        limit: 10,
      });

      return ApiResponse.success(res, {
        summary: {
          totalVendors,
          activeVendors,
          inactiveVendors: totalVendors - activeVendors,
          totalPurchases: parseInt(aggResult.totalPurchases || 0, 10),
          totalAmount: parseFloat(aggResult.totalAmount || 0),
          totalOutstanding: parseFloat(aggResult.totalOutstanding || 0),
        },
        topVendors,
      });
    } catch (error) {
      next(error);
    }
  },

  // GET /reports/staff
  getStaffReport: async (req, res, next) => {
    try {
      const where = applyBusinessScope(req);

      const [totalStaff, activeStaff, onLeave] = await Promise.all([
        StaffMember.count({ where }),
        StaffMember.count({ where: { ...where, status: 'Active' } }),
        StaffMember.count({ where: { ...where, status: 'On Leave' } }),
      ]);

      // Department breakdown
      const departmentBreakdown = await StaffMember.findAll({
        where,
        attributes: [
          'department',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        ],
        group: ['department'],
        raw: true,
      });

      // Role breakdown
      const roleBreakdown = await StaffMember.findAll({
        where,
        attributes: [
          'role',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        ],
        group: ['role'],
        raw: true,
      });

      return ApiResponse.success(res, {
        summary: {
          totalStaff,
          activeStaff,
          onLeave,
          inactive: totalStaff - activeStaff - onLeave,
        },
        departmentBreakdown,
        roleBreakdown,
      });
    } catch (error) {
      next(error);
    }
  },

  // GET /reports/payroll
  getPayrollReport: async (req, res, next) => {
    try {
      const { month, year } = req.query;
      const where = {};
      if (month && year) {
        where.pay_period = `${year}-${month.padStart(2, '0')}`;
      }
      applyBusinessScope(req, where);

      // Summary
      const [summary] = await sequelize.query(
        `SELECT
           COUNT(*) as totalRecords,
           COALESCE(SUM(basic_salary), 0) as totalBasic,
           COALESCE(SUM(allowances), 0) as totalAllowances,
           COALESCE(SUM(deductions), 0) as totalDeductions,
           COALESCE(SUM(net_salary), 0) as totalNetSalary
         FROM payroll_records
         WHERE (:hasPeriod = 0 OR pay_period = :payPeriod)
           AND (:businessId IS NULL OR business_id = :businessId)`,
        {
          replacements: {
            hasPeriod: (month && year) ? 1 : 0,
            payPeriod: (month && year) ? `${year}-${month.padStart(2, '0')}` : '',
            businessId: req.currentBusiness || null,
          },
          type: sequelize.QueryTypes.SELECT,
        }
      );

      // Status breakdown
      const statusBreakdown = await PayrollRecord.findAll({
        where,
        attributes: [
          'status',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
          [sequelize.fn('SUM', sequelize.col('net_salary')), 'total'],
        ],
        group: ['status'],
        raw: true,
      });

      // Department summary
      const departmentSummary = await PayrollRecord.findAll({
        where,
        attributes: [
          'department',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
          [sequelize.fn('SUM', sequelize.col('net_salary')), 'totalSalary'],
        ],
        group: ['department'],
        raw: true,
      });

      return ApiResponse.success(res, {
        summary: {
          totalRecords: parseInt(summary.totalRecords || 0, 10),
          totalBasic: parseFloat(summary.totalBasic || 0),
          totalAllowances: parseFloat(summary.totalAllowances || 0),
          totalDeductions: parseFloat(summary.totalDeductions || 0),
          totalNetSalary: parseFloat(summary.totalNetSalary || 0),
        },
        statusBreakdown,
        departmentSummary,
      });
    } catch (error) {
      next(error);
    }
  },
};
