const express = require('express');
const router = express.Router();
const ordersController = require('../controllers/orders.controller');

const { setCurrentBusiness } = require('../middleware/businessScope');

router.use(setCurrentBusiness);

router.get('/', ordersController.getAll);
router.get('/:id', ordersController.getById);
router.post('/', ordersController.create);
router.put('/:id', ordersController.update);
router.delete('/:id', ordersController.delete);
router.put('/:id/status', ordersController.updateStatus);

module.exports = router;
