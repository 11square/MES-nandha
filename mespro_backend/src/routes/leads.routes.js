const express = require('express');
const router = express.Router();
const leadsController = require('../controllers/leads.controller');

const { setCurrentBusiness } = require('../middleware/businessScope');

router.use(setCurrentBusiness);

router.get('/', leadsController.getAll);
router.get('/:id', leadsController.getById);
router.post('/', leadsController.create);
router.put('/:id', leadsController.update);
router.delete('/:id', leadsController.delete);
router.post('/:id/followups', leadsController.addFollowUp);
router.put('/:id/followups/:followUpId', leadsController.updateFollowUp);
router.delete('/:id/followups/:followUpId', leadsController.deleteFollowUp);
router.post('/:id/convert', leadsController.convertToOrder);

module.exports = router;
