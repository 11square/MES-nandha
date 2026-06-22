const express = require('express');
const router = express.Router();
const ewayBillController = require('../controllers/ewayBill.controller');
const { setCurrentBusiness } = require('../middleware/businessScope');

router.use(setCurrentBusiness);

// Integration readiness (safe to call even when not configured)
router.get('/status', ewayBillController.status);

// Stored e-Way Bills
router.get('/', ewayBillController.list);
router.get('/:id', ewayBillController.getById);

// Actions
router.post('/generate/:billId', ewayBillController.generate);
router.post('/:id/cancel', ewayBillController.cancel);

module.exports = router;
