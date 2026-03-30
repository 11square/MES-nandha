const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventory.controller');

const { setCurrentBusiness } = require('../middleware/businessScope');

router.use(setCurrentBusiness);

// Raw Materials
router.get('/raw-materials', inventoryController.rawMaterials.getAll);
router.get('/raw-materials/:id', inventoryController.rawMaterials.getById);
router.post('/raw-materials', inventoryController.rawMaterials.create);
router.put('/raw-materials/:id', inventoryController.rawMaterials.update);
router.delete('/raw-materials/:id', inventoryController.rawMaterials.delete);

// Finished Goods
router.get('/finished-goods', inventoryController.finishedGoods.getAll);
router.get('/finished-goods/:id', inventoryController.finishedGoods.getById);
router.post('/finished-goods', inventoryController.finishedGoods.create);
router.put('/finished-goods/:id', inventoryController.finishedGoods.update);
router.delete('/finished-goods/:id', inventoryController.finishedGoods.delete);

// Transactions
router.get('/transactions', inventoryController.transactions.getAll);
router.get('/transactions/:id', inventoryController.transactions.getById);
router.post('/transactions', inventoryController.transactions.create);

// Requisitions
router.get('/requisitions', inventoryController.requisitions.getAll);
router.get('/requisitions/:id', inventoryController.requisitions.getById);
router.post('/requisitions', inventoryController.requisitions.create);
router.put('/requisitions/:id/status', inventoryController.updateRequisitionStatus);

module.exports = router;
