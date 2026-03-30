const express = require('express');
const router = express.Router();
const payrollController = require('../controllers/payroll.controller');

const { setCurrentBusiness } = require('../middleware/businessScope');

router.use(setCurrentBusiness);

router.get('/', payrollController.getAll);
router.get('/:id', payrollController.getById);
router.post('/', payrollController.create);
router.post('/generate', payrollController.generate);
router.put('/:id', payrollController.update);
router.put('/:id/process', payrollController.process);
router.put('/:id/pay', payrollController.markPaid);
router.delete('/:id', payrollController.delete);

module.exports = router;
