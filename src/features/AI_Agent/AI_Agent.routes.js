const express = require('express');
const router = express.Router();
const controller = require('./AI_Agent.controller');

router.post('/ask', controller.handleMessage);

module.exports = router;
