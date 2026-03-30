const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const modulesController = require('../controllers/modules.controller');
const { authenticate } = require('../middleware/auth');

router.post('/login', authController.login);
router.post('/register', authController.register);
router.get('/profile', authenticate, authController.getProfile);
router.get('/modules', authenticate, modulesController.getModules);
router.put('/change-password', authenticate, authController.changePassword);

module.exports = router;
