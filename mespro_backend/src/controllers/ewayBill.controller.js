const ApiResponse = require('../utils/ApiResponse');
const ewayBillService = require('../services/ewayBill');
const config = require('../services/ewayBill/config');
const db = require('../models');
const { applyBusinessScope } = require('../middleware/businessScope');

const { EwayBill } = db;

/**
 * e-Way Bill controller.
 *
 * Every action first checks `config.isConfigured()`. When the integration is not
 * configured it returns HTTP 501 with the list of missing env keys, so the
 * feature is completely safe (inert) until credentials are supplied.
 */

function ensureConfigured(res) {
  if (config.isConfigured()) return true;
  ApiResponse.error(
    res,
    'e-Way Bill integration is not configured.',
    501,
    { missing: config.missingKeys() }
  );
  return false;
}

module.exports = {
  // GET /status — report whether the integration is ready (no secrets exposed).
  status: async (req, res) => {
    return ApiResponse.success(res, {
      configured: config.isConfigured(),
      enabled: config.enabled,
      missing: config.missingKeys(),
    }, 'e-Way Bill integration status');
  },

  // GET / — list locally stored e-Way Bills for the current business.
  list: async (req, res, next) => {
    try {
      const where = applyBusinessScope(req);
      if (req.query.bill_id) where.bill_id = req.query.bill_id;
      const records = await EwayBill.findAll({ where, order: [['created_at', 'DESC']] });
      return ApiResponse.success(res, records, 'e-Way Bills retrieved');
    } catch (err) { next(err); }
  },

  // GET /:id — fetch a single stored e-Way Bill record.
  getById: async (req, res, next) => {
    try {
      const record = await EwayBill.findOne({ where: { id: req.params.id, ...applyBusinessScope(req) } });
      if (!record) return ApiResponse.notFound(res, 'e-Way Bill not found');
      return ApiResponse.success(res, record, 'e-Way Bill retrieved');
    } catch (err) { next(err); }
  },

  // POST /generate/:billId — generate an e-Way Bill for a bill (invoice).
  generate: async (req, res, next) => {
    if (!ensureConfigured(res)) return undefined;
    try {
      const result = await ewayBillService.generateForBill({
        billId: req.params.billId,
        overrides: req.body || {},
        businessId: req.currentBusiness,
        generatedBy: req.user?.name || req.user?.username || null,
      });
      if (!result.ok) {
        return ApiResponse.error(res, 'Could not generate e-Way Bill', result.status || 400, { errors: result.errors, ewayBill: result.ewayBill });
      }
      return ApiResponse.created(res, result.ewayBill, 'e-Way Bill generated');
    } catch (err) { next(err); }
  },

  // POST /:id/cancel — cancel a previously generated e-Way Bill.
  cancel: async (req, res, next) => {
    if (!ensureConfigured(res)) return undefined;
    try {
      const result = await ewayBillService.cancelEwayBill({
        ewayBillId: req.params.id,
        reasonCode: req.body?.reasonCode,
        reasonText: req.body?.reasonText,
        businessId: req.currentBusiness,
      });
      if (!result.ok) {
        return ApiResponse.error(res, 'Could not cancel e-Way Bill', result.status || 400, { errors: result.errors });
      }
      return ApiResponse.success(res, result.ewayBill, 'e-Way Bill cancelled');
    } catch (err) { next(err); }
  },
};
