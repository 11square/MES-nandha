const {
  Order, Client, Lead, ProductionOrder, Bill, Payment,
  Sale, StaffMember, AttendanceRecord, Dispatch,
  RawMaterial, FinishedGood, CreditOutstanding, StockItem,
  OrderProduct, LeadProduct, Transaction, Vendor, PurchaseOrder,
  sequelize,
} = require('../models');
const { Op, fn, col, literal } = require('sequelize');
const ApiResponse = require('../utils/ApiResponse');
const { applyBusinessScope } = require('../middleware/businessScope');

// Helper: resolve STOCK-<id> references to actual stock item names
async function resolveStockNames(productRefs, businessId) {
  const ids = [];
  for (const ref of productRefs) {
    const match = (ref || '').match(/^STOCK-(\d+)$/i);
    if (match) ids.push(parseInt(match[1], 10));
  }
  if (ids.length === 0) return {};
  const where = { id: { [Op.in]: ids } };
  if (businessId) where.business_id = businessId;
  const items = await StockItem.findAll({ where, attributes: ['id', 'name'] });
  const map = {};
  items.forEach(i => { map['STOCK-' + i.id] = i.name; });
  return map;
}

module.exports = {
  // GET /dashboard/summary
  getSummary: async (req, res, next) => {
    try {
      const [
        totalOrders, activeOrders, totalClients, totalLeads,
        activeProduction, pendingDispatches, totalStaff,
        stockAlerts, completedThisWeek,
      ] = await Promise.all([
        Order.count({ where: applyBusinessScope(req) }),
        Order.count({ where: applyBusinessScope(req, { status: { [Op.notIn]: ['delivered', 'cancelled'] } }) }),
        Client.count({ where: applyBusinessScope(req) }),
        Lead.count({ where: applyBusinessScope(req, { status: { [Op.notIn]: ['converted', 'lost'] } }) }),
        ProductionOrder.count({ where: applyBusinessScope(req, { status: { [Op.notIn]: ['completed', 'cancelled'] } }) }),
        Dispatch.count({ where: applyBusinessScope(req, { status: { [Op.notIn]: ['delivered', 'cancelled'] } }) }),
        StaffMember.count({ where: applyBusinessScope(req, { status: 'active' }) }),
        StockItem.count({
          where: applyBusinessScope(req, {
            current_stock: { [Op.lte]: col('reorder_level') },
            reorder_level: { [Op.gt]: 0 },
          }),
        }),
        Order.count({
          where: applyBusinessScope(req, {
            status: { [Op.in]: ['completed', 'delivered'] },
            updated_at: { [Op.gte]: new Date(new Date().setDate(new Date().getDate() - new Date().getDay())) },
          }),
        }),
      ]);

      const [revenueResult] = await sequelize.query(
        "SELECT COALESCE(SUM(grand_total), 0) as total FROM bills WHERE payment_status = 'paid' AND (:businessId IS NULL OR business_id = :businessId)",
        { replacements: { businessId: req.currentBusiness || null } }
      );
      const [outstandingResult] = await sequelize.query(
        "SELECT COALESCE(SUM(co.balance), 0) as total FROM credit_outstandings co INNER JOIN bills b ON co.bill_id = b.id WHERE co.balance > 0 AND (:businessId IS NULL OR b.business_id = :businessId)",
        { replacements: { businessId: req.currentBusiness || null } }
      );

      let avgProductionTime = 0;
      try {
        const [avgResult] = await sequelize.query(
          "SELECT COALESCE(AVG(DATEDIFF(updated_at, created_at)), 0) as avg_days FROM production_orders WHERE status = 'completed' AND (:businessId IS NULL OR business_id = :businessId)",
          { replacements: { businessId: req.currentBusiness || null } }
        );
        avgProductionTime = Math.round(parseFloat(avgResult[0]?.avg_days || 0));
      } catch (e) {}

      let productionEfficiency = 0;
      try {
        const totalProd = await ProductionOrder.count({ where: applyBusinessScope(req) });
        const completedProd = await ProductionOrder.count({ where: applyBusinessScope(req, { status: 'completed' }) });
        productionEfficiency = totalProd > 0 ? Math.round((completedProd / totalProd) * 100) : 0;
      } catch (e) {}

      return ApiResponse.success(res, {
        totalOrders, activeOrders, totalClients,
        activeLeads: totalLeads, activeProduction, pendingDispatches,
        totalStaff,
        totalRevenue: parseFloat(revenueResult[0]?.total || 0),
        totalOutstanding: parseFloat(outstandingResult[0]?.total || 0),
        stockAlerts, completedThisWeek, avgProductionTime, productionEfficiency,
      });
    } catch (error) {
      next(error);
    }
  },

  // GET /dashboard/recent-orders
  getRecentOrders: async (req, res, next) => {
    try {
      const orders = await Order.findAll({
        where: applyBusinessScope(req),
        include: [
          { model: Client, as: 'client', attributes: ['id', 'name'] },
          { model: OrderProduct, as: 'products', attributes: ['id', 'product', 'category', 'subcategory', 'quantity', 'unit'] },
        ],
        order: [['created_at', 'DESC']],
        limit: 10,
      });

      // Collect all STOCK-<id> references to resolve names
      const allRefs = [];
      orders.forEach(o => {
        const plain = o.toJSON();
        (plain.products || []).forEach(p => { if (p.product) allRefs.push(p.product); });
      });
      const stockMap = await resolveStockNames(allRefs, req.currentBusiness);

      const mapped = orders.map(o => {
        const plain = o.toJSON();
        const prods = plain.products || [];
        const productNames = prods.map(p => {
          const ref = p.product;
          return stockMap[ref] || p.subcategory || p.category || ref;
        }).filter(Boolean);
        plain.product = plain.product || productNames.join(', ') || null;
        return plain;
      });

      return ApiResponse.success(res, mapped);
    } catch (error) {
      next(error);
    }
  },

  // GET /dashboard/low-stock
  getLowStock: async (req, res, next) => {
    try {
      const items = await StockItem.findAll({
        where: applyBusinessScope(req, {
          [Op.or]: [
            { status: { [Op.in]: ['Low Stock', 'Critical', 'Out of Stock'] } },
            sequelize.where(col('current_stock'), Op.lte, col('reorder_level')),
          ],
        }),
        order: [['current_stock', 'ASC']],
        limit: 10,
      });

      const mapped = items.map(item => {
        const current = parseFloat(item.current_stock) || 0;
        const reorder = parseFloat(item.reorder_level) || 1;
        const percentage = Math.min(Math.round((current / reorder) * 100), 100);
        return {
          material: item.name,
          current,
          reorder,
          status: current === 0 ? 'critical' : current <= reorder * 0.5 ? 'critical' : 'low',
          percentage,
        };
      });

      return ApiResponse.success(res, mapped);
    } catch (error) {
      next(error);
    }
  },

  // GET /dashboard/pending-leads
  getPendingLeads: async (req, res, next) => {
    try {
      const leads = await Lead.findAll({
        where: applyBusinessScope(req, {
          status: { [Op.notIn]: ['converted', 'lost'] },
        }),
        include: [
          { model: LeadProduct, as: 'products', attributes: ['id', 'product', 'category', 'subcategory', 'quantity', 'unit'] },
        ],
        order: [['created_at', 'DESC']],
        limit: 6,
      });

      // Collect all STOCK-<id> references to resolve names
      const allRefs = [];
      leads.forEach(l => {
        const plain = l.toJSON();
        (plain.products || []).forEach(p => { if (p.product) allRefs.push(p.product); });
      });
      const stockMap = await resolveStockNames(allRefs, req.currentBusiness);

      const mapped = leads.map(lead => {
        const plain = lead.toJSON();
        const prods = plain.products || [];
        const productNames = prods.map(p => {
          const ref = p.product;
          return stockMap[ref] || p.subcategory || p.category || ref;
        }).filter(Boolean);
        return {
          id: plain.lead_number || ('LEAD-' + String(plain.id).padStart(3, '0')),
          source: plain.source || 'Unknown',
          customer: plain.customer || plain.contact || 'N/A',
          product: plain.product || productNames.join(', ') || plain.category || '-',
          status: plain.status || 'New',
        };
      });

      return ApiResponse.success(res, mapped);
    } catch (error) {
      next(error);
    }
  },

  // GET /dashboard/production-status
  getProductionStatus: async (req, res, next) => {
    try {
      const productionOrders = await ProductionOrder.findAll({
        where: applyBusinessScope(req, { status: { [Op.notIn]: ['completed', 'cancelled'] } }),
        include: [{ model: Order, as: 'order', attributes: ['id', 'order_number'] }],
        order: [['updated_at', 'DESC']],
        limit: 10,
      });
      return ApiResponse.success(res, productionOrders);
    } catch (error) {
      next(error);
    }
  },

  // GET /dashboard/attendance-today
  getAttendanceToday: async (req, res, next) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const todayWhere = applyBusinessScope(req, { date: today });

      const [summaryRows, records] = await Promise.all([
        AttendanceRecord.findAll({
          where: todayWhere,
          attributes: ['present', [fn('COUNT', col('id')), 'count']],
          group: ['present'],
          raw: true,
        }),
        AttendanceRecord.findAll({
          where: todayWhere,
          include: [{ model: StaffMember, as: 'staff', attributes: ['id', 'employee_id', 'name', 'role', 'department'] }],
          limit: 100,
        }),
      ]);

      let total = 0, presentCount = 0, absentCount = 0;
      for (const row of summaryRows) {
        const cnt = parseInt(row.count, 10);
        total += cnt;
        if (row.present === 1 || row.present === true) presentCount = cnt;
        else absentCount = cnt;
      }

      return ApiResponse.success(res, { records, summary: { total, present: presentCount, absent: absentCount } });
    } catch (error) {
      next(error);
    }
  },

  // GET /dashboard/revenue-trend — Monthly revenue for last 6 months
  getRevenueTrend: async (req, res, next) => {
    try {
      const businessId = req.currentBusiness || null;
      const [rows] = await sequelize.query(
        `SELECT 
          DATE_FORMAT(date, '%Y-%m') as month,
          COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN grand_total ELSE paid_amount END), 0) as revenue,
          COALESCE(SUM(grand_total), 0) as billed
        FROM bills
        WHERE date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
          AND (:businessId IS NULL OR business_id = :businessId)
        GROUP BY DATE_FORMAT(date, '%Y-%m')
        ORDER BY month ASC`,
        { replacements: { businessId } }
      );
      // Fill in missing months
      const result = [];
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = d.toISOString().slice(0, 7);
        const label = d.toLocaleString('en', { month: 'short' });
        const found = rows.find(r => r.month === key);
        result.push({
          month: label,
          revenue: parseFloat(found?.revenue || 0),
          billed: parseFloat(found?.billed || 0),
        });
      }
      return ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  },

  // GET /dashboard/order-stats — Order status distribution
  getOrderStats: async (req, res, next) => {
    try {
      const orders = await Order.findAll({
        where: applyBusinessScope(req),
        attributes: ['status', [fn('COUNT', col('id')), 'count']],
        group: ['status'],
        raw: true,
      });
      const colorMap = {
        'Pending': '#f59e0b',
        'Confirmed': '#3b82f6',
        'In Production': '#8b5cf6',
        'Ready': '#10b981',
        'Dispatched': '#06b6d4',
        'Delivered': '#22c55e',
        'Bill': '#6366f1',
        'Cancelled': '#ef4444',
      };
      const mapped = orders.map(o => ({
        name: o.status || 'Unknown',
        value: parseInt(o.count, 10),
        color: colorMap[o.status] || '#94a3b8',
      }));
      return ApiResponse.success(res, mapped);
    } catch (error) {
      next(error);
    }
  },

  // GET /dashboard/monthly-orders — Order counts per month (last 6 months)
  getMonthlyOrders: async (req, res, next) => {
    try {
      const businessId = req.currentBusiness || null;
      const [rows] = await sequelize.query(
        `SELECT 
          DATE_FORMAT(created_at, '%Y-%m') as month,
          COUNT(*) as total,
          SUM(CASE WHEN status IN ('Delivered','completed') THEN 1 ELSE 0 END) as completed,
          SUM(CASE WHEN status = 'Cancelled' THEN 1 ELSE 0 END) as cancelled
        FROM orders
        WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
          AND (:businessId IS NULL OR business_id = :businessId)
        GROUP BY DATE_FORMAT(created_at, '%Y-%m')
        ORDER BY month ASC`,
        { replacements: { businessId } }
      );
      const result = [];
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = d.toISOString().slice(0, 7);
        const label = d.toLocaleString('en', { month: 'short' });
        const found = rows.find(r => r.month === key);
        result.push({
          month: label,
          total: parseInt(found?.total || 0),
          completed: parseInt(found?.completed || 0),
          cancelled: parseInt(found?.cancelled || 0),
        });
      }
      return ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  },

  // GET /dashboard/payment-overview — Payment status breakdown
  getPaymentOverview: async (req, res, next) => {
    try {
      const businessId = req.currentBusiness || null;
      const [rows] = await sequelize.query(
        `SELECT 
          payment_status as status,
          COUNT(*) as count,
          COALESCE(SUM(grand_total), 0) as amount
        FROM bills
        WHERE (:businessId IS NULL OR business_id = :businessId)
        GROUP BY payment_status`,
        { replacements: { businessId } }
      );
      const colorMap = {
        'paid': '#22c55e',
        'partial': '#f59e0b',
        'pending': '#3b82f6',
        'overdue': '#ef4444',
      };
      const mapped = rows.map(r => ({
        name: (r.status || 'unknown').charAt(0).toUpperCase() + (r.status || 'unknown').slice(1),
        value: parseFloat(r.amount || 0),
        count: parseInt(r.count, 10),
        color: colorMap[r.status] || '#94a3b8',
      }));
      return ApiResponse.success(res, mapped);
    } catch (error) {
      next(error);
    }
  },

  // GET /dashboard/top-clients — Top 5 clients by revenue
  getTopClients: async (req, res, next) => {
    try {
      const businessId = req.currentBusiness || null;
      const [rows] = await sequelize.query(
        `SELECT 
          c.name,
          c.total_orders,
          COALESCE(SUM(b.grand_total), 0) as total_revenue,
          COALESCE(SUM(CASE WHEN b.payment_status != 'paid' THEN b.grand_total - b.paid_amount ELSE 0 END), 0) as outstanding
        FROM clients c
        LEFT JOIN bills b ON b.client_id = c.id
        WHERE (:businessId IS NULL OR c.business_id = :businessId)
        GROUP BY c.id, c.name, c.total_orders
        ORDER BY total_revenue DESC
        LIMIT 5`,
        { replacements: { businessId } }
      );
      return ApiResponse.success(res, rows.map(r => ({
        name: r.name,
        orders: parseInt(r.total_orders || 0),
        revenue: parseFloat(r.total_revenue || 0),
        outstanding: parseFloat(r.outstanding || 0),
      })));
    } catch (error) {
      next(error);
    }
  },
};
