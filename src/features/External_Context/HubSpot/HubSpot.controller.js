const logger = require('../../../utils/logger');

class HubSpotController {
    /**
     * Handles HubSpot Webhook events
     */
    async handleWebhook(req, res) {
        try {
            const events = req.body;

            // HubSpot sends an array of events
            if (Array.isArray(events)) {
                events.forEach(event => {
                    logger.info(`[HUBSPOT_WEBHOOK] Event: ${event.subscriptionType} | Object: ${event.objectId}`);
                    // Future: Add logic to sync back to local database if needed
                });
            } else {
                logger.info(`[HUBSPOT_WEBHOOK] Received non-array payload: ${JSON.stringify(events)}`);
            }

            // HubSpot expects a 200/204 response quickly
            return res.status(200).send('OK');
        } catch (error) {
            logger.error(`[HUBSPOT_WEBHOOK_ERR] ${error.message}`);
            return res.status(500).send('Internal Server Error');
        }
    }
}

module.exports = new HubSpotController();
