const OpenAI = require('openai');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const os = require('os');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

class MediaService {
    async downloadFile(url, extension) {
        const response = await axios({
            url,
            method: 'GET',
            responseType: 'stream',
        });
        const tempPath = path.join(os.tmpdir(), `media_${Date.now()}.${extension}`);
        const writer = fs.createWriteStream(tempPath);

        response.data.pipe(writer);

        return new Promise((resolve, reject) => {
            writer.on('finish', () => resolve(tempPath));
            writer.on('error', reject);
        });
    }

    async transcribeAudio(url) {
        let filePath = null;
        try {
            console.log('Downloading audio from:', url);
            filePath = await this.downloadFile(url, 'ogg'); // Assuming OGG from WhatsApp usually

            console.log('Transcribing audio file:', filePath);
            const transcription = await openai.audio.transcriptions.create({
                file: fs.createReadStream(filePath),
                model: "whisper-1",
            });

            return transcription.text;
        } catch (error) {
            console.error("Error transcribing audio:", error);
            throw error;
        } finally {
            if (filePath && fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }
    }

    async extractDataFromImage(url) {
        try {
            console.log('Extracting data from image:', url);
            // GPT-4o Vision can take URL directly in most cases, or base64. 
            // Sending URL directly is efficient if public.

            const prompt = `
            Analise esta imagem (cédula de crédito ou laudo) e extraia os seguintes dados estruturados em JSON:
            - valor_principal (number)
            - data_vencimento (string, format YYYY-MM-DD)
            - taxa_juros (number, percentage)
            - nosso_numero (string)
            
            Se algum campo não estiver visível, retorne null.
            Retorne APENAS o JSON, sem markdown.
            `;

            const response = await openai.chat.completions.create({
                model: "gpt-4o",
                messages: [
                    {
                        role: "user",
                        content: [
                            { type: "text", text: prompt },
                            {
                                type: "image_url",
                                image_url: {
                                    url: url,
                                },
                            },
                        ],
                    },
                ],
                max_tokens: 300,
            });

            const content = response.choices[0].message.content;
            // Clean markdown if present
            const jsonString = content.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(jsonString);

        } catch (error) {
            console.error("Error extracting data from image:", error);
            throw error;
        }
    }
}

module.exports = new MediaService();
