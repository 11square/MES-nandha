const { StockItem } = require('../models');
const createCrudController = require('./base.controller');

module.exports = createCrudController(StockItem, {
  resourceName: 'Stock Item',
  searchFields: ['name', 'sku', 'category', 'supplier'],
  defaultOrder: [['name', 'ASC']],
});
