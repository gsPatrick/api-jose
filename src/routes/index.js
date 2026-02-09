const express = require('express');
const router = express.Router();

const uazapiRoutes = require('../features/Uazapi/Uazapi.routes');
const zapiRoutes = require('../features/Zapi/Zapi.routes');
const aiAgentRoutes = require('../features/AI_Agent/AI_Agent.routes');
const ragCoreRoutes = require('../features/RAG_Core/RAG_Core.routes');
const mediaProcessorRoutes = require('../features/Media_Processor/Media_Processor.routes');
const clientRoutes = require('../features/Client/Client.routes');
const externalContextRoutes = require('../features/External_Context/External_Context.routes');

// router.use('/uazapi', uazapiRoutes); // Disabled in V18.7 to use Z-api as primary
router.use('/zapi', zapiRoutes);
router.use('/ai-agent', aiAgentRoutes);
router.use('/rag-core', ragCoreRoutes);
router.use('/media', mediaProcessorRoutes);
router.use('/clients', clientRoutes);
router.use('/external', externalContextRoutes);

// Bacen Module Routes
const bacenRoutes = require('../features/External_Context/Bacen/Bacen.routes');
router.use('/external/bacen', bacenRoutes);

// Climate Module Routes
const climateRoutes = require('../features/External_Context/Climate/Climate.routes');
router.use('/external/climate', climateRoutes);

// System Diagnostics Routes
const systemRoutes = require('../features/System/System.routes');
router.use('/system', systemRoutes);

module.exports = router;
