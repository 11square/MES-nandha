const crypto = require('crypto');

/**
 * Cryptography helpers for the NIC / GSP e-Way Bill API.
 *
 * The e-Way Bill API uses a hybrid scheme:
 *   1. The client generates a random 32-byte symmetric "app key".
 *   2. The app key is RSA-encrypted with the NIC/GSP public key and sent during
 *      authentication.
 *   3. The server returns a "sek" (session encryption key) that is AES-encrypted
 *      with the app key. The client AES-decrypts it to recover the real session
 *      key.
 *   4. Every request payload is AES-encrypted with the session key; every
 *      response payload is AES-decrypted with it.
 *
 * NIC uses AES in ECB mode with PKCS7 padding and a 256-bit key.
 *
 * NOTE: Different GSPs occasionally tweak details (e.g. whether the JSON is
 * Base64-encoded before encryption, or RSA padding type). The primitives below
 * follow the standard NIC scheme; if your GSP differs, only this file needs to
 * change. Each function documents the assumption it makes.
 */

/** Generate a fresh random 32-byte app key (returned as raw Buffer). */
function generateAppKey() {
  return crypto.randomBytes(32);
}

/**
 * Normalise the configured public key into PEM form. Accepts either a full PEM
 * string (with BEGIN/END headers) or a bare base64 DER body.
 */
function toPem(publicKey) {
  const trimmed = String(publicKey || '').trim();
  if (trimmed.includes('BEGIN')) return trimmed.replace(/\\n/g, '\n');
  const body = trimmed.replace(/\s+/g, '').match(/.{1,64}/g)?.join('\n') || '';
  return `-----BEGIN PUBLIC KEY-----\n${body}\n-----END PUBLIC KEY-----`;
}

/**
 * RSA-encrypt the app key with the NIC/GSP public key (PKCS1 v1.5 padding,
 * which is what the e-Way Bill system expects). Returns base64.
 */
function rsaEncrypt(dataBuffer, publicKey) {
  const encrypted = crypto.publicEncrypt(
    { key: toPem(publicKey), padding: crypto.constants.RSA_PKCS1_PADDING },
    dataBuffer
  );
  return encrypted.toString('base64');
}

/**
 * AES-256-ECB encrypt a UTF-8 string with a base64 key. Returns base64.
 */
function aesEncrypt(plaintext, keyBase64) {
  const key = Buffer.from(keyBase64, 'base64');
  const cipher = crypto.createCipheriv('aes-256-ecb', key, null);
  cipher.setAutoPadding(true); // PKCS7
  return Buffer.concat([cipher.update(Buffer.from(plaintext, 'utf8')), cipher.final()]).toString('base64');
}

/**
 * AES-256-ECB decrypt a base64 ciphertext with a base64 key. Returns UTF-8.
 */
function aesDecrypt(cipherBase64, keyBase64) {
  const key = Buffer.from(keyBase64, 'base64');
  const decipher = crypto.createDecipheriv('aes-256-ecb', key, null);
  decipher.setAutoPadding(true);
  return Buffer.concat([decipher.update(Buffer.from(cipherBase64, 'base64')), decipher.final()]).toString('utf8');
}

/**
 * Decrypt the "sek" returned by the authenticate call. It is AES-encrypted with
 * the (base64) app key and, once decrypted, yields the real base64 session key
 * used for all subsequent payload encryption.
 */
function decryptSek(sekBase64, appKeyBase64) {
  return aesDecrypt(sekBase64, appKeyBase64);
}

/**
 * Encrypt an outgoing request payload object with the session key.
 * Produces the value for the `data` field of the request.
 */
function encryptPayload(payloadObject, sekBase64) {
  const json = typeof payloadObject === 'string' ? payloadObject : JSON.stringify(payloadObject);
  return aesEncrypt(json, sekBase64);
}

/**
 * Decrypt an encrypted response `data` field with the session key and parse it
 * as JSON. The NIC response wraps the inner JSON in base64, so we base64-decode
 * the decrypted text before parsing.
 */
function decryptResponseData(dataBase64, sekBase64) {
  const decrypted = aesDecrypt(dataBase64, sekBase64);
  // NIC double-encodes: decrypted text is itself base64 of the JSON.
  let jsonText = decrypted;
  try {
    const maybe = Buffer.from(decrypted, 'base64').toString('utf8');
    if (maybe.trim().startsWith('{') || maybe.trim().startsWith('[')) jsonText = maybe;
  } catch (_) { /* fall back to the raw decrypted text */ }
  return JSON.parse(jsonText);
}

module.exports = {
  generateAppKey,
  toPem,
  rsaEncrypt,
  aesEncrypt,
  aesDecrypt,
  decryptSek,
  encryptPayload,
  decryptResponseData,
};
