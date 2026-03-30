const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendance.controller');

const { setCurrentBusiness } = require('../middleware/businessScope');

router.use(setCurrentBusiness);

router.get('/', attendanceController.getAll);
router.get('/workers', attendanceController.getWorkers);
router.get('/summary', attendanceController.getSummary);
router.get('/:id', attendanceController.getById);
router.post('/', attendanceController.create);
router.post('/bulk', attendanceController.bulkCreate);
router.put('/:id', attendanceController.update);
router.delete('/:id', attendanceController.delete);

module.exports = router;
