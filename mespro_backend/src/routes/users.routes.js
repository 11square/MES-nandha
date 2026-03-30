const express = require('express');
const router = express.Router();
const usersController = require('../controllers/users.controller');
const { authorize } = require('../middleware/auth');
const { setCurrentBusiness } = require('../middleware/businessScope');

router.use(setCurrentBusiness);

router.get('/', usersController.getAll);
router.get('/roles', usersController.getRoles);
router.post('/roles', authorize('admin'), usersController.createRole);
router.get('/:id', usersController.getById);
router.post('/', authorize('admin'), usersController.create);
router.put('/:id', authorize('admin'), usersController.update);
router.delete('/:id', authorize('admin'), usersController.delete);

module.exports = router;
