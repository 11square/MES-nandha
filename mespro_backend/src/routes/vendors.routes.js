const express = require('express');
const router = express.Router();
const vendorsController = require('../controllers/vendors.controller');

const { setCurrentBusiness } = require('../middleware/businessScope');

router.use(setCurrentBusiness);

router.get('/', vendorsController.getAll);
router.get('/:id', vendorsController.getById);
router.post('/', vendorsController.create);
router.put('/:id', vendorsController.update);
router.delete('/:id', vendorsController.delete);

module.exports = router;
