const express = require('express');
const multer = require('multer');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const controller = require('../controllers/superadmin.controller');

// Multer with memory storage for logo uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  },
});

// All routes require authentication + superadmin role
router.use(authenticate);
router.use(authorize('superadmin'));

// ─── Feature settings (master list) ──────────────────────────────────────────
router.get('/feature-settings', controller.getFeatureSettings);

// ─── Business CRUD ───────────────────────────────────────────────────────────
router.get('/businesses', controller.getBusinesses);
router.get('/businesses/:id', controller.getBusinessById);
router.post('/businesses', upload.single('logo'), controller.createBusiness);
router.put('/businesses/:id', upload.single('logo'), controller.updateBusiness);
router.delete('/businesses/:id', controller.deleteBusiness);

// ─── Business feature values ─────────────────────────────────────────────────
router.get('/businesses/:businessId/features', controller.getBusinessFeatures);
router.put('/businesses/:businessId/features', controller.saveBusinessFeatures);

// ─── Business users CRUD ─────────────────────────────────────────────────────
router.get('/business-users', controller.getBusinessUsers);
router.get('/business-users/:id', controller.getBusinessUserById);
router.post('/business-users', controller.createBusinessUser);
router.put('/business-users/:id', controller.updateBusinessUser);
router.delete('/business-users/:id', controller.deleteBusinessUser);

module.exports = router;
