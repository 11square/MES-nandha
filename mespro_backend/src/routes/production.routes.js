const express = require('express');
const router = express.Router();
const productionController = require('../controllers/production.controller');

const { setCurrentBusiness } = require('../middleware/businessScope');

router.use(setCurrentBusiness);

router.get('/', productionController.getAll);
router.get('/stage-definitions', productionController.getStageDefinitions);
router.get('/:id', productionController.getById);
router.post('/', productionController.create);
router.put('/:id', productionController.update);
router.delete('/:id', productionController.delete);
router.put('/:id/progress', productionController.updateProgress);
router.put('/:id/assign', productionController.assignWorker);
router.get('/:id/bom', productionController.getBom);
router.post('/:id/stages', productionController.addStage);
router.put('/:id/stages/:stageId', productionController.updateStage);
router.put('/:id/stages/:stageId/status', productionController.updateStageStatus);

module.exports = router;
