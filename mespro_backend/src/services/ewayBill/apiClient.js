const crypto = require('./crypto');
const config = require('./config');
const logger = require('../../utils/logger');

/**
 * Thin HTTP client for the NIC / GSP e-Way Bill API.
 *
 * Responsibilities:
 *  - authenticate() and cache the resulting { authToken, sek } until it expires.
 *  - generate() / cancel() / getByNo() — encrypt the request, POST it, and
 *    decrypt the response.
 *
 * Uses the Node 18+ global `fetch` (no extra dependency). All network/credential
 * details come from `config` (environment variables).
 */

let session = { authToken: null, sek: null, expiresAt: 0 };

function isSessionValid() {
  return session.authToken && session.sek && Date.now() < session.expiresAt;
}

function baseHeaders(extra = {}) {
  return {
    'Content-Type': 'application/json',
    'client-id': config.clientId,
    'client-secret': config.clientSecret,
    'gstin': config.gstin,
    ...extra,
  };
}

async function postJson(path, headers, body) {
  const url = `${config.baseUrl.replace(/\/$/, '')}${path}`;
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let parsed;
  try { parsed = text ? JSON.parse(text) : {}; } catch (_) { parsed = { raw: text }; }
  if (!res.ok) {
    const err = new Error(`e-Way Bill API HTTP ${res.status}`);
    err.httpStatus = res.status;
    err.response = parsed;
    throw err;
  }
  return parsed;
}

/**
 * Authenticate and cache the session (authToken + decrypted sek).
 *
 * Auth request shape follows the standard NIC scheme. If your GSP differs,
 * adjust the body fields here only.
 */
async function authenticate(force = false) {
  if (!force && isSessionValid()) return session;

  const appKey = crypto.generateAppKey();
  const encryptedAppKey = crypto.rsaEncrypt(appKey, config.publicKey);

  const body = {
    action: 'ACCESSTOKEN',
    username: config.username,
    password: config.password,
    app_key: encryptedAppKey,
  };

  const resp = await postJson(config.authPath, baseHeaders(), body);

  // Success: { status: '1', authtoken, sek }
  if (String(resp.status) !== '1' || !resp.authtoken || !resp.sek) {
    const err = new Error('e-Way Bill authentication failed');
    err.response = resp;
    throw err;
  }

  // The sek is AES-encrypted with our app key; decrypt it to the session key.
  const decryptedSek = crypto.decryptSek(resp.sek, appKey.toString('base64'));

  session = {
    authToken: resp.authtoken,
    sek: decryptedSek,
    expiresAt: Date.now() + config.tokenTtlMs,
  };
  logger.info('e-Way Bill: authenticated, session cached.');
  return session;
}

/**
 * Run an encrypted action (GENEWAYBILL / CANEWB / etc.) and return the decrypted
 * response data object. Re-authenticates once on an auth-expiry error.
 */
async function callAction(action, dataObject, { retried = false } = {}) {
  const { authToken, sek } = await authenticate();
  const encrypted = crypto.encryptPayload(dataObject, sek);

  const body = { action, data: encrypted };
  const headers = baseHeaders({ authtoken: authToken });

  const resp = await postJson(config.apiPath, headers, body);

  // Token expired/invalid → refresh once and retry.
  if (String(resp.status) === '0' && !retried && isAuthError(resp)) {
    session = { authToken: null, sek: null, expiresAt: 0 };
    return callAction(action, dataObject, { retried: true });
  }

  if (String(resp.status) !== '1') {
    const err = new Error('e-Way Bill action failed');
    err.response = resp;
    err.errorCodes = resp.error?.errorCodes ?? resp.error ?? null;
    throw err;
  }

  const data = resp.data ? crypto.decryptResponseData(resp.data, sek) : null;
  return { data, alert: resp.alert ?? null, raw: resp };
}

function isAuthError(resp) {
  const code = resp?.error?.errorCodes;
  // 238 = invalid auth token (common NIC code); treat generic 'token' errors too.
  return code === 238 || code === '238' || /token/i.test(JSON.stringify(resp?.error || ''));
}

module.exports = {
  authenticate,
  generate: (data) => callAction('GENEWAYBILL', data),
  cancel: (data) => callAction('CANEWB', data),
  getByNo: (data) => callAction('GETEWAYBILL', data),
  _resetSessionForTests: () => { session = { authToken: null, sek: null, expiresAt: 0 }; },
};
