/**
 * Documents Controller
 * Handles file upload (multipart), list, get, download, delete
 */

const { Document, User } = require('../models');
const ApiResponse = require('../utils/ApiResponse');
const uploadService = require('../services/upload.service');
const logger = require('../utils/logger');
const path = require('path');
const fs = require('fs');
const { getPagination, getPagingData } = require('../utils/pagination');
const { applyBusinessScope } = require('../middleware/businessScope');

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

module.exports = {
  /**
   * POST /documents/upload
   * Accepts multipart/form-data with field name "file"
   * Optional body fields: category, entity_type, entity_id, description
   */
  upload: async (req, res, next) => {
    try {
      if (!req.file) {
        return ApiResponse.badRequest(res, 'No file uploaded. Use field name "file".');
      }

      const { originalname, mimetype, size, buffer } = req.file;

      // Validate mime type
      if (!ALLOWED_MIME_TYPES.includes(mimetype)) {
        return ApiResponse.badRequest(
          res,
          `File type "${mimetype}" is not allowed. Allowed: PDF, JPG, PNG, WEBP, DOC, DOCX, XLS, XLSX`
        );
      }

      // Validate size
      if (size > MAX_FILE_SIZE) {
        return ApiResponse.badRequest(res, `File size exceeds limit of ${MAX_FILE_SIZE / (1024 * 1024)} MB`);
      }

      const category = req.body.category || 'other';
      const entityType = req.body.entity_type || null;
      const entityId = req.body.entity_id ? parseInt(req.body.entity_id, 10) : null;
      const description = req.body.description || null;

      // Upload file (local or S3)
      const uploadResult = await uploadService.uploadFile(buffer, originalname, mimetype, category);

      // Save document record
      const document = await Document.create({
        original_name: originalname,
        stored_name: uploadResult.storedName,
        mime_type: mimetype,
        size,
        storage_type: uploadResult.storageType,
        s3_bucket: uploadResult.s3Bucket,
        s3_key: uploadResult.s3Key,
        s3_url: uploadResult.s3Url,
        local_path: uploadResult.localPath,
        category,
        entity_type: entityType,
        entity_id: entityId,
        uploaded_by: req.user ? req.user.id : null,
        description,
        status: 'uploaded',
        business_id: req.currentBusiness,
      });

      const responseData = {
        ...document.toJSON(),
        url: uploadService.getFileUrl(document),
      };

      return ApiResponse.created(res, responseData, 'Document uploaded successfully');
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /documents
   * List documents with optional filters: category, entity_type, entity_id, status
   */
  getAll: async (req, res, next) => {
    try {
      const { Op } = require('sequelize');
      const { category, entity_type, entity_id, status, search } = req.query;
      const { page, limit, offset } = getPagination(req.query);
      const where = {};

      if (category) where.category = category;
      if (entity_type) where.entity_type = entity_type;
      if (entity_id) where.entity_id = parseInt(entity_id, 10);
      if (status) where.status = status;
      if (search) {
        where[Op.or] = [
          { original_name: { [Op.like]: `%${search}%` } },
          { description: { [Op.like]: `%${search}%` } },
        ];
      }

      applyBusinessScope(req, where);

      const data = await Document.findAndCountAll({
        where,
        include: [{
          model: User,
          as: 'uploader',
          attributes: ['id', 'name', 'email'],
        }],
        order: [['created_at', 'DESC']],
        limit,
        offset,
        distinct: true,
      });

      // Attach download URLs
      const docsWithUrl = data.rows.map(doc => ({
        ...doc.toJSON(),
        url: uploadService.getFileUrl(doc),
      }));

      const { pagination } = getPagingData(data, page, limit);
      return ApiResponse.paginated(res, docsWithUrl, pagination);
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /documents/:id
   */
  getById: async (req, res, next) => {
    try {
      const document = await Document.findOne({
        where: { id: req.params.id, ...applyBusinessScope(req) },
        include: [{
          model: User,
          as: 'uploader',
          attributes: ['id', 'name', 'email'],
        }],
      });

      if (!document) return ApiResponse.notFound(res, 'Document not found');

      const data = {
        ...document.toJSON(),
        url: uploadService.getFileUrl(document),
      };

      return ApiResponse.success(res, data);
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /documents/:id/download
   * Returns the file itself (streams from local or redirects to S3 presigned URL)
   */
  download: async (req, res, next) => {
    try {
      const document = await Document.findOne({ where: { id: req.params.id, ...applyBusinessScope(req) } });
      if (!document) return ApiResponse.notFound(res, 'Document not found');

      if (document.storage_type === 's3') {
        const presignedUrl = await uploadService.getPresignedUrl(document);
        return res.redirect(presignedUrl);
      }

      // Local file
      const LOCAL_UPLOAD_DIR = path.resolve(__dirname, '../../public/uploads');
      const filePath = path.join(LOCAL_UPLOAD_DIR, document.local_path);

      if (!fs.existsSync(filePath)) {
        return ApiResponse.notFound(res, 'File not found on disk');
      }

      res.setHeader('Content-Type', document.mime_type);
      res.setHeader('Content-Disposition', `attachment; filename="${document.original_name}"`);
      const stream = fs.createReadStream(filePath);
      stream.pipe(res);
    } catch (error) {
      next(error);
    }
  },

  /**
   * PUT /documents/:id
   * Update metadata (category, entity_type, entity_id, description, extracted_data, status)
   */
  update: async (req, res, next) => {
    try {
      const document = await Document.findOne({ where: { id: req.params.id, ...applyBusinessScope(req) } });
      if (!document) return ApiResponse.notFound(res, 'Document not found');

      const allowedFields = ['category', 'entity_type', 'entity_id', 'description', 'extracted_data', 'status'];
      const updates = {};
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) updates[field] = req.body[field];
      }

      await document.update(updates);
      return ApiResponse.success(res, document, 'Document updated');
    } catch (error) {
      next(error);
    }
  },

  /**
   * DELETE /documents/:id
   * Deletes file from storage and DB record
   */
  delete: async (req, res, next) => {
    try {
      const document = await Document.findOne({ where: { id: req.params.id, ...applyBusinessScope(req) } });
      if (!document) return ApiResponse.notFound(res, 'Document not found');

      // Delete from storage
      await uploadService.deleteFile(document);

      // Delete DB record
      await document.destroy();

      return ApiResponse.success(res, null, 'Document deleted');
    } catch (error) {
      next(error);
    }
  },
};
