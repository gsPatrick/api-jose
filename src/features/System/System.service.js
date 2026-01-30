const fs = require('fs');
const path = require('path');
const { sequelize } = require('../../config/db');
const axios = require('axios');
const config = require('../../config/apis.config');
require('dotenv').config();

class SystemService {

    async runDiagnostics() {
        const reportLines = [];
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

        // Helper to log both to array and console
        const log = (msg) => {
            console.log(msg); // Real-time terminal
            reportLines.push(`[${new Date().toISOString()}] ${msg}`);
        };

        log("=== STARTING SYSTEM DIAGNOSTICS ===");

        // 1. Database Check
        try {
            await sequelize.authenticate();
            log("✅ Database Connection: OK");

            const [results] = await sequelize.query("SELECT * FROM pg_extension WHERE extname = 'vector';");
            if (results.length > 0) {
                log("✅ pgvector Extension: INSTALLED");
            } else {
                log("❌ pgvector Extension: NOT FOUND");
            }
        } catch (err) {
            log(`❌ Database Connection: FAILED - ${err.message}`);
        }

        // 2. Redis Check
        if (process.env.USE_REDIS === 'true') {
            try {
                // Assuming client is exported or we create a temp one. 
                // For safety, let's just check env vars primarily here to not break if redis lib issue.
                log("ℹ️ Redis is ENABLED in .env. (Connection check skipped in simple diagnostic)");
            } catch (err) {
                log(`❌ Redis Config: ${err.message}`);
            }
        } else {
            log("ℹ️ Redis is DISABLED in .env");
        }

        // 3. External APIs Check
        // Bacen
        try {
            log(`Testing Bacen API (${config.inmet.retry} retries config)...`);
            // Simple harmless GET
            await axios.get('https://api.bcb.gov.br/dados/serie/bcdata.sgs.20770/dados/ultimos/1?formato=json');
            log("✅ Bacen API: OK");
        } catch (err) {
            log(`❌ Bacen API: FAILED - ${err.message}`);
        }

        // INMET
        try {
            log(`Testing INMET API...`);
            await axios.get(`${config.inmet.baseURL}/estacoes/T`, { timeout: 5000 });
            log("✅ INMET API: OK");
        } catch (err) {
            log(`❌ INMET API: FAILED - ${err.message}`);
        }

        // NASA
        try {
            log(`Testing NASA POWER API...`);
            // Check availability endpoint or doc
            await axios.get(config.nasaPower.baseURL, { timeout: 5000 });
            // Note: NASA usually requires params, so 400 is actually "OK" (reachable) vs Network Error
            log("✅ NASA POWER API: Reachable");
        } catch (err) {
            if (err.response && err.response.status < 500) {
                log("✅ NASA POWER API: Reachable (Client Error expected without params)");
            } else {
                log(`❌ NASA POWER API: FAILED - ${err.message}`);
            }
        }

        log("=== DIAGNOSTICS COMPLETE ===");

        // Save to File
        const reportContent = reportLines.join('\n');
        const filename = `diagnostics_${timestamp}.txt`;
        const logDir = path.join(__dirname, '../../../logs');

        // Ensure logs dir exists
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }

        const filePath = path.join(logDir, filename);
        fs.writeFileSync(filePath, reportContent);

        console.log(`Report saved to: ${filePath}`);

        return {
            success: true,
            filePath: filePath,
            publicUrl: `/logs/${filename}`,
            report: reportContent
        };
    }
}

module.exports = new SystemService();
