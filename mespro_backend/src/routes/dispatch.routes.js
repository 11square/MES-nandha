const express = require('express');
const router = express.Router();
const dispatchController = require('../controllers/dispatch.controller');

const { setCurrentBusiness } = require('../middleware/businessScope');

router.use(setCurrentBusiness);

router.get('/', dispatchController.getAll);
router.get('/:id', dispatchController.getById);
router.post('/', dispatchController.create);
router.put('/:id', dispatchController.update);
router.delete('/:id', dispatchController.delete);
router.put('/:id/status', dispatchController.updateStatus);

module.exports = router;
