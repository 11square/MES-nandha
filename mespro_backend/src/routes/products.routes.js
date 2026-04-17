const express = require('express');
const router = express.Router();
const productsController = require('../controllers/products.controller');
const categoriesController = require('../controllers/categories.controller');

const { setCurrentBusiness } = require('../middleware/businessScope');

router.use(setCurrentBusiness);

// Category routes (must be before /:id to avoid conflict)
router.get('/categories', categoriesController.getAll);
router.post('/categories', categoriesController.create);
router.post('/categories/bulk-subcategories', categoriesController.bulkCreateSubcategories);
router.put('/categories/:id', categoriesController.update);
router.delete('/categories/:id', categoriesController.remove);

router.get('/', productsController.getAll);
router.get('/:id', productsController.getById);
router.post('/', productsController.create);
router.put('/:id', productsController.update);
router.delete('/:id', productsController.delete);

module.exports = router;
