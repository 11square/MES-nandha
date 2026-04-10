const { PurchaseOrder, PurchaseOrderItem, Vendor, StockItem } = require('../models');
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
      const { items, add_to_stock, addedItems, quantity, unit_price, ...poData } = req.body;

      // Sanitize date fields — empty strings become null
      if (!poData.expected_delivery) poData.expected_delivery = null;

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
          items.map(({ id, ...item }) => ({ ...item, purchase_order_id: po.id, business_id: req.currentBusiness })),
          { transaction: t }
        );
      }

      // Always add/update items in stock inventory
      if (items && items.length > 0) {
        for (const item of items) {
          const itemName = (item.name || '').trim();
          if (!itemName) continue;

          // Check if stock item with same name already exists
          const existing = await StockItem.findOne({
            where: { name: itemName, business_id: req.currentBusiness },
            transaction: t,
          });

          if (existing) {
            // Update existing stock: increase current_stock and update prices
            const newStock = Number(existing.current_stock || 0) + Number(item.quantity || 0);
            const updateData = { current_stock: newStock, last_restocked: new Date() };
            if (item.rate) updateData.buying_price = item.rate;
            if (poData.vendor_name) updateData.supplier = poData.vendor_name;
            // Update status based on new stock level
            if (newStock <= 0) updateData.status = 'Out of Stock';
            else if (newStock <= Number(existing.reorder_level || 10)) updateData.status = 'Low Stock';
            else updateData.status = 'In Stock';
            await existing.update(updateData, { transaction: t });
          } else {
            // Create new stock item
            const sku = `PO-${po.id}-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
            await StockItem.create({
              name: itemName,
              category: item.category || 'Uncategorised',
              subcategory: item.subcategory || 'General',
              sku,
              current_stock: Number(item.quantity || 0),
              reorder_level: 10,
              unit: item.unit || 'pcs',
              unit_price: Number(item.rate || 0),
              buying_price: Number(item.rate || 0),
              selling_price: Number(item.rate || 0),
              supplier: poData.vendor_name || '',
              last_restocked: new Date(),
              status: Number(item.quantity || 0) > 0 ? 'In Stock' : 'Out of Stock',
              business_id: req.currentBusiness,
            }, { transaction: t });
          }
        }
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

      const { items, add_to_stock, addedItems, quantity, unit_price, ...poData } = req.body;

      // Sanitize date fields
      if (!poData.expected_delivery) poData.expected_delivery = null;

      // Update the parent purchase order fields
      await record.update(poData, { transaction: t });

      // Update items: delete old items and re-create with new data
      if (items && Array.isArray(items) && items.length > 0) {
        await PurchaseOrderItem.destroy({
          where: { purchase_order_id: record.id },
          transaction: t,
        });
        await PurchaseOrderItem.bulkCreate(
          items.map(({ id, ...item }) => ({
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

        // Always add/update items in stock inventory
        for (const item of items) {
          const itemName = (item.name || '').trim();
          if (!itemName) continue;

          const existing = await StockItem.findOne({
            where: { name: itemName, business_id: req.currentBusiness },
            transaction: t,
          });

          if (existing) {
            const updateData = { last_restocked: new Date() };
            if (item.rate) updateData.buying_price = item.rate;
            if (poData.vendor_name) updateData.supplier = poData.vendor_name;
            await existing.update(updateData, { transaction: t });
          } else {
            const sku = `PO-${record.id}-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
            await StockItem.create({
              name: itemName,
              category: item.category || 'Uncategorised',
              subcategory: item.subcategory || 'General',
              sku,
              current_stock: Number(item.quantity || 0),
              reorder_level: 10,
              unit: item.unit || 'pcs',
              unit_price: Number(item.rate || 0),
              buying_price: Number(item.rate || 0),
              selling_price: Number(item.rate || 0),
              supplier: poData.vendor_name || '',
              last_restocked: new Date(),
              status: Number(item.quantity || 0) > 0 ? 'In Stock' : 'Out of Stock',
              business_id: req.currentBusiness,
            }, { transaction: t });
          }
        }
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
