const express = require('express');
const router = express.Router();
const financeController = require('../controllers/finance.controller');

const { setCurrentBusiness } = require('../middleware/businessScope');

router.use(setCurrentBusiness);

router.get('/transactions', financeController.getAll);
router.get('/transactions/:id', financeController.getById);
router.post('/transactions', financeController.create);
router.put('/transactions/:id', financeController.update);
router.delete('/transactions/:id', financeController.delete);
router.get('/receipts', financeController.getReceipts);
router.post('/receipts', financeController.createReceipt);
router.get('/summary', financeController.getSummary);

module.exports = router;
