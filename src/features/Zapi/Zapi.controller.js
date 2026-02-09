const ZapiService = require('./Zapi.service');

class ZapiController {
    /**
     * Webhook endpoint for Z-api
     * POST /api/zapi/webhook
     */
    async handleWebhook(req, res) {
        // Z-api sends webhooks for various events. We mostly care about messages.
        // Usually, message webhooks have specific fields.
        try {
            // Acknowledge receipt immediately to provider
            res.status(200).json({ status: 'received' });

            // Process asynchronously
            await ZapiService.processWebhook(req.body);
        } catch (err) {
            console.error("Error in Zapi webhook processing:", err);
        }
    }

    /**
     * Manual message trigger (for testing)
     * POST /api/zapi/send
     */
    async manualSend(req, res) {
        const { number, text } = req.body;
        if (!number || !text) {
            return res.status(400).json({ error: "Number and text required" });
        }

        try {
            await ZapiService.sendMessage(number, text);
            res.status(200).json({ status: 'Message queued' });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
}

module.exports = new ZapiController();
