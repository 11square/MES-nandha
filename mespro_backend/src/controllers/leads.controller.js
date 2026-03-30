const { Lead, LeadProduct, LeadFollowUp, Order, OrderTimeline } = require('../models');
const createCrudController = require('./base.controller');
const ApiResponse = require('../utils/ApiResponse');
const { sequelize } = require('../models');
const { applyBusinessScope } = require('../middleware/businessScope');

const baseController = createCrudController(Lead, {
  resourceName: 'Lead',
  include: [
    { model: LeadProduct, as: 'products' },
    { model: LeadFollowUp, as: 'followUps' },
  ],
  searchFields: ['customer', 'contact', 'mobile', 'email', 'lead_number'],
  defaultOrder: [['created_at', 'DESC']],
});

module.exports = {
  ...baseController,

  // Override getById to support lookup by lead_number
  getById: async (req, res, next) => {
    try {
      const where = /^\d+$/.test(req.params.id)
        ? { id: req.params.id, ...applyBusinessScope(req) }
        : { lead_number: req.params.id, ...applyBusinessScope(req) };
      const lead = await Lead.findOne({
        where,
        include: [
          { model: LeadProduct, as: 'products' },
          { model: LeadFollowUp, as: 'followUps' },
        ],
      });
      if (!lead) return ApiResponse.notFound(res, 'Lead not found');
      return ApiResponse.success(res, lead);
    } catch (error) {
      next(error);
    }
  },

  // Override update to support lookup by lead_number
  update: async (req, res, next) => {
    const t = await sequelize.transaction();
    try {
      const where = /^\d+$/.test(req.params.id)
        ? { id: req.params.id, ...applyBusinessScope(req) }
        : { lead_number: req.params.id, ...applyBusinessScope(req) };
      const lead = await Lead.findOne({ where, transaction: t });
      if (!lead) {
        await t.rollback();
        return ApiResponse.notFound(res, 'Lead not found');
      }

      const { products, followUps, ...leadData } = req.body;
      await lead.update(leadData, { transaction: t });

      // Replace nested lead_products only when caller passes products.
      // Business is still enforced via scoped parent lead lookup above.
      if (Array.isArray(products)) {
        await LeadProduct.destroy({
          where: { lead_id: lead.id },
          transaction: t,
        });

        if (products.length > 0) {
          await LeadProduct.bulkCreate(
            products.map((p) => ({
              ...p,
              lead_id: lead.id,
            })),
            { transaction: t }
          );
        }
      }

      // Optional nested follow-ups replacement
      if (Array.isArray(followUps)) {
        await LeadFollowUp.destroy({
          where: { lead_id: lead.id },
          transaction: t,
        });

        if (followUps.length > 0) {
          await LeadFollowUp.bulkCreate(
            followUps.map((f) => ({
              ...f,
              lead_id: lead.id,
            })),
            { transaction: t }
          );
        }
      }

      await t.commit();

      const updatedLead = await Lead.findByPk(lead.id, {
        include: [
          { model: LeadProduct, as: 'products' },
          { model: LeadFollowUp, as: 'followUps' },
        ],
      });

      return ApiResponse.success(res, updatedLead || lead, 'Lead updated successfully');
    } catch (error) {
      await t.rollback();
      next(error);
    }
  },

  // Override create to handle nested products & followUps
  create: async (req, res, next) => {
    const t = await sequelize.transaction();
    try {
      const { products, followUps, ...leadData } = req.body;

      // Auto-generate lead number
      const lastLead = await Lead.findOne({
        where: applyBusinessScope(req),
        order: [['id', 'DESC']],
        transaction: t,
      });
      const nextNum = lastLead ? lastLead.id + 1 : 1;
      leadData.lead_number = leadData.lead_number || `LEAD-${new Date().getFullYear()}-${String(nextNum).padStart(3, '0')}`;

      leadData.business_id = req.currentBusiness;
      const lead = await Lead.create(leadData, { transaction: t });

      if (products && products.length > 0) {
        await LeadProduct.bulkCreate(
          products.map((p) => ({ ...p, lead_id: lead.id, business_id: req.currentBusiness })),
          { transaction: t }
        );
      }

      if (followUps && followUps.length > 0) {
        await LeadFollowUp.bulkCreate(
          followUps.map((f) => ({ ...f, lead_id: lead.id, business_id: req.currentBusiness })),
          { transaction: t }
        );
      }

      await t.commit();

      const created = await Lead.findByPk(lead.id, {
        include: [
          { model: LeadProduct, as: 'products' },
          { model: LeadFollowUp, as: 'followUps' },
        ],
      });

      return ApiResponse.created(res, created, 'Lead created successfully');
    } catch (error) {
      await t.rollback();
      next(error);
    }
  },

  // POST /leads/:id/follow-ups
  addFollowUp: async (req, res, next) => {
    try {
      const where = /^\d+$/.test(req.params.id)
        ? { id: req.params.id, ...applyBusinessScope(req) }
        : { lead_number: req.params.id, ...applyBusinessScope(req) };
      const lead = await Lead.findOne({ where });
      if (!lead) {
        return ApiResponse.notFound(res, 'Lead not found');
      }

      const followUp = await LeadFollowUp.create({
        ...req.body,
        lead_id: lead.id,
      });

      return ApiResponse.created(res, followUp, 'Follow-up added');
    } catch (error) {
      next(error);
    }
  },

  // PUT /leads/:id/followups/:followUpId
  updateFollowUp: async (req, res, next) => {
    try {
      const where = /^\d+$/.test(req.params.id)
        ? { id: req.params.id, ...applyBusinessScope(req) }
        : { lead_number: req.params.id, ...applyBusinessScope(req) };
      const lead = await Lead.findOne({ where });
      if (!lead) {
        return ApiResponse.notFound(res, 'Lead not found');
      }

      const followUp = await LeadFollowUp.findOne({
        where: { id: req.params.followUpId, lead_id: lead.id },
      });
      if (!followUp) {
        return ApiResponse.notFound(res, 'Follow-up not found');
      }

      await followUp.update(req.body);
      return ApiResponse.success(res, followUp, 'Follow-up updated');
    } catch (error) {
      next(error);
    }
  },

  // DELETE /leads/:id/followups/:followUpId
  deleteFollowUp: async (req, res, next) => {
    try {
      const where = /^\d+$/.test(req.params.id)
        ? { id: req.params.id, ...applyBusinessScope(req) }
        : { lead_number: req.params.id, ...applyBusinessScope(req) };
      const lead = await Lead.findOne({ where });
      if (!lead) {
        return ApiResponse.notFound(res, 'Lead not found');
      }

      const deleted = await LeadFollowUp.destroy({
        where: { id: req.params.followUpId, lead_id: lead.id },
      });
      if (!deleted) {
        return ApiResponse.notFound(res, 'Follow-up not found');
      }

      return ApiResponse.success(res, null, 'Follow-up deleted');
    } catch (error) {
      next(error);
    }
  },

  // POST /leads/:id/convert
  convertToOrder: async (req, res, next) => {
    const t = await sequelize.transaction();
    try {
      const convertWhere = /^\d+$/.test(req.params.id)
        ? { id: req.params.id, ...applyBusinessScope(req) }
        : { lead_number: req.params.id, ...applyBusinessScope(req) };
      const lead = await Lead.findOne({
        where: convertWhere,
        include: [{ model: LeadProduct, as: 'products' }],
        transaction: t,
      });

      if (!lead) {
        await t.rollback();
        return ApiResponse.notFound(res, 'Lead not found');
      }

      if (lead.conversion_status === 'Converted') {
        await t.rollback();
        return ApiResponse.badRequest(res, 'Lead already converted');
      }

      // Auto-generate order number
      const lastOrder = await Order.findOne({
        where: applyBusinessScope(req),
        order: [['id', 'DESC']],
        transaction: t,
      });
      const nextNum = lastOrder ? lastOrder.id + 1 : 1;
      const orderNumber = `ORD-${new Date().getFullYear()}-${String(nextNum).padStart(3, '0')}`;

      const order = await Order.create({
        order_number: orderNumber,
        business_id: req.currentBusiness,
        lead_id: lead.id,
        lead_number: lead.lead_number,
        customer: lead.customer,
        contact: lead.contact,
        mobile: lead.mobile,
        email: lead.email,
        address: lead.address,
        product: lead.product,
        size: lead.size,
        quantity: lead.quantity,
        status: 'Pending',
        priority: 'Medium',
        converted_date: new Date(),
        converted_by: req.body.convertedBy || 'System',
        ...req.body,
      }, { transaction: t });

      // Add timeline entry
      await OrderTimeline.create({
        order_id: order.id,
        date: new Date(),
        action: 'Order created from lead conversion',
        done_by: req.body.convertedBy || 'System',
        business_id: req.currentBusiness,
      }, { transaction: t });

      // Update lead status
      await lead.update({
        status: 'Converted',
        conversion_status: 'Converted',
      }, { transaction: t });

      await t.commit();

      return ApiResponse.created(res, order, 'Lead converted to order');
    } catch (error) {
      await t.rollback();
      next(error);
    }
  },
};
