const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settings.controller');

const { setCurrentBusiness } = require('../middleware/businessScope');

router.use(setCurrentBusiness);

router.get('/', settingsController.getAll);
router.get('/company', settingsController.getCompany);
router.put('/company', settingsController.updateCompany);
router.get('/tax', settingsController.getTax);
router.put('/tax', settingsController.updateTax);
router.get('/invoice', settingsController.getInvoice);
router.put('/invoice', settingsController.updateInvoice);
router.get('/notification', settingsController.getNotification);
router.put('/notification', settingsController.updateNotification);
router.get('/system', settingsController.getSystem);
router.put('/system', settingsController.updateSystem);
router.get('/security', settingsController.getSecurity);
router.put('/security', settingsController.updateSecurity);

module.exports = router;
