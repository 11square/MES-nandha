/**
 * Upload Service
 * Handles file storage to local disk or AWS S3 based on UPLOAD_TO_S3 env var.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const logger = require('../utils/logger');

const UPLOAD_TO_S3 = (process.env.UPLOAD_TO_S3 || 'false').toLowerCase() === 'true';
const LOCAL_UPLOAD_DIR = path.resolve(__dirname, '../../public/uploads');

// Lazy-load AWS SDK only when needed
let s3Client = null;

function getS3Client() {
  if (s3Client) return s3Client;

  try {
    const { S3Client } = require('@aws-sdk/client-s3');
    s3Client = new S3Client({
      region: process.env.AWS_REGION || 'ap-south-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });
    return s3Client;
  } catch (err) {
    logger.error('Failed to initialize S3 client. Is @aws-sdk/client-s3 installed?', err);
    throw new Error('S3 client initialization failed. Install: npm install @aws-sdk/client-s3');
  }
}

/**
 * Ensure local upload directory exists
 */
function ensureLocalDir(subDir = '') {
  const dir = subDir ? path.join(LOCAL_UPLOAD_DIR, subDir) : LOCAL_UPLOAD_DIR;
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

/**
 * Generate a unique stored filename preserving extension
 */
function generateStoredName(originalName) {
  const ext = path.extname(originalName);
  const uuid = crypto.randomUUID();
  return `${uuid}${ext}`;
}

/**
 * Upload a file buffer to local disk
 */
async function uploadLocal(buffer, originalName, category = 'other') {
  const storedName = generateStoredName(originalName);
  const subDir = category; // e.g. public/uploads/invoice/
  const dir = ensureLocalDir(subDir);
  const filePath = path.join(dir, storedName);

  await fs.promises.writeFile(filePath, buffer);

  const localPath = `${subDir}/${storedName}`;
  logger.info(`File stored locally: ${localPath}`);

  return {
    storedName,
    storageType: 'local',
    localPath,
    s3Bucket: null,
    s3Key: null,
    s3Url: null,
  };
}

/**
 * Upload a file buffer to S3
 */
async function uploadS3(buffer, originalName, mimeType, category = 'other') {
  const { PutObjectCommand } = require('@aws-sdk/client-s3');
  const client = getS3Client();

  const bucket = process.env.AWS_S3_BUCKET;
  if (!bucket) throw new Error('AWS_S3_BUCKET environment variable is required');

  const storedName = generateStoredName(originalName);
  const s3Key = `uploads/${category}/${storedName}`;

  await client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: s3Key,
    Body: buffer,
    ContentType: mimeType,
  }));

  const region = process.env.AWS_REGION || 'ap-south-1';
  const s3Url = `https://${bucket}.s3.${region}.amazonaws.com/${s3Key}`;

  logger.info(`File uploaded to S3: ${s3Key}`);

  return {
    storedName,
    storageType: 's3',
    localPath: null,
    s3Bucket: bucket,
    s3Key,
    s3Url,
  };
}

/**
 * Main upload function — routes to S3 or local based on env
 */
async function uploadFile(buffer, originalName, mimeType, category = 'other') {
  if (UPLOAD_TO_S3) {
    return uploadS3(buffer, originalName, mimeType, category);
  }
  return uploadLocal(buffer, originalName, category);
}

/**
 * Get a readable URL or file path for a document record
 */
function getFileUrl(document) {
  if (document.storage_type === 's3') {
    return document.s3_url;
  }
  // Local: return a URL relative to the server's static mount
  return `/uploads/${document.local_path}`;
}

/**
 * Get a pre-signed S3 URL for private buckets (valid 1 hour)
 */
async function getPresignedUrl(document) {
  if (document.storage_type !== 's3') {
    return getFileUrl(document);
  }

  try {
    const { GetObjectCommand } = require('@aws-sdk/client-s3');
    const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
    const client = getS3Client();

    const command = new GetObjectCommand({
      Bucket: document.s3_bucket,
      Key: document.s3_key,
    });
    return await getSignedUrl(client, command, { expiresIn: 3600 });
  } catch (err) {
    logger.error('Failed to generate pre-signed URL', err);
    return document.s3_url; // Fallback to stored URL
  }
}

/**
 * Delete a file from storage
 */
async function deleteFile(document) {
  if (document.storage_type === 's3') {
    try {
      const { DeleteObjectCommand } = require('@aws-sdk/client-s3');
      const client = getS3Client();

      await client.send(new DeleteObjectCommand({
        Bucket: document.s3_bucket,
        Key: document.s3_key,
      }));
      logger.info(`Deleted from S3: ${document.s3_key}`);
    } catch (err) {
      logger.error('S3 delete failed', err);
    }
  } else {
    const fullPath = path.join(LOCAL_UPLOAD_DIR, document.local_path);
    try {
      if (fs.existsSync(fullPath)) {
        await fs.promises.unlink(fullPath);
        logger.info(`Deleted local file: ${fullPath}`);
      }
    } catch (err) {
      logger.error('Local file delete failed', err);
    }
  }
}

module.exports = {
  UPLOAD_TO_S3,
  uploadFile,
  getFileUrl,
  getPresignedUrl,
  deleteFile,
  ensureLocalDir,
};
