const Client = require('../../models/Client');

class ClientService {
    async findOrCreateClient(whatsappNumber) {
        try {
            const [client, created] = await Client.findOrCreate({
                where: { whatsapp_number: whatsappNumber },
                defaults: { status: 'novo' }
            });
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
