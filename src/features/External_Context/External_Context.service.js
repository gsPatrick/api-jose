class ExternalContextService {
    async getBacenRates() {
        console.log("ExternalContext: Fetching BACEN rates (Mock)...");
        return { selic: 11.25, cdi: 11.15 };
    }

    async getHistoricalClimate(location) {
        console.log(`ExternalContext: Fetching climate for ${location} (Mock)...`);
        return { rainfall_mm: 120, temp_avg: 25 };
    }
}

module.exports = new ExternalContextService();
