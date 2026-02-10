const axios = require('axios');
const logger = require('../../../utils/logger');

class HubSpotService {
    constructor() {
        this.accessToken = process.env.HUBSPOT_ACCESS_TOKEN;
        this.baseURL = 'https://api.hubapi.com/crm/v3/objects/contacts';
    }

    /**
     * Creates a new contact in HubSpot or updates mapping
     * @param {Object} data - { whatsapp, name, location, topic, priority }
     */
    async createContact(data) {
        if (!this.accessToken || this.accessToken.includes('your-hubspot-pat-token-here')) {
            logger.warn('HubSpot integration not configured. Skipping contact creation.');
            return null;
        }

        try {
            const payload = {
                properties: {
                    firstname: data.name || 'Produtor Rural',
                    mobilephone: data.whatsapp || '',
                    city: data.location || '',
                    industry: 'Agronegócio',
                    // Custom mapping if exists or using general note fields
                    hs_content_membership_notes: `Tema: ${data.topic} | Urgência: ${data.priority} | Data: ${new Date().toLocaleString('pt-BR')}`,
                    lifecyclestage: 'lead'
                }
            };

            const response = await axios.post(this.baseURL, payload, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            logger.info(`[HUBSPOT_SUCCESS] Contact created: ${response.data.id}`);
            return response.data;
        } catch (error) {
            this.handleError(error);
            return null;
        }
    }

    handleError(error) {
        const errorData = error.response?.data || { message: error.message };
        logger.error(`[HUBSPOT_ERROR] Status: ${error.response?.status} | Details: ${JSON.stringify(errorData)}`);

        if (error.response?.status === 409) {
            logger.info('[HUBSPOT_CONFLICT] Contact already exists.');
        }
    }
}

module.exports = new HubSpotService();
