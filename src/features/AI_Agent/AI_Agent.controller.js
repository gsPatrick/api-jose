const AIAgentService = require('./AI_Agent.service');

exports.handleMessage = async (req, res) => {
    try {
        const { clientNumber, message } = req.body;
        if (!clientNumber || !message) {
            return res.status(400).json({ error: 'clientNumber and message required' });
        }

        const response = await AIAgentService.generateResponse(clientNumber, message);
        res.json({ response });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
