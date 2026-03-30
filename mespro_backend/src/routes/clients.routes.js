const express = require('express');
const router = express.Router();
const clientsController = require('../controllers/clients.controller');

const { setCurrentBusiness } = require('../middleware/businessScope');

router.use(setCurrentBusiness);

router.get('/outstandings', clientsController.getOutstandings);
router.get('/followups', clientsController.getFollowups);
router.get('/', clientsController.getAll);
router.get('/:id', clientsController.getById);
router.post('/', clientsController.create);
router.put('/:id', clientsController.update);
router.delete('/:id', clientsController.delete);
router.get('/:id/payments', clientsController.getClientPayments);
router.get('/:id/bills', clientsController.getClientBills);
router.get('/:id/sales', clientsController.getClientSales);
router.get('/:id/outstandings', clientsController.getOutstandings);
router.get('/:id/followups', clientsController.getFollowups);
router.post('/:id/followups', clientsController.createFollowup);

module.exports = router;
