const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { connectDB, sequelize } = require('./src/config/db');
const routes = require('./src/routes/index');

require('dotenv').config();

const app = express();

// Global Tracer - MUST BE FIRST to catch raw arrival time
app.use((req, res, next) => {
    console.log(`[RAW_ARRIVAL] ${new Date().toISOString()} | ${req.method} ${req.url}`);
    next();
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve logs directory (WARNING: Publicly accessible)
const path = require('path');
app.use('/logs', express.static(path.join(__dirname, 'logs')));

// Routes
app.use('/api', routes);

// Health Check
app.get('/health', (req, res) => res.status(200).send('OK'));

// Start Server
const PORT = process.env.PORT || 3000;

const startServer = async () => {
    const start = Date.now();
    await connectDB();

    // Pre-load external caches (Climate stations etc)
    const ClimateService = require('./src/features/External_Context/Climate/Climate.service');
    ClimateService.preloadStations().catch(err => console.error("Failed to pre-load stations:", err.message));

    // Initialize RAG System (V18.2)
    const RAGCoreService = require('./src/features/RAG_Core/RAG_Core.service');
    RAGCoreService.initializeRAG().catch(err => console.error("Failed to initialize RAG:", err.message));

    // Sync models - Avoid alter:true in production/hot restarts
    await sequelize.sync();

    app.listen(PORT, () => {
        console.log(`[STARTUP] Server ready on port ${PORT} in ${Date.now() - start}ms`);
    });
};

startServer();
