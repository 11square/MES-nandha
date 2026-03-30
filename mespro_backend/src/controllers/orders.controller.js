const { Order, OrderProduct, OrderTimeline, Lead, StockItem } = require('../models');
const createCrudController = require('./base.controller');
const ApiResponse = require('../utils/ApiResponse');
const { sequelize } = require('../models');
const { getPagination, getPagingData } = require('../utils/pagination');
const { applyBusinessScope } = require('../middleware/businessScope');

const baseController = createCrudController(Order, {
  resourceName: 'Order',
  include: [
    { model: OrderProduct, as: 'products' },
    { model: OrderTimeline, as: 'timeline' },
  ],
  searchFields: ['order_number', 'customer', 'contact', 'mobile'],
  defaultOrder: [['created_at', 'DESC']],
});

// Helper: compute order totals from products array
async function computeOrderTotals(products, taxRate = 18) {
  let totalAmount = 0;
  let firstUnitPrice = 0;
  const enrichedProducts = [];

  for (const p of products) {
    let rate = parseFloat(p.rate) || 0;

    // If rate is 0, try to look up from stock_items
    if (rate === 0 && p.product) {
      const stockIdMatch = String(p.product).match(/^STOCK-(\d+)$/);
      if (stockIdMatch) {
        const stockItem = await StockItem.findByPk(stockIdMatch[1]);
        if (stockItem) {
          rate = parseFloat(stockItem.unit_price) || 0;
        }
      }
    }

    const qty = parseInt(p.quantity) || 0;
    const amount = rate * qty;
    if (!firstUnitPrice && rate > 0) firstUnitPrice = rate;
    totalAmount += amount;

    enrichedProducts.push({ ...p, rate, amount });
  }

  const gstAmount = Math.round(totalAmount * (taxRate / 100) * 100) / 100;
  const grandTotal = Math.round((totalAmount + gstAmount) * 100) / 100;

  return {
    unit_price: firstUnitPrice,
    total_amount: totalAmount,
    gst_amount: gstAmount,
    grand_total: grandTotal,
    tax_rate: taxRate,
    enrichedProducts,
  };
}

module.exports = {
  ...baseController,

  // Override getAll to add filters + pagination
  getAll: async (req, res, next) => {
    try {
      const { Op } = require('sequelize');
      const { search, status, paymentStatus, priority } = req.query;
      const { page, limit, offset } = getPagination(req.query);
      const where = {};

      if (search) {
        where[Op.or] = [
          { order_number: { [Op.like]: `%${search}%` } },
          { customer: { [Op.like]: `%${search}%` } },
          { product: { [Op.like]: `%${search}%` } },
        ];
      }
      if (status) where.status = status;
      if (paymentStatus) where.payment_status = paymentStatus;
      if (priority) where.priority = priority;

      applyBusinessScope(req, where);

      const data = await Order.findAndCountAll({
        where,
        include: [
          { model: OrderProduct, as: 'products' },
        ],
        order: [['created_at', 'DESC']],
        limit,
        offset,
        distinct: true,
      });
      const { items, pagination } = getPagingData(data, page, limit);

      return ApiResponse.paginated(res, items, pagination);
    } catch (error) {
      next(error);
    }
  },

  // Override create for nested products & timeline + auto-calc amounts
  create: async (req, res, next) => {
    const t = await sequelize.transaction();
    try {
      const { products, timeline, ...orderData } = req.body;

      // Auto-generate order number
      const lastOrder = await Order.findOne({
        where: applyBusinessScope(req),
        order: [['id', 'DESC']],
        transaction: t,
      });
      const nextNum = lastOrder ? lastOrder.id + 1 : 1;
      orderData.order_number = orderData.order_number || `ORD-${new Date().getFullYear()}-${String(nextNum).padStart(3, '0')}`;
      orderData.business_id = req.currentBusiness;

      // Auto-calculate amounts from products
      if (products && products.length > 0) {
        const totals = await computeOrderTotals(products, orderData.tax_rate || 18);
        orderData.unit_price = orderData.unit_price || totals.unit_price;
        orderData.total_amount = totals.total_amount;
        orderData.gst_amount = totals.gst_amount;
        orderData.grand_total = totals.grand_total;
        orderData.tax_rate = totals.tax_rate;

        const order = await Order.create(orderData, { transaction: t });

        await OrderProduct.bulkCreate(
          totals.enrichedProducts.map((p) => ({ ...p, order_id: order.id, business_id: req.currentBusiness })),
          { transaction: t }
        );

        // Add creation timeline entry
        await OrderTimeline.create({
          order_id: order.id,
          date: new Date(),
          action: 'Order created',
          done_by: orderData.assigned_to || 'System',
          business_id: req.currentBusiness,
        }, { transaction: t });

        await t.commit();

        const created = await Order.findByPk(order.id, {
          include: [
            { model: OrderProduct, as: 'products' },
            { model: OrderTimeline, as: 'timeline' },
          ],
        });

        return ApiResponse.created(res, created, 'Order created successfully');
      } else {
        const order = await Order.create(orderData, { transaction: t });

        await OrderTimeline.create({
          order_id: order.id,
          date: new Date(),
          action: 'Order created',
          done_by: orderData.assigned_to || 'System',
          business_id: req.currentBusiness,
        }, { transaction: t });

        await t.commit();

        const created = await Order.findByPk(order.id, {
          include: [
            { model: OrderProduct, as: 'products' },
            { model: OrderTimeline, as: 'timeline' },
          ],
        });

        return ApiResponse.created(res, created, 'Order created successfully');
      }
    } catch (error) {
      await t.rollback();
      next(error);
    }
  },

  // Override update for nested products + auto-calc amounts
  update: async (req, res, next) => {
    const t = await sequelize.transaction();
    try {
      const order = await Order.findOne({
        where: { id: req.params.id, ...applyBusinessScope(req) },
        transaction: t,
      });
      if (!order) {
        await t.rollback();
        return ApiResponse.notFound(res, 'Order not found');
      }

      const { products, timeline, ...orderData } = req.body;

      // If products provided, recalculate amounts and replace order_products
      if (products && products.length > 0) {
        const totals = await computeOrderTotals(products, orderData.tax_rate || order.tax_rate || 18);
        orderData.unit_price = totals.unit_price;
        orderData.total_amount = totals.total_amount;
        orderData.gst_amount = totals.gst_amount;
        orderData.grand_total = totals.grand_total;
        orderData.tax_rate = totals.tax_rate;

        // Delete old products and insert new ones
        await OrderProduct.destroy({ where: { order_id: order.id }, transaction: t });
        await OrderProduct.bulkCreate(
          totals.enrichedProducts.map((p) => ({ ...p, order_id: order.id, business_id: req.currentBusiness })),
          { transaction: t }
        );
      }

      await order.update(orderData, { transaction: t });

      // Add update timeline entry
      await OrderTimeline.create({
        order_id: order.id,
        date: new Date(),
        action: 'Order updated',
        done_by: orderData.assigned_to || 'System',
        business_id: req.currentBusiness,
      }, { transaction: t });

      await t.commit();

      const updated = await Order.findByPk(order.id, {
        include: [
          { model: OrderProduct, as: 'products' },
          { model: OrderTimeline, as: 'timeline' },
        ],
      });

      return ApiResponse.success(res, updated, 'Order updated successfully');
    } catch (error) {
      await t.rollback();
      next(error);
    }
  },

  // PATCH /:id/status — wrapped in transaction
  updateStatus: async (req, res, next) => {
    const t = await sequelize.transaction();
    try {
      const order = await Order.findOne({ where: { id: req.params.id, ...applyBusinessScope(req) }, transaction: t });
      if (!order) {
        await t.rollback();
        return ApiResponse.notFound(res, 'Order not found');
      }

      await order.update({ status: req.body.status }, { transaction: t });

      await OrderTimeline.create({
        order_id: order.id,
        date: new Date(),
        action: `Status changed to ${req.body.status}`,
        done_by: req.body.by || 'System',
        business_id: req.currentBusiness,
      }, { transaction: t });

      await t.commit();
      return ApiResponse.success(res, order, 'Order status updated');
    } catch (error) {
      await t.rollback();
      next(error);
    }
  },
};
