const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const dispatchController = require('../controllers/dispatch.controller');

const { setCurrentBusiness } = require('../middleware/businessScope');

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../../public/uploads/dispatch');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `lr_${Date.now()}${path.extname(file.originalname)}`),
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

router.use(setCurrentBusiness);

router.get('/', dispatchController.getAll);
router.get('/:id', dispatchController.getById);
router.post('/', upload.single('lr_image'), dispatchController.create);
router.put('/:id', upload.single('lr_image'), dispatchController.update);
router.delete('/:id', dispatchController.delete);
router.put('/:id/status', dispatchController.updateStatus);

module.exports = router;
