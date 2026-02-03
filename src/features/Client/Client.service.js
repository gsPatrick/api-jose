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

            // 2. Define proxy with reference to itself for cache updates
            const updateCache = (obj) => {
                clientCache.set(whatsappNumber, { client: obj, timestamp: Date.now() });
            };

            const proxy = new Proxy(client, {
                get: (target, prop) => {
                    if (prop === 'update') {
                        return async (values) => {
                            const result = await target.update(values);
                            updateCache(proxy); // Update cache with the SAME proxy
                            return result;
                        };
                    }
                    return target[prop];
                }
            });

            // 3. Initial Save to Cache
            updateCache(proxy);
            return proxy;
        } catch (error) {
            console.error("Error in findOrCreateClient:", error);
            throw error;
        }
    }

    async updateClientStatus(whatsappNumber, status) {
        try {
            const client = await this.findOrCreateClient(whatsappNumber);
            await client.update({ status: status });
            return client;
        } catch (error) {
            console.error("Error updating client status:", error);
            throw error;
        }
    }
}

module.exports = new ClientService();
