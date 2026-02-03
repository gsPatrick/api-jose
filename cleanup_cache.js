const { sequelize } = require('./src/config/db');

async function cleanup() {
    try {
        console.log("Cleaning up polluted SemanticCache table...");
        await sequelize.query('TRUNCATE TABLE "SemanticCaches" RESTART IDENTITY;');
        console.log("Cleanup complete! AI memory is now fresh.");
        process.exit(0);
    } catch (error) {
        console.error("Cleanup failed:", error.message);
        process.exit(1);
    }
}

cleanup();
