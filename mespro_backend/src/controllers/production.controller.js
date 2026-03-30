const {
  ProductionOrder, ProductionStage, StageMaterialUsed,
  ProductionStageDef, BillOfMaterial, Order,
} = require('../models');
const createCrudController = require('./base.controller');
const ApiResponse = require('../utils/ApiResponse');
const { sequelize } = require('../models');
const { getPagination, getPagingData } = require('../utils/pagination');
const { applyBusinessScope } = require('../middleware/businessScope');

const baseController = createCrudController(ProductionOrder, {
  resourceName: 'Production Order',
  include: [
    { model: ProductionStage, as: 'stages', include: [{ model: StageMaterialUsed, as: 'materialsUsed' }] },
  ],
  searchFields: ['order_number', 'customer', 'product'],
  defaultOrder: [['created_at', 'DESC']],
});

module.exports = {
  ...baseController,

  // GET /production/orders - with filters + pagination
  getAll: async (req, res, next) => {
    try {
      const { Op } = require('sequelize');
      const { search, status, priority, qcStatus } = req.query;
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
      if (priority) where.priority = priority;
      if (qcStatus) where.qc_status = qcStatus;

      applyBusinessScope(req, where);

      const data = await ProductionOrder.findAndCountAll({
        where,
        include: [
          { model: ProductionStage, as: 'stages', attributes: ['id', 'stage_number', 'name', 'status', 'started_at', 'completed_at'] },
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

  // PATCH /production/orders/:id/stage — fixed N+1: parallel queries + findOne instead of findAll+find
  updateStage: async (req, res, next) => {
    try {
      const { stage } = req.body;

      const [order, stageDef, totalStages] = await Promise.all([
        ProductionOrder.findOne({ where: { id: req.params.id, ...applyBusinessScope(req) } }),
        ProductionStageDef.findOne({ where: { sequence: stage } }),
        ProductionStageDef.count(),
      ]);

      if (!order) {
        return ApiResponse.notFound(res, 'Production order not found');
      }

      await order.update({
        current_stage: stage,
        stage_name: stageDef ? stageDef.name : order.stage_name,
        progress: totalStages > 0 ? Math.round((stage / totalStages) * 100) : order.progress,
      });

      return ApiResponse.success(res, order, 'Production stage updated');
    } catch (error) {
      next(error);
    }
  },

  // PATCH /production/orders/:id/progress
  updateProgress: async (req, res, next) => {
    try {
      const order = await ProductionOrder.findOne({ where: { id: req.params.id, ...applyBusinessScope(req) } });
      if (!order) {
        return ApiResponse.notFound(res, 'Production order not found');
      }

      await order.update({ progress: req.body.progress });
      return ApiResponse.success(res, order, 'Progress updated');
    } catch (error) {
      next(error);
    }
  },

  // PATCH /production/orders/:id/assign
  assignWorker: async (req, res, next) => {
    try {
      const order = await ProductionOrder.findOne({ where: { id: req.params.id, ...applyBusinessScope(req) } });
      if (!order) {
        return ApiResponse.notFound(res, 'Production order not found');
      }

      await order.update({ assigned_to: req.body.assignedTo });
      return ApiResponse.success(res, order, 'Worker assigned');
    } catch (error) {
      next(error);
    }
  },

  // GET /production/stages - get stage definitions
  getStageDefinitions: async (req, res, next) => {
    try {
      const stages = await ProductionStageDef.findAll({
        where: applyBusinessScope(req),
        order: [['sequence', 'ASC']],
      });
      return ApiResponse.success(res, stages);
    } catch (error) {
      next(error);
    }
  },

  // GET /production/orders/:id/bom
  getBom: async (req, res, next) => {
    try {
      const bom = await BillOfMaterial.findAll({
        where: applyBusinessScope(req, { order_id: req.params.id }),
      });
      return ApiResponse.success(res, bom);
    } catch (error) {
      next(error);
    }
  },

  // POST /production/orders/:id/stages
  addStage: async (req, res, next) => {
    try {
      const stage = await ProductionStage.create({
        ...req.body,
        production_order_id: req.params.id,
        business_id: req.currentBusiness,
      });
      return ApiResponse.created(res, stage);
    } catch (error) {
      next(error);
    }
  },

  // PATCH /production/stages/:stageId
  updateStageStatus: async (req, res, next) => {
    try {
      const stage = await ProductionStage.findOne({ where: { id: req.params.stageId, ...applyBusinessScope(req) } });
      if (!stage) {
        return ApiResponse.notFound(res, 'Stage not found');
      }

      await stage.update(req.body);
      return ApiResponse.success(res, stage, 'Stage updated');
    } catch (error) {
      next(error);
    }
  },
};
