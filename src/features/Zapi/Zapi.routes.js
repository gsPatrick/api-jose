const express = require('express');
const router = express.Router();
const controller = require('./Zapi.controller');

// Z-api Webhook
router.post('/webhook', controller.handleWebhook);

// Internal/Manual Send
router.post('/send', controller.manualSend);

module.exports = router;
