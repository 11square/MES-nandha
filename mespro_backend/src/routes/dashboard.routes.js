const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller');

const { setCurrentBusiness } = require('../middleware/businessScope');

router.use(setCurrentBusiness);

router.get('/summary', dashboardController.getSummary);
router.get('/recent-orders', dashboardController.getRecentOrders);
router.get('/production-status', dashboardController.getProductionStatus);
router.get('/attendance-today', dashboardController.getAttendanceToday);
router.get('/low-stock', dashboardController.getLowStock);
router.get('/pending-leads', dashboardController.getPendingLeads);

module.exports = router;
