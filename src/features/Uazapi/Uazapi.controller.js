const UazapiService = require('./Uazapi.service');

exports.webhook = async (req, res) => {
    const arrivalTime = Date.now();

    // 1. FAST FILTER: Only process "messages" EventType
    if (!req.body || req.body.EventType !== 'messages') {
        return res.status(200).send('Event Ignored');
    }

    // 2. TIMING DIAGNOSTICS: Compare WhatsApp timestamp with Arrival time
    if (req.body.message && req.body.message.messageTimestamp) {
        // WhatsApp timestamp is in seconds, convert to ms
        const waTimestamp = req.body.message.messageTimestamp;
        const networkDelay = arrivalTime - waTimestamp;
        console.log(`[NETWORK_LATENCY] Webhook traveled for ${networkDelay}ms before reaching our server.`);
    }

    // 3. CRITICAL: Ignore messages sent BY the bot (fromMe)
    if (req.body.message && req.body.message.fromMe === true) {
        return res.status(200).send('Self-message Ignored');
    }

    // 4. Return 200 immediately to acknowledge receipt
    res.status(200).send('OK');

    // 5. Process asynchronously
    try {
        await UazapiService.processWebhook(req.body);
    } catch (err) {
        console.error("Error in async Uazapi webhook processing:", err);
    }
};

exports.sendMessage = async (req, res) => {
    try {
        const { number, text } = req.body;
        if (!number || !text) return res.status(400).json({ error: 'number and text required' });

        await UazapiService.sendMessage(number, text);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
