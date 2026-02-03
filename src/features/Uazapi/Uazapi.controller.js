const UazapiService = require('./Uazapi.service');

exports.webhook = async (req, res) => {
    // 1. FAST FILTER: Only process "messages" EventType
    // This ignores EventType: "chats", "messages_update" (Read receipts), etc.
    if (!req.body || req.body.EventType !== 'messages') {
        return res.status(200).send('Event Ignored');
    }

    // 2. Return 200 immediately to acknowledge receipt
    res.status(200).send('OK');

    // 3. Process asynchronously
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
