const axios = require('axios');
const AIAgentService = require('../AI_Agent/AI_Agent.service');
const MediaService = require('../Media_Processor/Media_Processor.service');
const ClientService = require('../Client/Client.service');

class UazapiService {
    constructor() {
        // subdomain and token from .env
        this.subdomain = process.env.UAZAPI_SUBDOMAIN || 'api';
        this.token = process.env.UAZAPI_TOKEN;

        // If subdomain is full URL, use it directly. Otherwise construct it.
        if (this.subdomain.startsWith('http')) {
            this.baseUrl = this.subdomain;
        } else {
            this.baseUrl = `https://${this.subdomain}.uazapi.com`;
        }
    }

    /**
     * Sends a text message via Uazapi
     * Endpoint: POST /send/text
     */
    async sendMessage(phone, content) {
        try {
            if (!this.token) {
                console.error("Uazapi Token not configured.");
                return;
            }

            // If content is an object with 'listMessage', use sendListMessage instead
            if (typeof content === 'object' && content.listMessage) {
                return await this.sendListMessage(phone, content.listMessage);
            }

            // Default Text Message
            const payload = {
                number: phone,
                text: typeof content === 'string' ? content : JSON.stringify(content),
                linkPreview: true
            };

            const response = await axios.post(`${this.baseUrl}/send/text`, payload, {
                headers: {
                    'token': this.token,
                    'apikey': this.token,
                    'Content-Type': 'application/json'
                }
            });

            console.log(`Message sent to ${phone} via Uazapi. ID: ${response.data?.messageId || 'unknown'}`);
        } catch (error) {
            console.error("Error sending Uazapi message:", error.response?.data || error.message);
        }
    }

    /**
     * Sends a List Message (Menu) via Uazapi
     * Endpoint: POST /send/list
     */
    async sendListMessage(phone, listData) {
        try {
            const payload = {
                number: phone,
                title: listData.title,
                description: listData.description,
                buttonText: listData.buttonText || "Abrir Menu",
                sections: listData.sections
            };

            const response = await axios.post(`${this.baseUrl}/send/list`, payload, {
                headers: {
                    'token': this.token,
                    'apikey': this.token,
                    'Content-Type': 'application/json'
                }
            });
            console.log(`List Message sent to ${phone}. ID: ${response.data?.messageId || 'unknown'}`);
        } catch (error) {
            console.error("Error sending List Message:", error.response?.data || error.message);
            // Fallback to text if List fails (optional resilience)
            await this.sendMessage(phone, `${listData.title}\n${listData.description}\n\n(Digite o número da opção desejada)`);
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

            // Determine Message Type - checking multiple fields for resilience across versions
            const type = messageData.type; // 'text' OR 'media'
            const mediaType = messageData.mediaType; // 'ptt', 'image'

            // --- TEXT MESSAGE ---
            if (type === 'text' || (type === 'extended' && messageData.text)) {
                const textContent = messageData.text || messageData.content; // Content is usually string for text

                // If content is an object (common in some libs), try extracting text property
                const finalText = typeof textContent === 'object' ? textContent.text : textContent;

                if (finalText) {
                    console.log(`Received text from ${phone}: ${finalText}`);
                    const aiResponse = await AIAgentService.generateResponse(phone, finalText);
                    await this.sendMessage(phone, aiResponse);
                }
            }

            // --- AUDIO MESSAGE ---
            else if (mediaType === 'audio' || mediaType === 'ptt' || type === 'audio') {
                // Audio URL location varies.
                // Log shows: content: { URL: "..." }
                let audioUrl = null;

                if (messageData.content && messageData.content.URL) {
                    audioUrl = messageData.content.URL;
                } else {
                    // Fallback to older fields
                    audioUrl = messageData.mediaUrl || messageData.url || messageData.file;
                }

                if (audioUrl) {
                    console.log(`Received audio from ${phone}: ${audioUrl}`);
                    const transcription = await MediaService.transcribeAudio(audioUrl);
                    // Generate AI response based on transcription
                    const aiResponse = await AIAgentService.generateResponse(phone, transcription);
                    await this.sendMessage(phone, aiResponse);
                } else {
                    console.warn(`Audio received from ${phone} but no URL found in payload properties.`);
                }
            }

            // --- IMAGE MESSAGE (OCR) ---
            else if (mediaType === 'image' || type === 'image') {
                let imageUrl = null;

                if (messageData.content && messageData.content.URL) {
                    imageUrl = messageData.content.URL;
                } else {
                    imageUrl = messageData.mediaUrl || messageData.url || messageData.file;
                }

                if (imageUrl) {
                    console.log(`Received image from ${phone}: ${imageUrl}`);
                    // Process with Vision API
                    const extractionData = await MediaService.extractDataFromImage(imageUrl);
                    const responseText = `Recebi seu documento. Dados identificados:\n${jsonToFriendlyText(extractionData)}`;
                    await this.sendMessage(phone, responseText);
                }
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

module.exports = new UazapiService();
