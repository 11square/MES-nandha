const config = require('./config');
const { stateCodeFromName, stateCodeFromGstin } = require('./stateCodes');

/**
 * Maps a MESPRO Bill (invoice) + its items + buyer + transport details into the
 * e-Way Bill "generate" request JSON, and validates that all mandatory fields
 * are present.
 *
 * Because the current schema does not store every e-Way Bill field (e.g. buyer
 * pincode, transport distance, vehicle number), those are accepted as
 * `overrides` supplied by the caller (typically collected in the UI at
 * generation time). Overrides always win over values derived from the bill.
 *
 * Returns: { payload, errors, derived }
 *  - payload : the request object (only valid when errors is empty)
 *  - errors  : array of human-readable missing/invalid field messages
 */

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const round2 = (v) => Math.round((num(v) + Number.EPSILON) * 100) / 100;

/** dd/mm/yyyy as required by the API. Accepts Date or 'YYYY-MM-DD'. */
function toEwbDate(value) {
  if (!value) return '';
  const d = (value instanceof Date) ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}`;
}

function buildGeneratePayload({ bill, items = [], client = null, overrides = {} }) {
  const errors = [];
  const seller = config.seller;

  // ── Parties: state codes ────────────────────────────────────────────────
  const fromStateCode = num(overrides.fromStateCode)
    || stateCodeFromGstin(seller.gstin)
    || stateCodeFromName(seller.stateCode);
  const buyerGstin = (overrides.toGstin || bill.client_gst || client?.gst_number || '').trim();
  // place_of_supply is stored as "33-Tamil Nadu"; its leading digits are the code.
  const posStateCode = (() => {
    const m = String(bill.place_of_supply || '').match(/^\s*(\d{1,2})/);
    return m ? Number(m[1]) : 0;
  })();
  const toStateCode = num(overrides.toStateCode)
    || stateCodeFromGstin(buyerGstin)
    || posStateCode
    || stateCodeFromName(overrides.toState || bill.state || client?.state);

  const isInterState = fromStateCode && toStateCode && fromStateCode !== toStateCode;

  // ── Line items + tax split ──────────────────────────────────────────────
  const billRate = num(bill.gst_rate) || 0;
  let totalTaxable = 0;
  let cgstValue = 0;
  let sgstValue = 0;
  let igstValue = 0;

  const itemList = items.map((it, idx) => {
    const qty = num(it.quantity) || 0;
    const taxable = round2(num(it.unit_price) * qty - num(it.discount));
    // Prefer an explicit per-item rate if present, else the bill-level rate.
    const rate = num(it.gst_rate) || billRate;
    const cgstRate = isInterState ? 0 : rate / 2;
    const sgstRate = isInterState ? 0 : rate / 2;
    const igstRate = isInterState ? rate : 0;

    totalTaxable += taxable;
    cgstValue += round2(taxable * cgstRate / 100);
    sgstValue += round2(taxable * sgstRate / 100);
    igstValue += round2(taxable * igstRate / 100);

    const hsn = String(it.hsn_sac || '').trim();
    if (!hsn) errors.push(`Item ${idx + 1} ("${it.name || ''}") is missing an HSN code.`);

    return {
      itemNo: idx + 1,
      productName: String(it.name || '').slice(0, 100),
      productDesc: String(it.name || '').slice(0, 100),
      hsnCode: Number(hsn) || 0,
      quantity: qty,
      qtyUnit: String(it.unit || overrides.defaultUnit || 'NOS').toUpperCase().slice(0, 3),
      taxableAmount: taxable,
      cgstRate: round2(cgstRate),
      sgstRate: round2(sgstRate),
      igstRate: round2(igstRate),
      cessRate: 0,
    };
  });

  cgstValue = round2(cgstValue);
  sgstValue = round2(sgstValue);
  igstValue = round2(igstValue);
  totalTaxable = round2(totalTaxable);
  const totInvValue = round2(num(bill.grand_total) || (totalTaxable + cgstValue + sgstValue + igstValue));

  // ── Transport details (overrides win, else persisted bill fields) ────────
  const transMode = String(overrides.transMode ?? bill.transport_mode ?? '').trim();
  const rawDistance = overrides.transDistance ?? bill.transport_distance;
  const transDistance = (rawDistance !== undefined && rawDistance !== null && rawDistance !== '')
    ? String(rawDistance)
    : '';
  const vehicleNo = String(overrides.vehicleNo || bill.vehicle_no || '').toUpperCase().replace(/\s+/g, '');

  // ── Build payload ───────────────────────────────────────────────────────
  const payload = {
    supplyType: overrides.supplyType || 'O', // O = Outward
    subSupplyType: overrides.subSupplyType || '1', // 1 = Supply
    docType: overrides.docType || 'INV',
    docNo: String(bill.bill_no || '').slice(0, 16),
    docDate: toEwbDate(bill.date),
    transactionType: num(overrides.transactionType) || 1, // 1 = Regular

    fromGstin: seller.gstin || 'URP',
    fromTrdName: seller.name,
    fromAddr1: seller.addr1,
    fromAddr2: seller.addr2,
    fromPlace: seller.place,
    fromPincode: num(seller.pincode),
    fromStateCode,
    actFromStateCode: fromStateCode,

    toGstin: buyerGstin || 'URP',
    toTrdName: (bill.client_name || client?.name || '').slice(0, 100),
    toAddr1: String(overrides.toAddr1 || bill.client_address || client?.address || '').slice(0, 120),
    toAddr2: String(overrides.toAddr2 || '').slice(0, 120),
    toPlace: String(overrides.toPlace || bill.district || client?.district || '').slice(0, 50),
    toPincode: num(overrides.toPincode) || num(bill.client_pincode) || num(client?.pincode),
    toStateCode,
    actToStateCode: num(overrides.actToStateCode) || toStateCode,

    totalValue: totalTaxable,
    cgstValue,
    sgstValue,
    igstValue,
    cessValue: 0,
    totInvValue,

    transporterId: overrides.transporterId || bill.transporter_id || '',
    transporterName: overrides.transporterName || bill.transporter_name || '',
    transDistance: transDistance || '0', // 0 lets the portal auto-fill from pincodes
    transMode,
    transDocNo: overrides.transDocNo || bill.transport_doc_no || '',
    transDocDate: overrides.transDocDate
      ? toEwbDate(overrides.transDocDate)
      : (bill.transport_doc_date ? toEwbDate(bill.transport_doc_date) : ''),
    vehicleNo,
    vehicleType: overrides.vehicleType || bill.vehicle_type || 'R', // R = Regular, O = ODC

    itemList,
  };

  // ── Mandatory-field validation ──────────────────────────────────────────
  if (!seller.gstin) errors.push('Seller GSTIN is not configured (EWB_SELLER_GSTIN).');
  if (!payload.fromPincode) errors.push('Seller pincode is not configured (EWB_SELLER_PINCODE).');
  if (!fromStateCode) errors.push('Seller state code could not be determined (set EWB_SELLER_STATE_CODE).');
  if (!payload.docNo) errors.push('Invoice number (docNo) is missing on the bill.');
  if (!payload.docDate) errors.push('Invoice date (docDate) is missing on the bill.');
  if (!toStateCode) errors.push('Buyer state code could not be determined (provide buyer GSTIN or state).');
  if (!payload.toPincode) errors.push('Buyer pincode is required (provide toPincode).');
  if (!itemList.length) errors.push('The bill has no line items.');
  if (itemList.length > 250) errors.push('e-Way Bill allows a maximum of 250 items per bill.');

  // Transport: Part-A only is allowed (transporterId), otherwise need a mode.
  const hasPartB = vehicleNo || (transMode && payload.transDocNo);
  if (!payload.transporterId && !hasPartB) {
    errors.push('Provide either a transporterId (Part-A) or vehicle/transport-doc details (Part-B).');
  }
  if (transMode && !['1', '2', '3', '4'].includes(transMode)) {
    errors.push('transMode must be 1 (Road), 2 (Rail), 3 (Air) or 4 (Ship).');
  }
  if (transMode === '1' && !vehicleNo && !payload.transporterId) {
    errors.push('Road transport requires a vehicle number.');
  }

  // GST consistency
  if (isInterState && (cgstValue > 0 || sgstValue > 0)) {
    errors.push('Inter-state supply must use IGST, not CGST/SGST.');
  }
  if (!isInterState && fromStateCode && toStateCode && igstValue > 0) {
    errors.push('Intra-state supply must use CGST/SGST, not IGST.');
  }

  return {
    payload,
    errors,
    derived: { fromStateCode, toStateCode, isInterState, totalTaxable, totInvValue },
  };
}

module.exports = { buildGeneratePayload, toEwbDate };
