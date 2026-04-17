const express = require('express');
const router = express.Router();
const vendorsController = require('../controllers/vendors.controller');

const { setCurrentBusiness } = require('../middleware/businessScope');

router.use(setCurrentBusiness);

router.get('/followups', vendorsController.getFollowups);
router.get('/', vendorsController.getAll);
router.get('/:id', vendorsController.getById);
router.post('/', vendorsController.create);
router.put('/:id', vendorsController.update);
router.delete('/:id', vendorsController.delete);
router.get('/:id/purchases', vendorsController.getVendorPurchases);
router.get('/:id/transactions', vendorsController.getVendorTransactions);
router.get('/:id/dispatches', vendorsController.getVendorDispatches);
router.get('/:id/followups', vendorsController.getFollowups);
router.post('/:id/followups', vendorsController.createFollowup);

module.exports = router;
