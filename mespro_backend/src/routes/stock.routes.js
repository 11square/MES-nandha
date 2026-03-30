const express = require('express');
const router = express.Router();
const stockController = require('../controllers/stock.controller');

const { setCurrentBusiness } = require('../middleware/businessScope');

router.use(setCurrentBusiness);

router.get('/', stockController.getAll);
router.get('/:id', stockController.getById);
router.post('/', stockController.create);
router.put('/:id', stockController.update);
router.delete('/:id', stockController.delete);

module.exports = router;
