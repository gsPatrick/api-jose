const axios = require('axios');
const AIAgentService = require('../AI_Agent/AI_Agent.service');
const MediaService = require('../Media_Processor/Media_Processor.service');
const ClientService = require('../Client/Client.service');

class UazapiService {
    constructor() {
        // subdomain and token from .env
        this.subdomain = process.env.UAZAPI_SUBDOMAIN || 'api';
        this.token = process.env.UAZAPI_TOKEN;

        // Base URL: https://{subdomain}.uazapi.com
        this.baseUrl = `https://${this.subdomain}.uazapi.com`;
    }

    /**
     * Sends a text message via Uazapi
     * Endpoint: POST /send/text
     */
    async sendMessage(phone, text) {
        try {
            if (!this.token) {
                console.error("Uazapi Token not configured.");
                return;
            }

            const payload = {
                number: phone,
                text: text,
                linkPreview: true // Optional as per docs
            };

            const response = await axios.post(`${this.baseUrl}/send/text`, payload, {
                headers: {
                    'token': this.token,
                    'Content-Type': 'application/json'
                }
            });

            console.log(`Message sent to ${phone} via Uazapi. ID: ${response.data?.messageId || 'unknown'}`);
        } catch (error) {
            console.error("Error sending Uazapi message:", error.response?.data || error.message);
        }
    }

    /**
     * Process incoming webhook events
     * NOTE: Payload structure is inferred as generic since documentation didn't explicitly detail the INCOMING JSON.
     * We will log the payload to help with debugging.
     */
    async processWebhook(payload) {
        try {
            console.log("Uazapi Webhook Payload Received:", JSON.stringify(payload, null, 2));

            // Basic check to see if it's a message event
            // Adjust these checks based on actual payload observation
            // Assuming payload contains 'event' or 'type' or just the message object

            // Example generic extraction (needs validation against real payload)
            const eventType = payload.event || payload.type;
            const messageData = payload.message || payload; // fallback

            // Ignore own messages (if indicator exists)
            if (messageData.fromMe) return;

            const phone = messageData.remoteJid || messageData.from || payload.number || payload.phone;
            if (!phone) {
                console.warn("Could not identify sender phone number in webhook payload.");
                return;
            }

            // Ensure client exists
            await ClientService.findOrCreateClient(phone);

            // Determine content type
            const textContent = messageData.text || messageData.body || (messageData.conversation ? messageData.conversation : null);
            const mediaType = messageData.mediaType || messageData.type;

            if (textContent && (!mediaType || mediaType === 'chat' || mediaType === 'text')) {
                // Dispatch to AI Agent
                console.log(`Received text from ${phone}: ${textContent}`);
                const aiResponse = await AIAgentService.generateResponse(phone, textContent);
                await this.sendMessage(phone, aiResponse);

            } else if (mediaType === 'audio' || mediaType === 'ptt') {
                // Check for audio URL
                const audioUrl = messageData.mediaUrl || messageData.url || messageData.file;

                if (audioUrl) {
                    console.log(`Received audio from ${phone}: ${audioUrl}`);
                    const transcription = await MediaService.transcribeAudio(audioUrl);
                    const aiResponse = await AIAgentService.generateResponse(phone, transcription);
                    await this.sendMessage(phone, aiResponse);
                } else {
                    console.warn("Audio received but no URL found.");
                }

            } else if (mediaType === 'image') {
                const imageUrl = messageData.mediaUrl || messageData.url || messageData.file;
                if (imageUrl) {
                    console.log(`Received image from ${phone}: ${imageUrl}`);
                    const extractionData = await MediaService.extractDataFromImage(imageUrl);
                    const responseText = `Dados extraídos: ${JSON.stringify(extractionData, null, 2)}`;
                    await this.sendMessage(phone, responseText);
                }
            }

        } catch (error) {
            console.error("Error processing Uazapi webhook:", error);
        }
    }
}

module.exports = new UazapiService();
