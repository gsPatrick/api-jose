const express = require('express');
const router = express.Router();
const controller = require('./Uazapi.controller');

router.post('/webhook', controller.webhook);
router.post('/send', controller.sendMessage);

module.exports = router;
