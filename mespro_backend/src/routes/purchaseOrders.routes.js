const express = require('express');
const router = express.Router();
const purchaseOrdersController = require('../controllers/purchaseOrders.controller');

const { setCurrentBusiness } = require('../middleware/businessScope');

router.use(setCurrentBusiness);

router.get('/', purchaseOrdersController.getAll);
router.get('/:id', purchaseOrdersController.getById);
router.post('/', purchaseOrdersController.create);
router.put('/:id', purchaseOrdersController.update);
router.delete('/:id', purchaseOrdersController.delete);
router.put('/:id/status', purchaseOrdersController.updateStatus);

module.exports = router;
