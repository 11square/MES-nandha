const { PurchaseOrder, PurchaseOrderItem, Vendor } = require('../models');
const createCrudController = require('./base.controller');
const ApiResponse = require('../utils/ApiResponse');
const { sequelize } = require('../models');
const { applyBusinessScope } = require('../middleware/businessScope');

const baseController = createCrudController(PurchaseOrder, {
  resourceName: 'Purchase Order',
  include: [{ model: PurchaseOrderItem, as: 'items' }],
  searchFields: ['po_number', 'vendor_name'],
  defaultOrder: [['date', 'DESC']],
});

module.exports = {
  ...baseController,

  // Override create to handle items
  create: async (req, res, next) => {
    const t = await sequelize.transaction();
    try {
      const { items, ...poData } = req.body;

      // Auto-generate PO number
      const lastPO = await PurchaseOrder.findOne({
        where: applyBusinessScope(req),
        order: [['id', 'DESC']],
        transaction: t,
      });
      const nextNum = lastPO ? lastPO.id + 1 : 1;
      poData.po_number = poData.po_number || `PO-${new Date().getFullYear()}-${String(nextNum).padStart(3, '0')}`;
      poData.business_id = req.currentBusiness;
      const po = await PurchaseOrder.create(poData, { transaction: t });

      if (items && items.length > 0) {
        await PurchaseOrderItem.bulkCreate(
          items.map((item) => ({ ...item, purchase_order_id: po.id, business_id: req.currentBusiness })),
          { transaction: t }
        );
      }

      await t.commit();

      const created = await PurchaseOrder.findByPk(po.id, {
        include: [{ model: PurchaseOrderItem, as: 'items' }],
      });

      return ApiResponse.created(res, created, 'Purchase Order created');
    } catch (error) {
      await t.rollback();
      next(error);
    }
  },

  // Override update to handle items
  update: async (req, res, next) => {
    const t = await sequelize.transaction();
    try {
      const where = { id: req.params.id, ...applyBusinessScope(req) };
      const record = await PurchaseOrder.findOne({ where, transaction: t });

      if (!record) {
        await t.rollback();
        return ApiResponse.notFound(res, 'Purchase Order not found');
      }

      const { items, ...poData } = req.body;

      // Update the parent purchase order fields
      await record.update(poData, { transaction: t });

      // Update items: delete old items and re-create with new data
      if (items && Array.isArray(items) && items.length > 0) {
        await PurchaseOrderItem.destroy({
          where: { purchase_order_id: record.id },
          transaction: t,
        });
        await PurchaseOrderItem.bulkCreate(
          items.map((item) => ({
            name: item.name,
            quantity: item.quantity,
            unit: item.unit || 'pcs',
            rate: item.rate,
            amount: item.amount,
            purchase_order_id: record.id,
            business_id: req.currentBusiness,
          })),
          { transaction: t }
        );
      }

      await t.commit();

      const updated = await PurchaseOrder.findByPk(record.id, {
        include: [{ model: PurchaseOrderItem, as: 'items' }],
      });

      return ApiResponse.success(res, updated, 'Purchase Order updated successfully');
    } catch (error) {
      await t.rollback();
      next(error);
    }
  },

  // PATCH /:id/status
  updateStatus: async (req, res, next) => {
    try {
      const po = await PurchaseOrder.findOne({ where: { id: req.params.id, ...applyBusinessScope(req) } });
      if (!po) {
        return ApiResponse.notFound(res, 'Purchase Order not found');
      }

      await po.update({ status: req.body.status });
      return ApiResponse.success(res, po, 'Status updated');
    } catch (error) {
      next(error);
    }
  },
};
