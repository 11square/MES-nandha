const express = require('express');
const router = express.Router();
const salesController = require('../controllers/sales.controller');

const { setCurrentBusiness } = require('../middleware/businessScope');

router.use(setCurrentBusiness);

// Targets (must be before /:id)
router.get('/targets', salesController.getTargets);
router.post('/targets', salesController.createTarget);
router.put('/targets/:id', salesController.updateTarget);

// Followups (must be before /:id)
router.get('/followups', salesController.getFollowups);
router.post('/followups', salesController.createFollowup);
router.put('/followups/:id', salesController.updateFollowup);

// Sales CRUD
router.get('/', salesController.getAll);
router.get('/:id', salesController.getById);
router.post('/', salesController.create);
router.put('/:id', salesController.update);
router.delete('/:id', salesController.delete);

module.exports = router;
