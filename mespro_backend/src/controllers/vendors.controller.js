const { Vendor, PurchaseOrder } = require('../models');
const createCrudController = require('./base.controller');

module.exports = createCrudController(Vendor, {
  resourceName: 'Vendor',
  searchFields: ['name', 'contact_person', 'email', 'phone', 'category'],
  defaultOrder: [['created_at', 'DESC']],
});
