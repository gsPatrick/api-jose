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

            // Check if it's a message event
            // Based on logs: EventType: "messages"
            // The message data is inside payload.message
            if (payload.EventType !== 'messages' || !payload.message) {
                return;
            }

            const messageData = payload.message;

            // Ignore messages sent by the API itself or by the owner
            if (messageData.fromMe || messageData.wasSentByApi) return;

            // Extract sender phone number
            // Structure: "chatid": "557182862912@s.whatsapp.net" or "sender_pn": "557182862912@s.whatsapp.net"
            // We need to clean the "@s.whatsapp.net" suffix
            let rawPhone = messageData.chatid || messageData.sender_pn;
            const phone = rawPhone ? rawPhone.split('@')[0] : null;

            if (!phone) {
                console.warn("Could not identify sender phone number in webhook payload.");
                return;
            }

            // Ensure client exists
            await ClientService.findOrCreateClient(phone);

            // Determine Message Type
            const messageType = messageData.type; // 'text', 'image', 'audio', etc.

            // --- TEXT MESSAGE ---
            if (messageType === 'text') {
                const textContent = messageData.text || messageData.content;

                if (textContent) {
                    console.log(`Received text from ${phone}: ${textContent}`);
                    const aiResponse = await AIAgentService.generateResponse(phone, textContent);
                    await this.sendMessage(phone, aiResponse);
                }
            }

            // --- AUDIO MESSAGE ---
            else if (messageType === 'audio' || messageType === 'ptt') {
                // In UazapiGO, mediaUrl might be in different fields depending on version/config
                // Checking common candidates
                const audioUrl = messageData.mediaUrl || messageData.url || messageData.file;

                if (audioUrl) {
                    console.log(`Received audio from ${phone}: ${audioUrl}`);
                    const transcription = await MediaService.transcribeAudio(audioUrl);
                    // Generate AI response based on transcription
                    const aiResponse = await AIAgentService.generateResponse(phone, transcription);
                    await this.sendMessage(phone, aiResponse);
                } else {
                    console.warn(`Audio received from ${phone} but no URL found in payload.`);
                }
            }

            // --- IMAGE MESSAGE (OCR) ---
            else if (messageType === 'image') {
                const imageUrl = messageData.mediaUrl || messageData.url || messageData.file;

                if (imageUrl) {
                    console.log(`Received image from ${phone}: ${imageUrl}`);
                    // Process with Vision API
                    const extractionData = await MediaService.extractDataFromImage(imageUrl);
                    const responseText = `Recebi seu documento. Dados identificados:\n${jsonToFriendlyText(extractionData)}`;
                    await this.sendMessage(phone, responseText);
                }
            }

        } catch (error) {
            console.error("Error processing Uazapi webhook:", error);
        }
    }
}

// Helper for image response
function jsonToFriendlyText(data) {
    if (!data) return "Não consegui ler nada.";
    return Object.entries(data)
        .map(([key, val]) => `*${key}:* ${val}`)
        .join('\n');
}
}

module.exports = new UazapiService();
