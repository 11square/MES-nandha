const { Vendor, VendorFollowup, PurchaseOrder, PurchaseOrderItem, Transaction, Dispatch } = require('../models');
const createCrudController = require('./base.controller');
const ApiResponse = require('../utils/ApiResponse');
const { applyBusinessScope } = require('../middleware/businessScope');
const { getPagination, getPagingData } = require('../utils/pagination');
const { sequelize } = require('../models');

const baseController = createCrudController(Vendor, {
  resourceName: 'Vendor',
  searchFields: ['name', 'contact_person', 'email', 'phone', 'category'],
  defaultOrder: [['created_at', 'DESC']],
});

module.exports = {
  ...baseController,

  // Override getAll to compute total_purchases and total_amount from POs
  getAll: async (req, res, next) => {
    try {
      const { Op } = require('sequelize');
      const { page, limit, offset } = getPagination(req.query);
      const { search, status } = req.query;
      const where = applyBusinessScope(req, {});

      if (search) {
        where[Op.or] = ['name', 'contact_person', 'email', 'phone', 'category'].map(f => ({
          [f]: { [Op.like]: `%${search}%` },
        }));
      }
      if (status) where.status = status;

      const data = await Vendor.findAndCountAll({
        where,
        order: [['created_at', 'DESC']],
        limit,
        offset,
        distinct: true,
      });
      const { items, pagination } = getPagingData(data, page, limit);

      // Compute PO aggregates for each vendor (match by vendor_id OR vendor_name)
      const vendorIds = items.map(v => v.id);
      const vendorNames = items.map(v => v.name).filter(Boolean);
      if (vendorIds.length > 0) {
        const poWhere = applyBusinessScope(req, {});
        const orConds = [];
        if (vendorIds.length > 0) orConds.push({ vendor_id: { [Op.in]: vendorIds } });
        if (vendorNames.length > 0) orConds.push({ vendor_name: { [Op.in]: vendorNames } });
        poWhere[Op.or] = orConds;

        // Get per-vendor_name aggregates (since vendor_id is often null)
        const poByName = await PurchaseOrder.findAll({
          attributes: [
            'vendor_name',
            'vendor_id',
            [sequelize.fn('COUNT', sequelize.col('id')), 'po_count'],
            [sequelize.fn('SUM', sequelize.col('total_amount')), 'po_total'],
          ],
          where: poWhere,
          group: ['vendor_name', 'vendor_id'],
          raw: true,
        });

        // Build lookup by vendor name and vendor_id
        const nameMap = {};
        const idMap = {};
        poByName.forEach(r => {
          const count = Number(r.po_count) || 0;
          const total = Number(r.po_total) || 0;
          if (r.vendor_name) {
            if (!nameMap[r.vendor_name]) nameMap[r.vendor_name] = { count: 0, total: 0 };
            nameMap[r.vendor_name].count += count;
            nameMap[r.vendor_name].total += total;
          }
          if (r.vendor_id) {
            if (!idMap[r.vendor_id]) idMap[r.vendor_id] = { count: 0, total: 0 };
            idMap[r.vendor_id].count += count;
            idMap[r.vendor_id].total += total;
          }
        });

        items.forEach(v => {
          // Prefer name match (covers POs with null vendor_id), fall back to id match
          const agg = nameMap[v.name] || idMap[v.id] || { count: 0, total: 0 };
          v.dataValues.total_purchases = agg.count;
          v.dataValues.total_amount = agg.total;
        });

        // Compute outstanding from transactions (expense = paid to vendor reduces outstanding,
        // income = refund from vendor increases outstanding).
        const txWhere = applyBusinessScope(req, {});
        const txOr = [];
        if (vendorIds.length > 0) txOr.push({ vendor_id: { [Op.in]: vendorIds } });
        if (vendorNames.length > 0) txOr.push({ vendor_name: { [Op.in]: vendorNames } });
        if (txOr.length > 0) {
          txWhere[Op.or] = txOr;
          const txAgg = await Transaction.findAll({
            attributes: [
              'vendor_id',
              'vendor_name',
              'type',
              [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('amount')), 0), 'sum_amount'],
            ],
            where: txWhere,
            group: ['vendor_id', 'vendor_name', 'type'],
            raw: true,
          });
          const txByVendor = new Map();
          for (const row of txAgg) {
            let vid = row.vendor_id ? Number(row.vendor_id) : null;
            if (!vid && row.vendor_name) {
              const match = items.find(v => v.name === row.vendor_name);
              if (match) vid = match.id;
            }
            if (!vid) continue;
            const cur = txByVendor.get(vid) || { income: 0, expense: 0 };
            if (row.type === 'income') cur.income += Number(row.sum_amount) || 0;
            else cur.expense += Number(row.sum_amount) || 0;
            txByVendor.set(vid, cur);
          }
          items.forEach(v => {
            const tx = txByVendor.get(v.id) || { income: 0, expense: 0 };
            const total = Number(v.dataValues.total_amount) || 0;
            v.dataValues.total_paid = tx.expense;
            v.dataValues.outstanding_amount = total + tx.income - tx.expense;
          });
        } else {
          items.forEach(v => {
            v.dataValues.total_paid = 0;
            v.dataValues.outstanding_amount = Number(v.dataValues.total_amount) || 0;
          });
        }
      }

      return ApiResponse.paginated(res, items, pagination);
    } catch (error) {
      next(error);
    }
  },

  // Override getById to compute total_purchases and total_amount from POs
  getById: async (req, res, next) => {
    try {
      const { Op } = require('sequelize');
      const where = { id: req.params.id, ...applyBusinessScope(req, {}) };
      const vendor = await Vendor.findOne({ where });
      if (!vendor) return ApiResponse.notFound(res, 'Vendor not found');

      const vendorName = vendor.name || '';
      const orConditions = [{ vendor_id: vendor.id }];
      if (vendorName) orConditions.push({ vendor_name: vendorName });

      const poAgg = await PurchaseOrder.findOne({
        attributes: [
          [sequelize.fn('COUNT', sequelize.col('id')), 'po_count'],
          [sequelize.fn('SUM', sequelize.col('total_amount')), 'po_total'],
        ],
        where: { [Op.or]: orConditions, ...applyBusinessScope(req, {}) },
        raw: true,
      });
      vendor.dataValues.total_purchases = Number(poAgg?.po_count) || 0;
      vendor.dataValues.total_amount = Number(poAgg?.po_total) || 0;

      return ApiResponse.success(res, vendor);
    } catch (error) {
      next(error);
    }
  },

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
