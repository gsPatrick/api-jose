const express = require('express');
const router = express.Router();
const controller = require('./Client.controller');

router.get('/:whatsapp_number', controller.getClient);
router.put('/:whatsapp_number/status', controller.updateStatus);

module.exports = router;
