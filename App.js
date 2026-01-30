const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { connectDB, sequelize } = require('./src/config/db');
const routes = require('./src/routes/index');

require('dotenv').config();

const app = express();

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
    await connectDB();

    // Sync models
    // In production, use migrations instead of sync()
    // Using alter: true to update tables if they exist
    await sequelize.sync({ alter: true });
    console.log('Database Synced');

    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
};

startServer();
