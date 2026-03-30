const ApiResponse = require('../utils/ApiResponse');
const { getPagination, getPagingData } = require('../utils/pagination');
const logger = require('../utils/logger');
const { applyBusinessScope } = require('../middleware/businessScope');

/**
 * Creates standard CRUD controller methods for a given model.
 * Override individual methods by spreading and replacing.
 *
 * Business scoping: if the model has a `business_id` field, all queries
 * are automatically filtered by req.currentBusiness (set by setCurrentBusiness middleware).
 */
const createCrudController = (Model, options = {}) => {
  const {
    resourceName = 'Resource',
    include = [],
    searchFields = [],
    defaultOrder = [['created_at', 'DESC']],
    skipBusinessScope = false,
  } = options;

  // Check if model has business_id field
  const hasBusinessId = () => {
    return !skipBusinessScope && Model.rawAttributes && Model.rawAttributes.business_id;
  };

  return {
    // GET /
    getAll: async (req, res, next) => {
      try {
        const { page, limit, offset } = getPagination(req.query);
        const { search, status, sort, order: sortOrder } = req.query;

        let where = {};

        // Apply business scoping
        if (hasBusinessId()) {
          where = applyBusinessScope(req, where);
        }

        const queryOptions = {
          where,
          include,
          order: defaultOrder,
          limit,
          offset,
          distinct: true,
        };

        // Search filter
        if (search && searchFields.length > 0) {
          const { Op } = require('sequelize');
          where[Op.or] = searchFields.map((field) => ({
            [field]: { [Op.like]: `%${search}%` },
          }));
        }

        // Status filter
        if (status) {
          where.status = status;
        }

        // Custom sort
        if (sort) {
          queryOptions.order = [[sort, sortOrder === 'asc' ? 'ASC' : 'DESC']];
        }

        const data = await Model.findAndCountAll(queryOptions);
        const { items, pagination } = getPagingData(data, page, limit);

        return ApiResponse.paginated(res, items, pagination);
      } catch (error) {
        next(error);
      }
    },

    // GET /:id
    getById: async (req, res, next) => {
      try {
        const where = { id: req.params.id };
        if (hasBusinessId()) {
          applyBusinessScope(req, where);
        }

        const record = await Model.findOne({ where, include });

        if (!record) {
          return ApiResponse.notFound(res, `${resourceName} not found`);
        }

        return ApiResponse.success(res, record);
      } catch (error) {
        next(error);
      }
    },

    // POST /
    create: async (req, res, next) => {
      try {
        // Auto-inject business_id from current session
        if (hasBusinessId() && req.currentBusiness) {
          req.body.business_id = req.currentBusiness;
        }

        const record = await Model.create(req.body);
        return ApiResponse.created(res, record, `${resourceName} created successfully`);
      } catch (error) {
        next(error);
      }
    },

    // PUT /:id
    update: async (req, res, next) => {
      try {
        const where = { id: req.params.id };
        if (hasBusinessId()) {
          applyBusinessScope(req, where);
        }

        const record = await Model.findOne({ where });

        if (!record) {
          return ApiResponse.notFound(res, `${resourceName} not found`);
        }

        await record.update(req.body);
        await record.reload({ include });

        return ApiResponse.success(res, record, `${resourceName} updated successfully`);
      } catch (error) {
        next(error);
      }
    },

    // DELETE /:id
    delete: async (req, res, next) => {
      try {
        const where = { id: req.params.id };
        if (hasBusinessId()) {
          applyBusinessScope(req, where);
        }

        const record = await Model.findOne({ where });

        if (!record) {
          return ApiResponse.notFound(res, `${resourceName} not found`);
        }

        await record.destroy();
        return ApiResponse.success(res, null, `${resourceName} deleted successfully`);
      } catch (error) {
        next(error);
      }
    },
  };
};

module.exports = createCrudController;
