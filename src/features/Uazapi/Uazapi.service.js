const axios = require('../../config/axios.config');
const MediaService = require('../Media_Processor/Media_Processor.service');
const ClientService = require('../Client/Client.service');

class UazapiService {
    constructor() {
        this.baseUrl = process.env.UAZAPI_SUBDOMAIN;
        this.token = process.env.UAZAPI_TOKEN;
    }

    async sendMessage(phone, message) {
        if (!message) return;

        try {
            const payload = {
                number: phone,
                text: message,
                linkPreview: false // Disabled for maximum reliability and speed
            };

            const start = Date.now();
            const response = await axios.post(`${this.baseUrl}/send/text`, payload, {
                headers: {
                    'token': this.token,
                    'apikey': this.token,
                    'Content-Type': 'application/json'
                }
            });
            const duration = Date.now() - start;

            // Log detailed response for debugging if needed, but keep console clean
            const resData = response.data;
            console.log(`[UAZAPI_SEND] Sent to ${phone} in ${duration}ms. Status: ${resData.status || 'OK'}`);
        } catch (error) {
            console.error("[UAZAPI_ERROR] Failed to send message:", error.response?.data || error.message);
        }
    }

    async processWebhook(payload) {
        // Since we now filter in the controller, we know EventType is 'messages'
        const message = payload.message;
        const phone = message.chatid.split('@')[0];

        // Ensure AIAgentService is loaded (Avoiding top-level circular dep)
        const AIAgentService = require('../AI_Agent/AI_Agent.service');

        // Handle text messages
        if (message.type === 'text' || message.text) {
            const finalText = message.text || message.content;
            if (finalText) {
                // Non-blocking processing
                (async () => {
                    const aiResponse = await AIAgentService.generateResponse(phone, finalText);
                    if (aiResponse) await this.sendMessage(phone, aiResponse);
                })().catch(err => console.error("[ASYNC_PROCESS_ERROR]:", err.message));
            }
        }

        // Handle media (Audio)
        if (message.type === 'audio' || message.mediaType === 'audio') {
            const base64Audio = message.content?.base64 || message.base64;
            const audioUrl = message.content?.url || message.url;

            (async () => {
                let transcription = "";
                if (base64Audio) {
                    transcription = await MediaService.transcribeAudio(base64Audio, true);
                } else if (audioUrl) {
                    transcription = await MediaService.transcribeAudio(audioUrl, false);
                }

                if (transcription) {
                    const aiResponse = await AIAgentService.generateResponse(phone, transcription);
                    await this.sendMessage(phone, aiResponse);
                }
            })().catch(err => console.error("[AUDIO_PROCESS_ERROR]:", err.message));
        }

        // Handle images
        if (message.type === 'image' || message.mediaType === 'image') {
            const base64Image = message.content?.base64 || message.base64;
            (async () => {
                if (base64Image) {
                    const dataUri = `data:image/jpeg;base64,${base64Image}`;
                    const extractionData = await MediaService.extractDataFromImage(dataUri);
                    const aiResponse = await AIAgentService.generateResponse(phone, `[DADOS_IMG]: ${JSON.stringify(extractionData)}`);
                    await this.sendMessage(phone, aiResponse);
                }
            })().catch(err => console.error("[IMAGE_PROCESS_ERROR]:", err.message));
        }
    }
}

module.exports = new UazapiService();
