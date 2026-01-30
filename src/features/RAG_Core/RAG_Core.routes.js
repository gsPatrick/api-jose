const express = require('express');
const router = express.Router();
const controller = require('./RAG_Core.controller');

router.post('/search', controller.testSearch);

module.exports = router;
