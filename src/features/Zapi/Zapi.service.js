const axios = require('axios');
const MediaService = require('../Media_Processor/Media_Processor.service');
const ClientService = require('../Client/Client.service');

class ZapiService {
    constructor() {
        this.instanceId = process.env.ZAPI_INSTANCE_ID;
        this.token = process.env.ZAPI_TOKEN;
        this.clientToken = process.env.ZAPI_CLIENT_TOKEN;
        // Base URL: https://api.z-api.io/instances/{instanceId}/token/{token}
        this.baseUrl = `https://api.z-api.io/instances/${this.instanceId}/token/${this.token}`;
    }

    async sendMessage(phone, message) {
        if (!message) return;

        try {
            const payload = {
                phone: phone,
                message: message
            };

            const headers = {
                'Content-Type': 'application/json'
            };
            if (this.clientToken) {
                headers['Client-Token'] = this.clientToken;
            }

            const start = Date.now();
            await axios.post(`${this.baseUrl}/send-text`, payload, {
                headers,
                timeout: 10000
            });
            const duration = Date.now() - start;

            console.log(`[ZAPI_SEND] Sent to ${phone} in ${duration}ms.`);
        } catch (error) {
            console.error("[ZAPI_ERROR] Failed to send message:", error.response?.data || error.message);
        }
    }

    async processWebhook(payload) {
        // GLOBAL DEBUG: Log entire payload for Z-api troubleshooting
        console.log("[ZAPI_DEBUG] Incoming Webhook Payload:", JSON.stringify(payload, null, 2));

        const phone = payload.phone;
        if (!phone) return;

        // Ensure AIAgentService is loaded
        const AIAgentService = require('../AI_Agent/AI_Agent.service');

        // 1. Handle Text Messages
        if (payload.text && payload.text.message) {
            const textContent = payload.text.message;
            console.log(`[ZAPI_TEXT] Message from ${phone}: "${textContent}"`);

            (async () => {
                const aiResponse = await AIAgentService.generateResponse(phone, textContent);
                if (aiResponse) await this.sendMessage(phone, aiResponse);
            })().catch(err => console.error("[ZAPI_ASYNC_TEXT_ERROR]:", err.message));
        }

        // 2. Handle Audio Messages
        if (payload.audio && payload.audio.audioUrl) {
            const audioUrl = payload.audio.audioUrl;
            console.log(`[ZAPI_AUDIO] Audio from ${phone}: ${audioUrl}`);

            (async () => {
                // Send feedback
                await this.sendMessage(phone, "🎧 Ouvindo seu áudio...");

                const transcription = await MediaService.transcribeAudio(audioUrl, false);

                if (transcription) {
                    const aiResponse = await AIAgentService.generateResponse(phone, transcription);
                    await this.sendMessage(phone, aiResponse);
                } else {
                    await this.sendMessage(phone, "Não consegui entender o áudio. Pode escrever?");
                }
            })().catch(err => {
                console.error("[ZAPI_ASYNC_AUDIO_ERROR]:", err.message);
                this.sendMessage(phone, "⚠️ Erro no processamento de áudio.").catch(() => { });
            });
        }

        // 3. Handle Image Messages
        if (payload.image && payload.image.imageUrl) {
            const imageUrl = payload.image.imageUrl;
            console.log(`[ZAPI_IMAGE] Image from ${phone}: ${imageUrl}`);

            (async () => {
                // Z-api provides a direct URL for images in most cases
                const extractionData = await MediaService.extractDataFromImage(imageUrl);
                const aiResponse = await AIAgentService.generateResponse(phone, `[DADOS_IMG]: ${JSON.stringify(extractionData)}`);
                if (aiResponse) await this.sendMessage(phone, aiResponse);
            })().catch(err => console.error("[ZAPI_ASYNC_IMAGE_ERROR]:", err.message));
        }
    }
}

module.exports = new ZapiService();
