const { Vendor, VendorFollowup, PurchaseOrder, PurchaseOrderItem, Transaction, Dispatch } = require('../models');
const createCrudController = require('./base.controller');
const ApiResponse = require('../utils/ApiResponse');
const { applyBusinessScope } = require('../middleware/businessScope');
const { getPagination, getPagingData } = require('../utils/pagination');

const baseController = createCrudController(Vendor, {
  resourceName: 'Vendor',
  searchFields: ['name', 'contact_person', 'email', 'phone', 'category'],
  defaultOrder: [['created_at', 'DESC']],
});

module.exports = {
  ...baseController,

  // GET /vendors/:id/purchases
  getVendorPurchases: async (req, res, next) => {
    try {
      const { Op } = require('sequelize');
      const { page, limit, offset } = getPagination(req.query);
      const vendor = await Vendor.findByPk(req.params.id, { attributes: ['id', 'name'] });
      const vendorName = vendor ? vendor.name : '';
      const orConditions = [{ vendor_id: req.params.id }];
      if (vendorName) orConditions.push({ vendor_name: vendorName });
      const data = await PurchaseOrder.findAndCountAll({
        where: applyBusinessScope(req, { [Op.or]: orConditions }),
        include: [{ model: PurchaseOrderItem, as: 'items' }],
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

  // GET /vendors/:id/transactions
  getVendorTransactions: async (req, res, next) => {
    try {
      const { Op } = require('sequelize');
      const { page, limit, offset } = getPagination(req.query);
      const vendor = await Vendor.findByPk(req.params.id, { attributes: ['id', 'name'] });
      const vendorName = vendor ? vendor.name : '';
      const orConditions = [{ vendor_id: req.params.id }];
      if (vendorName) orConditions.push({ vendor_name: vendorName });
      const data = await Transaction.findAndCountAll({
        where: applyBusinessScope(req, { [Op.or]: orConditions }),
        order: [['date', 'DESC']],
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

  // GET /vendors/:id/dispatches
  getVendorDispatches: async (req, res, next) => {
    try {
      const { Op } = require('sequelize');
      const { page, limit, offset } = getPagination(req.query);
      const vendor = await Vendor.findByPk(req.params.id, { attributes: ['id', 'name'] });
      const vendorName = vendor ? vendor.name : '';
      // Find dispatches linked to POs for this vendor or by vendor name
      const orConditions = [];
      if (vendorName) orConditions.push({ customer: vendorName });
      const data = await Dispatch.findAndCountAll({
        where: applyBusinessScope(req, orConditions.length > 0 ? { [Op.or]: orConditions } : { customer: '' }),
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

  // GET /vendors/followups or /vendors/:id/followups
  getFollowups: async (req, res, next) => {
    try {
      const { page, limit, offset } = getPagination(req.query);
      const where = applyBusinessScope(req);
      if (req.params.id) where.vendor_id = req.params.id;
      const data = await VendorFollowup.findAndCountAll({
        where,
        include: [{ model: Vendor, as: 'vendor', attributes: ['id', 'name'] }],
        order: [['date', 'DESC']],
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

  // POST /vendors/:id/followups
  createFollowup: async (req, res, next) => {
    try {
      const followup = await VendorFollowup.create({
        ...req.body,
        vendor_id: req.params.id,
        business_id: req.currentBusiness,
      });
      return ApiResponse.created(res, followup);
    } catch (error) {
      next(error);
    }
  },
};
