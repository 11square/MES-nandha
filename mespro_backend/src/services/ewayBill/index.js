const db = require('../../models');
const config = require('./config');
const apiClient = require('./apiClient');
const { buildGeneratePayload } = require('./payloadBuilder');
const logger = require('../../utils/logger');

const { Bill, BillItem, Client, EwayBill } = db;

/**
 * High-level e-Way Bill operations used by the controller.
 *
 * The whole module is inert unless `config.isConfigured()` is true — the
 * controller checks this first and never reaches here otherwise.
 */

/**
 * Generate an e-Way Bill for a given bill (invoice).
 *
 * @param {object} params
 * @param {number} params.billId        - the bill to generate the EWB for
 * @param {object} params.overrides     - transport + any missing fields from the UI
 * @param {number} params.businessId    - current business (multi-tenant scope)
 * @param {string} params.generatedBy   - user name for the audit trail
 * @returns {Promise<{ ok, ewayBill, errors }>}
 */
async function generateForBill({ billId, overrides = {}, businessId = null, generatedBy = null }) {
  const where = { id: billId };
  if (businessId) where.business_id = businessId;

  const bill = await Bill.findOne({ where });
  if (!bill) return { ok: false, status: 404, errors: ['Bill not found.'] };

  const items = await BillItem.findAll({ where: { bill_id: bill.id } });
  const client = bill.client_id ? await Client.findByPk(bill.client_id) : null;

  // Prevent duplicate active EWB for the same bill (NIC also blocks duplicates).
  const existing = await EwayBill.findOne({
    where: { bill_id: bill.id, status: 'generated' },
  });
  if (existing) {
    return { ok: false, status: 409, errors: ['An active e-Way Bill already exists for this bill.'], ewayBill: existing };
  }

  const { payload, errors } = buildGeneratePayload({ bill, items, client, overrides });
  if (errors.length) {
    return { ok: false, status: 422, errors };
  }

  try {
    const { data, alert } = await apiClient.generate(payload);
    const record = await EwayBill.create({
      bill_id: bill.id,
      eway_bill_no: data?.ewayBillNo ? String(data.ewayBillNo) : null,
      eway_bill_date: data?.ewayBillDate || null,
      valid_upto: data?.validUpto || null,
      doc_no: payload.docNo,
      status: 'generated',
      alert: alert || data?.alert || null,
      request_snapshot: sanitizeForStore(payload),
      response_snapshot: data || null,
      generated_by: generatedBy,
      business_id: businessId,
    });
    logger.info(`e-Way Bill generated: ${record.eway_bill_no} for bill ${bill.bill_no}`);
    return { ok: true, status: 201, ewayBill: record };
  } catch (err) {
    const errorMessage = formatApiError(err);
    await EwayBill.create({
      bill_id: bill.id,
      doc_no: payload.docNo,
      status: 'failed',
      error_message: errorMessage.slice(0, 1000),
      request_snapshot: sanitizeForStore(payload),
      response_snapshot: err.response || null,
      generated_by: generatedBy,
      business_id: businessId,
    });
    logger.error(`e-Way Bill generation failed for bill ${bill.bill_no}: ${errorMessage}`);
    return { ok: false, status: 502, errors: [errorMessage] };
  }
}

/**
 * Cancel a previously generated e-Way Bill.
 * @param {object} params { ewayBillId, reasonCode, reasonText, businessId }
 */
async function cancelEwayBill({ ewayBillId, reasonCode = 4, reasonText = '', businessId = null }) {
  const where = { id: ewayBillId };
  if (businessId) where.business_id = businessId;

  const record = await EwayBill.findOne({ where });
  if (!record) return { ok: false, status: 404, errors: ['e-Way Bill record not found.'] };
  if (record.status !== 'generated' || !record.eway_bill_no) {
    return { ok: false, status: 422, errors: ['Only an active generated e-Way Bill can be cancelled.'] };
  }

  const payload = {
    ewbNo: Number(record.eway_bill_no),
    cancelRsnCode: Number(reasonCode) || 4,
    cancelRmrk: String(reasonText || 'Cancelled').slice(0, 255),
  };

  try {
    await apiClient.cancel(payload);
    await record.update({ status: 'cancelled', cancel_reason: payload.cancelRmrk, cancelled_at: new Date() });
    return { ok: true, status: 200, ewayBill: record };
  } catch (err) {
    const errorMessage = formatApiError(err);
    return { ok: false, status: 502, errors: [errorMessage] };
  }
}

function sanitizeForStore(payload) {
  // The payload contains no secrets, but clone to avoid storing references.
  try { return JSON.parse(JSON.stringify(payload)); } catch (_) { return null; }
}

function formatApiError(err) {
  if (err.response?.error?.errorCodes) {
    return `e-Way Bill API error code(s): ${JSON.stringify(err.response.error.errorCodes)}`;
  }
  if (err.response) return `e-Way Bill API: ${JSON.stringify(err.response).slice(0, 500)}`;
  return err.message || 'Unknown e-Way Bill API error';
}

module.exports = {
  config,
  generateForBill,
  cancelEwayBill,
};
