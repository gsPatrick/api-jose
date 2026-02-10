const express = require('express');
const router = express.Router();
const controller = require('./HubSpot.controller');

// Webhook endpoint
router.post('/webhook', controller.handleWebhook);

module.exports = router;
