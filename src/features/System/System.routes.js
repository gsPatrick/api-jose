const express = require('express');
const router = express.Router();
const controller = require('./System.controller');

// GET /api/system/diagnostics
router.get('/diagnostics', controller.runDiagnostics);

module.exports = router;
