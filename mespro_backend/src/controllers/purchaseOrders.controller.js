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
      const { items, add_to_stock: _ignoredAddToStock, addedItems, quantity, unit_price, ...poData } = req.body;

      // Resolve vendor_id from vendor_name when needed so outstanding can be tracked reliably.
      let vendorRecord = null;
      if (poData.vendor_id) {
        vendorRecord = await Vendor.findOne({
          where: applyBusinessScope(req, { id: poData.vendor_id }),
          transaction: t,
        });
      }
      if (!vendorRecord && poData.vendor_name) {
        vendorRecord = await Vendor.findOne({
          where: applyBusinessScope(req, { name: poData.vendor_name }),
          transaction: t,
        });
      }
      // Auto-create vendor if a name was supplied but no matching vendor exists.
      if (!vendorRecord && poData.vendor_name && String(poData.vendor_name).trim()) {
        vendorRecord = await Vendor.create({
          name: String(poData.vendor_name).trim(),
          contact_person: poData.vendor_contact_person || null,
          email: poData.vendor_email || null,
          phone: poData.vendor_contact || null,
          address: poData.vendor_address || null,
          gst_number: poData.vendor_gst || null,
          status: 'Active',
          business_id: req.currentBusiness,
        }, { transaction: t });
      }
      if (vendorRecord && !poData.vendor_id) {
        poData.vendor_id = vendorRecord.id;
      }

      // Sanitize date fields — empty strings default to PO date
      if (!poData.expected_delivery) poData.expected_delivery = poData.date || null;

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

      // New PO increases payable amount to the vendor, so add to existing outstanding.
      const poAmount = parseFloat(poData.total_amount || 0);
      if (vendorRecord && poAmount > 0) {
        const newOutstanding = parseFloat(vendorRecord.outstanding_amount || 0) + poAmount;
        const newTotalAmount = parseFloat(vendorRecord.total_amount || 0) + poAmount;
        const newTotalPurchases = parseInt(vendorRecord.total_purchases || 0, 10) + 1;
        await vendorRecord.update({
          outstanding_amount: newOutstanding,
          total_amount: newTotalAmount,
          total_purchases: newTotalPurchases,
          last_purchase_date: poData.date || new Date(),
        }, { transaction: t });
      }

      if (items && items.length > 0) {
        await PurchaseOrderItem.bulkCreate(
          items.map((item) => ({
            purchase_order_id: po.id,
            name: item.name,
            quantity: item.quantity,
            unit: (item.unit || 'pcs').substring(0, 20),
            rate: item.rate,
            amount: item.amount,
          })),
          { transaction: t }
        );
      }

      // Stock addition: only for quotation POs (is_gst === false). Invoice POs do not affect stock.
      const isQuotationPO = poData.is_gst === false || poData.is_gst === 0 || poData.is_gst === 'false';
      if (isQuotationPO && items && items.length > 0) {
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

      const { items, add_to_stock: _ignoredAddToStock, addedItems, quantity, unit_price, ...poData } = req.body;

      // Sanitize date fields — empty strings default to PO date
      if (!poData.expected_delivery) poData.expected_delivery = poData.date || record.date || null;

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
            purchase_order_id: record.id,
            name: item.name,
            quantity: item.quantity,
            unit: (item.unit || 'pcs').substring(0, 20),
            rate: item.rate,
            amount: item.amount,
          })),
          { transaction: t }
        );

        // Stock addition: only for quotation POs (is_gst === false). Invoice POs do not affect stock.
        const effectiveIsGst = (poData.is_gst !== undefined) ? poData.is_gst : record.is_gst;
        const isQuotationPOUpd = effectiveIsGst === false || effectiveIsGst === 0 || effectiveIsGst === 'false';
        if (isQuotationPOUpd) {
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
