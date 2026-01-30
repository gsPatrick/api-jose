const express = require('express');
const router = express.Router();
const controller = require('./Media_Processor.controller');

router.post('/audio', controller.processAudio);
router.post('/image', controller.processImage);

module.exports = router;
