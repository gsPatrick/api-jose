const Client = require('../../models/Client');

// In-memory cache for active clients to avoid DB hit on every message
const clientCache = new Map();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

class ClientService {
    async findOrCreateClient(whatsappNumber) {
        // 1. Check Cache
        const cached = clientCache.get(whatsappNumber);
        if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
            return cached.client;
        }

        try {
            const [client, created] = await Client.findOrCreate({
                where: { whatsapp_number: whatsappNumber },
                defaults: { status: 'novo' }
            });

            // 2. Save to Cache
            clientCache.set(whatsappNumber, { client, timestamp: Date.now() });
            return client;
        } catch (error) {
            console.error("Error in findOrCreateClient:", error);
            throw error;
        }
    }

    async updateClientStatus(whatsappNumber, status) {
        try {
            await Client.update(
                { status: status },
                { where: { whatsapp_number: whatsappNumber } }
            );
            return await Client.findOne({ where: { whatsapp_number: whatsappNumber } });
        } catch (error) {
            console.error("Error updating client status:", error);
            throw error;
        }
    }
}

module.exports = new ClientService();
