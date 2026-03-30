const express = require('express');
const router = express.Router();
const reportsController = require('../controllers/reports.controller');

const { setCurrentBusiness } = require('../middleware/businessScope');

router.use(setCurrentBusiness);

// Existing routes
router.get('/sales', reportsController.getSalesReport);
router.get('/production', reportsController.getProductionReport);
router.get('/financial', reportsController.getFinancialReport);
router.get('/attendance', reportsController.getAttendanceReport);
router.get('/inventory', reportsController.getInventoryReport);
router.get('/dispatch', reportsController.getDispatchReport);

// New routes
router.get('/billing', reportsController.getBillingReport);
router.get('/orders', reportsController.getOrdersReport);
router.get('/stock', reportsController.getStockReport);
router.get('/purchase-orders', reportsController.getPurchaseOrderReport);
router.get('/vendors', reportsController.getVendorReport);
router.get('/staff', reportsController.getStaffReport);
router.get('/payroll', reportsController.getPayrollReport);

module.exports = router;
