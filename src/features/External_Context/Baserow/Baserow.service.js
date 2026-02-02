const axios = require('axios');

class BaserowService {
    constructor() {
        this.token = process.env.BASEROW_TOKEN;
        this.tableId = process.env.BASEROW_TABLE_ID;
        this.baseURL = process.env.BASEROW_URL || 'https://api.baserow.io';
    }

    /**
     * Save a lead to Baserow
     * @param {Object} data - Lead data { whatsapp, name, location, topic, priority }
     */
    async saveLead(data) {
        if (!this.token || !this.tableId) {
            console.warn('Baserow integration not configured. Skipping lead save.');
            return null;
        }

        try {
            const url = `${this.baseURL}/api/database/rows/table/${this.tableId}/?user_field_names=true`;

            // Map the human-readable fields to what Baserow expects.
            // Note: The user might need to name fields exactly like this in Baserow table
            // or we might need a mapping config.
            const payload = {
                'WhatsApp': data.whatsapp || '',
                'Nome': data.name || '',
                'Localizacao': data.location || '',
                'Tema': data.topic || '',
                'Prioridade': data.priority || 'Não',
                'Data': new Date().toISOString()
            };

            const response = await axios.post(url, payload, {
                headers: {
                    'Authorization': `Token ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log(`Lead saved to Baserow: ${response.data.id}`);
            return response.data;
        } catch (error) {
            console.error('Error saving lead to Baserow:', error.response?.data || error.message);
            // We don't want to crash the bot if CRM fails, so just log and continue
            return null;
        }
    }
}

module.exports = new BaserowService();
