const express = require('express');
const router = express.Router();
const billingController = require('../controllers/billing.controller');

const { setCurrentBusiness } = require('../middleware/businessScope');

router.use(setCurrentBusiness);

router.get('/', billingController.getAll);
router.get('/clients', billingController.getBillingClients);
router.get('/stock-items', billingController.getStockItems);
router.get('/payments', billingController.getPayments);
router.get('/:id', billingController.getById);
router.post('/', billingController.create);
router.put('/:id', billingController.update);
router.delete('/:id', billingController.delete);
router.get('/:id/payments', billingController.getPayments);
router.post('/:id/payments', billingController.createPayment);

module.exports = router;
