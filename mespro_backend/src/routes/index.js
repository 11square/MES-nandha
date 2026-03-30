const express = require('express');
const router = express.Router();
const { setCurrentBusiness } = require('../middleware/businessScope');
const { authenticate } = require('../middleware/auth');
const { requireModule } = require('../middleware/requireModule');

// Import all route modules
const authRoutes = require('./auth.routes');
const usersRoutes = require('./users.routes');
const clientsRoutes = require('./clients.routes');
const leadsRoutes = require('./leads.routes');
const ordersRoutes = require('./orders.routes');
const productionRoutes = require('./production.routes');
const productsRoutes = require('./products.routes');
const vendorsRoutes = require('./vendors.routes');
const purchaseOrdersRoutes = require('./purchaseOrders.routes');
const inventoryRoutes = require('./inventory.routes');
const stockRoutes = require('./stock.routes');
const billingRoutes = require('./billing.routes');
const dispatchRoutes = require('./dispatch.routes');
const financeRoutes = require('./finance.routes');
const staffRoutes = require('./staff.routes');
const attendanceRoutes = require('./attendance.routes');
const payrollRoutes = require('./payroll.routes');
const salesRoutes = require('./sales.routes');
const dashboardRoutes = require('./dashboard.routes');
const reportsRoutes = require('./reports.routes');
const documentsRoutes = require('./documents.routes');
const superadminRoutes = require('./superadmin.routes');

// Mount routes
// Auth — no business scoping needed
router.use('/auth', authRoutes);

// SuperAdmin — has its own scoping (manages all businesses)
router.use('/superadmin', superadminRoutes);

// All other routes — authenticate + requireModule + business scoping
router.use('/users', authenticate, requireModule('users'), usersRoutes);
router.use('/clients', authenticate, requireModule('clients'), clientsRoutes);
router.use('/leads', authenticate, requireModule('leads'), leadsRoutes);
router.use('/orders', authenticate, requireModule('orders'), ordersRoutes);
router.use('/production', authenticate, requireModule('production'), productionRoutes);
router.use('/products', authenticate, requireModule('products'), productsRoutes);
router.use('/vendors', authenticate, requireModule('vendors'), vendorsRoutes);
router.use('/purchase-orders', authenticate, requireModule('purchase_orders'), purchaseOrdersRoutes);
router.use('/inventory', authenticate, requireModule('inventory'), inventoryRoutes);
router.use('/stock', authenticate, requireModule('stock'), stockRoutes);
router.use('/billing', authenticate, requireModule('billing'), billingRoutes);
router.use('/dispatch', authenticate, requireModule('dispatch'), dispatchRoutes);
router.use('/finance', authenticate, requireModule('finance'), financeRoutes);
router.use('/staff', authenticate, requireModule('staff'), staffRoutes);
router.use('/attendance', authenticate, requireModule('attendance'), attendanceRoutes);
router.use('/payroll', authenticate, requireModule('payroll'), payrollRoutes);
router.use('/sales', authenticate, requireModule('sales'), salesRoutes);
router.use('/dashboard', authenticate, requireModule('dashboard'), dashboardRoutes);
router.use('/reports', authenticate, requireModule('reports'), reportsRoutes);
router.use('/documents', authenticate, documentsRoutes);

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

module.exports = router;
