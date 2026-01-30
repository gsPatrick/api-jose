const express = require('express');
const router = express.Router();
const controller = require('./External_Context.controller');

router.get('/rates', controller.getRates);
router.get('/climate', controller.getClimate);

module.exports = router;
