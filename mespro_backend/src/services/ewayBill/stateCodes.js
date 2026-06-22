/**
 * GST State Code master (2-digit codes used by the e-Way Bill / GST system).
 * The e-Way Bill API requires numeric state codes, but the app stores state
 * names on clients/bills — this maps one to the other.
 */

const STATE_NAME_TO_CODE = {
  'jammu and kashmir': 1,
  'himachal pradesh': 2,
  'punjab': 3,
  'chandigarh': 4,
  'uttarakhand': 5,
  'uttaranchal': 5,
  'haryana': 6,
  'delhi': 7,
  'rajasthan': 8,
  'uttar pradesh': 9,
  'bihar': 10,
  'sikkim': 11,
  'arunachal pradesh': 12,
  'nagaland': 13,
  'manipur': 14,
  'mizoram': 15,
  'tripura': 16,
  'meghalaya': 17,
  'assam': 18,
  'west bengal': 19,
  'jharkhand': 20,
  'odisha': 21,
  'orissa': 21,
  'chhattisgarh': 22,
  'chattisgarh': 22,
  'madhya pradesh': 23,
  'gujarat': 24,
  'daman and diu': 25,
  'dadra and nagar haveli and daman and diu': 26,
  'dadra and nagar haveli': 26,
  'maharashtra': 27,
  'andhra pradesh': 28, // (old code, pre-bifurcation)
  'karnataka': 29,
  'goa': 30,
  'lakshadweep': 31,
  'kerala': 32,
  'tamil nadu': 33,
  'tamilnadu': 33,
  'puducherry': 34,
  'pondicherry': 34,
  'andaman and nicobar islands': 35,
  'andaman and nicobar': 35,
  'telangana': 36,
  'andhra pradesh (new)': 37,
  'ladakh': 38,
  'other territory': 97,
  'other country': 99,
};

const CODE_TO_STATE_NAME = Object.entries(STATE_NAME_TO_CODE).reduce((acc, [name, code]) => {
  if (!acc[code]) acc[code] = name.replace(/\b\w/g, (c) => c.toUpperCase());
  return acc;
}, {});

/**
 * Resolve a 2-digit state code from a free-text state name. Returns null when
 * the name can't be matched so callers can flag it as a missing/invalid field.
 */
function stateCodeFromName(stateName) {
  if (stateName === undefined || stateName === null) return null;
  const key = String(stateName).trim().toLowerCase();
  if (!key) return null;
  if (/^\d{1,2}$/.test(key)) return Number(key); // already a numeric code
  return STATE_NAME_TO_CODE[key] ?? null;
}

/**
 * Derive the 2-digit state code from the first two digits of a GSTIN, which is
 * the most reliable source when it is available.
 */
function stateCodeFromGstin(gstin) {
  if (!gstin) return null;
  const m = String(gstin).trim().match(/^(\d{2})/);
  return m ? Number(m[1]) : null;
}

module.exports = {
  STATE_NAME_TO_CODE,
  CODE_TO_STATE_NAME,
  stateCodeFromName,
  stateCodeFromGstin,
};
