const Client = require('../../models/Client');
const logger = require('../../utils/logger');

// In-memory cache for active clients to avoid DB hit on every message
const clientCache = new Map();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

class ClientService {
    async findOrCreateClient(whatsappNumber) {
        const start = Date.now();
        // 1. Check Cache
        const cached = clientCache.get(whatsappNumber);
        if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
            return cached.client;
        }

        try {
            // Use findOne + create instead of findOrCreate to minimize locks
            let client = await Client.findOne({ where: { whatsapp_number: whatsappNumber } });

            if (!client) {
                logger.info(`[CLIENT_SERVICE] Creating new client for ${whatsappNumber}`);
                client = await Client.create({
                    whatsapp_number: whatsappNumber,
                    status: 'novo'
                });
            }

            // 2. Define proxy with reference to itself for cache updates
            const updateCache = (obj) => {
                clientCache.set(whatsappNumber, { client: obj, timestamp: Date.now() });
            };

            const proxy = new Proxy(client, {
                get: (target, prop) => {
                    if (prop === 'update') {
                        return async (values) => {
                            const upStart = Date.now();
                            const result = await target.update(values);
                            updateCache(proxy);
                            return result;
                        };
                    }
                    return target[prop];
                }
            });

            // 3. Initial Save to Cache
            updateCache(proxy);
            const duration = Date.now() - start;
            if (duration > 500) logger.warn(`[CLIENT_SERVICE] Slow DB fetch: ${duration}ms for ${whatsappNumber}`);

            return proxy;
        } catch (error) {
            logger.error(`[CLIENT_SERVICE] Error for ${whatsappNumber}: ${error.message}`);
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
