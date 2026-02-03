const UazapiService = require('./Uazapi.service');

exports.webhook = async (req, res) => {
    // 1. FAST FILTER: Only process "messages" EventType
    if (!req.body || req.body.EventType !== 'messages') {
        return res.status(200).send('Event Ignored');
    }

    // 2. CRITICAL: Ignore messages sent BY the bot (fromMe)
    // This prevents infinite loops where the bot responds to its own messages.
    if (req.body.message && req.body.message.fromMe === true) {
        return res.status(200).send('Self-message Ignored');
    }

    // 3. Return 200 immediately to acknowledge receipt
    res.status(200).send('OK');

    // 4. Process asynchronously
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
