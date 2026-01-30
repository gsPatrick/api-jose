const ClientService = require('./Client.service');

exports.getClient = async (req, res) => {
    try {
        const { whatsapp_number } = req.params;
        const client = await ClientService.findOrCreateClient(whatsapp_number);
        res.json(client);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.updateStatus = async (req, res) => {
    try {
        const { whatsapp_number } = req.params;
        const { status } = req.body;
        const client = await ClientService.updateClientStatus(whatsapp_number, status);
        res.json(client);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
