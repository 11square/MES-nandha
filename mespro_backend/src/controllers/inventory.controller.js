const {
  RawMaterial, FinishedGood, InventoryTransaction, MaterialRequisition,
} = require('../models');
const createCrudController = require('./base.controller');
const ApiResponse = require('../utils/ApiResponse');
const { applyBusinessScope } = require('../middleware/businessScope');

module.exports = {
  // Raw Materials CRUD
  rawMaterials: createCrudController(RawMaterial, {
    resourceName: 'Raw Material',
    searchFields: ['name', 'supplier', 'location'],
    defaultOrder: [['name', 'ASC']],
  }),

  // Finished Goods CRUD
  finishedGoods: createCrudController(FinishedGood, {
    resourceName: 'Finished Good',
    searchFields: ['product'],
    defaultOrder: [['product', 'ASC']],
  }),

  // Inventory Transactions
  transactions: createCrudController(InventoryTransaction, {
    resourceName: 'Inventory Transaction',
    searchFields: ['material', 'reference'],
    defaultOrder: [['date', 'DESC']],
  }),

  // Material Requisitions
  requisitions: createCrudController(MaterialRequisition, {
    resourceName: 'Material Requisition',
    searchFields: ['material', 'requested_by', 'requisition_number'],
    defaultOrder: [['date', 'DESC']],
  }),

  // PATCH /inventory/requisitions/:id/status
  updateRequisitionStatus: async (req, res, next) => {
    try {
      const requisition = await MaterialRequisition.findOne({ where: { id: req.params.id, ...applyBusinessScope(req) } });
      if (!requisition) {
        return ApiResponse.notFound(res, 'Requisition not found');
      }

      await requisition.update({ status: req.body.status });
      return ApiResponse.success(res, requisition, 'Requisition status updated');
    } catch (error) {
      next(error);
    }
  },
};
