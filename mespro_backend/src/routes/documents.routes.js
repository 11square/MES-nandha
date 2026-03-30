const express = require('express');
const multer = require('multer');
const router = express.Router();
const documentsController = require('../controllers/documents.controller');

const { setCurrentBusiness } = require('../middleware/businessScope');

// Multer config — store in memory buffer for forwarding to S3 or disk
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
});

// All routes require authentication
router.use(setCurrentBusiness);

// Upload a document
router.post('/upload', upload.single('file'), documentsController.upload);

// List all documents (with optional filters)
router.get('/', documentsController.getAll);

// Get document by ID
router.get('/:id', documentsController.getById);

// Download document file
router.get('/:id/download', documentsController.download);

// Update document metadata
router.put('/:id', documentsController.update);

// Delete document
router.delete('/:id', documentsController.delete);

module.exports = router;
