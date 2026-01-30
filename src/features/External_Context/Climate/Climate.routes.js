const express = require('express');
const router = express.Router();
const controller = require('./Climate.controller');

// GET /api/external/climate/realtime?lat={lat}&lon={lon}&days={n}
router.get('/realtime', controller.getRealtimeData);

// GET /api/external/climate/historical?lat={lat}&lon={lon}&start={yyyymmdd}&end={yyyymmdd}
router.get('/historical', controller.getHistoricalData);

module.exports = router;
