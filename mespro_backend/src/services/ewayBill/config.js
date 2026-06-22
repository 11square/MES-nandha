/**
 * e-Way Bill integration configuration.
 *
 * All values are read from environment variables so that NO secrets live in
 * the codebase, and the whole feature stays INERT until it is configured.
 * `isConfigured()` is checked by the controller before any API call is made,
 * which guarantees this module can never break the running app when the
 * credentials are absent (it simply returns HTTP 501 Not Implemented).
 *
 * Works for both access routes:
 *  - Direct NIC API: set EWB_BASE_URL to the NIC endpoint + EWB_PUBLIC_KEY.
 *  - Through a GSP : set EWB_BASE_URL to the GSP endpoint + the client creds
 *                    they issue. Adjust paths via EWB_AUTH_PATH/EWB_API_PATH.
 *
 * Required env vars (see .env.example):
 *   EWB_ENABLED=true
 *   EWB_BASE_URL=https://<nic-or-gsp-host>
 *   EWB_AUTH_PATH=/ewayapi/authenticate
 *   EWB_API_PATH=/ewayapi
 *   EWB_CLIENT_ID=...
 *   EWB_CLIENT_SECRET=...
 *   EWB_GSTIN=...               (the requester's API-enabled GSTIN)
 *   EWB_USERNAME=...            (e-Way Bill portal API user)
 *   EWB_PASSWORD=...            (e-Way Bill portal API password)
 *   EWB_PUBLIC_KEY=...          (NIC/GSP RSA public key, base64 or PEM, see crypto.js)
 *
 * Seller (consignor = your own company) details — used as the "from" party:
 *   EWB_SELLER_GSTIN, EWB_SELLER_NAME, EWB_SELLER_ADDR1, EWB_SELLER_ADDR2,
 *   EWB_SELLER_PLACE, EWB_SELLER_PINCODE, EWB_SELLER_STATE_CODE
 */

const get = (key, fallback = '') => {
  const v = process.env[key];
  return (v === undefined || v === null) ? fallback : String(v).trim();
};

const config = {
  get enabled() {
    return get('EWB_ENABLED', 'false').toLowerCase() === 'true';
  },
  get baseUrl() { return get('EWB_BASE_URL'); },
  get authPath() { return get('EWB_AUTH_PATH', '/ewayapi/authenticate'); },
  get apiPath() { return get('EWB_API_PATH', '/ewayapi'); },
  get clientId() { return get('EWB_CLIENT_ID'); },
  get clientSecret() { return get('EWB_CLIENT_SECRET'); },
  get gstin() { return get('EWB_GSTIN'); },
  get username() { return get('EWB_USERNAME'); },
  get password() { return get('EWB_PASSWORD'); },
  get publicKey() { return get('EWB_PUBLIC_KEY'); },

  seller: {
    get gstin() { return get('EWB_SELLER_GSTIN'); },
    get name() { return get('EWB_SELLER_NAME'); },
    get addr1() { return get('EWB_SELLER_ADDR1'); },
    get addr2() { return get('EWB_SELLER_ADDR2'); },
    get place() { return get('EWB_SELLER_PLACE'); },
    get pincode() { return get('EWB_SELLER_PINCODE'); },
    get stateCode() { return get('EWB_SELLER_STATE_CODE'); },
  },

  // Auth token / session key cache lifetime (NIC tokens are valid ~6 hours;
  // we refresh a little early to be safe).
  tokenTtlMs: 5 * 60 * 60 * 1000,
};

/**
 * Returns true only when every value required to talk to the API is present.
 */
config.isConfigured = function isConfigured() {
  return Boolean(
    config.enabled &&
    config.baseUrl &&
    config.clientId &&
    config.clientSecret &&
    config.gstin &&
    config.username &&
    config.password &&
    config.publicKey
  );
};

/**
 * Lists which required config keys are missing — surfaced in the 501 response
 * so an operator can see exactly what still needs to be set.
 */
config.missingKeys = function missingKeys() {
  const checks = {
    EWB_ENABLED: config.enabled,
    EWB_BASE_URL: config.baseUrl,
    EWB_CLIENT_ID: config.clientId,
    EWB_CLIENT_SECRET: config.clientSecret,
    EWB_GSTIN: config.gstin,
    EWB_USERNAME: config.username,
    EWB_PASSWORD: config.password,
    EWB_PUBLIC_KEY: config.publicKey,
  };
  return Object.keys(checks).filter((k) => !checks[k]);
};

module.exports = config;
