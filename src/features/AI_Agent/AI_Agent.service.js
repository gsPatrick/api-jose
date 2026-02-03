const OpenAI = require('openai');
const RAGService = require('../RAG_Core/RAG_Core.service');
const BaserowService = require('../External_Context/Baserow/Baserow.service');
const ClientService = require('../Client/Client.service');

const { httpsAgent } = require('../../config/axios.config');
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    httpAgent: httpsAgent
});

// --- DETERMINISTIC STATIC TEXTS ---
const MENU_TEXT = `✅ Ótimo! Como posso ajudar?\n\nEscolha uma opção:\n\n` +
    `[🌱 1] Monitoramento da Safra\n` +
    `[📈 2] Mercado e Produção\n` +
    `[⚖️ 3] Alongamento e Prorrogação\n` +
    `[📅 4] Análise de caso Individual (Agendar)\n\n` +
    `[0] 🔙 Voltar / Menu Inicial\n\n` +
    `_Responda com o número (1, 2, 3 ou 4)_`;

const MONITORAMENTO_MENU = `🌱 *MONITORAMENTO DA SAFRA*\n\nEscolha uma opção:\n\n` +
    `[1] 🌦️ Dados Climáticos\n` +
    `[2] 🌱 ZARC, risco climático da cultura\n` +
    `[3] 📷 Análise de frustração de safra\n\n` +
    `[0] 🔙 Voltar ao menu principal`;

const TERMS_TEXT = `🔒 *TERMOS DE CIÊNCIA E PRIVACIDADE*\n\n` +
    `Ao continuar, você autoriza o tratamento dos seus dados para triagem e agendamento.\n\n` +
    `Deseja aceitar e continuar?\n✅ [Aceitar e continuar] | ❌ [Não aceito]`;

const GREETINGS = ['oi', 'olá', 'ola', 'ol', 'oie', 'oa', 'bom dia', 'boa tarde', 'boa noite', 'menu', 'inicio', 'início', 'reset', 'começar', 'ajuda', 'termos', 'voltar'];

class AIAgentService {
    updateState(client, stage, extraData = {}) {
        client.update({ conversation_stage: stage, ...extraData }).catch(() => { });
    }

    async generateResponse(clientNumber, textInput) {
        const start = Date.now();
        const input = textInput.trim();
        const lowerInput = input.toLowerCase();

        console.log(`[ROUTING] Incoming "${input}" for ${clientNumber}`);

        let responseText = "";

        try {
            const client = await ClientService.findOrCreateClient(clientNumber);
            const stage = client.conversation_stage || 'START';

            // 1. FUZZY GREETING (Only if NOT in a waiting-input stage like CLIMATE_CITY)
            const isWaitingInput = stage.startsWith('WAITING_CLIMATE') || stage === 'WAITING_LAWYER_CONTACT';
            const isGreeting = GREETINGS.some(g => lowerInput === g || lowerInput.startsWith(g + ' ')) ||
                (!isWaitingInput && lowerInput.length <= 3 && /^[a-z]+$/.test(lowerInput));

            if (isGreeting) {
                console.log(`[ROUTING] Greeting detected: ${lowerInput}`);
                if (lowerInput === 'termos') {
                    this.updateState(client, 'WAITING_TERMS');
                    responseText = TERMS_TEXT;
                } else if (stage === 'START' || stage === 'START_CHOBOT') {
                    this.updateState(client, 'WAITING_TERMS');
                    responseText = `🌾 Olá! Sou o Mohsis, assistente de informação do Dr. [Nome].\n\nAntes de continuar, você aceita nossos termos de uso?`;
                } else {
                    this.updateState(client, 'MENU_SHOWN');
                    responseText = MENU_TEXT;
                }
            }

            // 2. NUMERIC MENUS
            if (!responseText && /^\d+$/.test(input) && input.length <= 2) {
                console.log(`[ROUTING] Numeric logic in stage: ${stage}`);
                switch (stage) {
                    case 'MENU_SHOWN':
                        if (input === '1') { this.updateState(client, 'WAITING_MONITORAMENTO_SUBOPTION'); responseText = MONITORAMENTO_MENU; }
                        else if (input === '2') { responseText = `📈 *MERCADO*: Em breve.\n[0] Voltar`; }
                        else if (input === '3') { responseText = `⚖️ *REGRAS*: Em breve.\n[0] Voltar`; }
                        else if (input === '4') { this.updateState(client, 'WAITING_LAWYER_CONTACT'); responseText = "📅 *Agendar*: Envie Nome e Cidade."; }
                        else if (input === '0') { responseText = MENU_TEXT; }
                        break;
                    case 'WAITING_MONITORAMENTO_SUBOPTION':
                        if (input === '1') { this.updateState(client, 'WAITING_CLIMATE_CITY'); responseText = "🌦️ *CLIMA*\nInforme o município:"; }
                        else if (input === '0') { this.updateState(client, 'MENU_SHOWN'); responseText = MENU_TEXT; }
                        break;
                    default:
                        if (input === '0') { this.updateState(client, 'MENU_SHOWN'); responseText = MENU_TEXT; }
                        else {
                            responseText = MENU_TEXT;
                            this.updateState(client, 'MENU_SHOWN');
                        }
                }
            }

            // 3. TERMS ACCEPTANCE
            if (!responseText && (lowerInput.includes('aceito') || lowerInput.includes('continuar') || lowerInput === 'sim' || lowerInput === 'ok')) {
                if (stage === 'WAITING_TERMS') {
                    this.updateState(client, 'MENU_SHOWN');
                    responseText = MENU_TEXT;
                }
            }

            // 4. FLOWS (Climate/Lead)
            if (!responseText) {
                if (stage === 'WAITING_CLIMATE_CITY') {
                    const ClimateService = require('../External_Context/Climate/Climate.service');
                    console.log(`[FLOW] Searching coordinates for city: ${input}`);
                    const coords = await ClimateService.getCoordinates(input);
                    if (!coords) {
                        responseText = `❌ Município "${input}" não encontrado. Tente novamente ou digite "Menu" para voltar:`;
                    } else {
                        const station = await ClimateService.findNearestInmetStation(coords.latitude, coords.longitude);
                        this.updateState(client, 'WAITING_CLIMATE_PERIOD', { farm_location: { ...coords, station } });
                        responseText = `✅ Cidade: ${input}\n📍 Estação: ${station?.name || 'NASA'}\n\nInforme o período desejado (ex: jan a mar 2024):`;
                    }
                } else if (stage === 'WAITING_CLIMATE_PERIOD') {
                    const ClimateService = require('../External_Context/Climate/Climate.service');

                    // 1. Interpret dates with AI
                    const dateCompletion = await openai.chat.completions.create({
                        model: "gpt-4o-mini",
                        messages: [
                            { role: "system", content: "Extraia startDate e endDate (YYYY-MM-DD). Se for um período passado, use o ano mencionado ou 2024 por padrão. Retorne apenas JSON: { \"startDate\": \"...\", \"endDate\": \"...\" }" },
                            { role: "user", content: input }
                        ],
                        response_format: { type: "json_object" }
                    });

                    try {
                        const { startDate, endDate } = JSON.parse(dateCompletion.choices[0].message.content);
                        const farmLoc = client.farm_location;

                        // 2. Fetch data (passing 30 as dummy days since custom dates are provided)
                        const climateData = await ClimateService.getInmetData(farmLoc.latitude, farmLoc.longitude, 30, startDate, endDate);

                        // 3. Summarize with AI
                        const summaryCompletion = await openai.chat.completions.create({
                            model: "gpt-4o-mini",
                            messages: [
                                { role: "system", content: "Aja como Mohsis, assistente agrícola. Resuma estes dados climáticos para o produtor rural. Foque nos totais de chuva e temperaturas médias/máximas de forma amigável." },
                                { role: "user", content: `Dados para o período ${input} em ${farmLoc.name || 'sua região'}:\n${JSON.stringify(climateData)}` }
                            ]
                        });

                        responseText = summaryCompletion.choices[0].message.content;
                        this.updateState(client, 'MENU_SHOWN');
                    } catch (err) {
                        console.error("Error in climate period flow:", err);
                        responseText = "❌ Não consegui processar essa data ou obter dados para este período. Tente outro formato (ex: jan a mar 2024):";
                    }
                }
            }

            // 5. AI FALLBACK
            if (!responseText) {
                const embedding = await RAGService.generateEmbedding(input);
                const cached = await RAGService.getSemanticHit(embedding);
                if (cached) {
                    responseText = cached;
                } else {
                    const chunks = await RAGService.searchChunks(embedding);
                    const context = chunks.map(c => c.text).join('\n\n');
                    const completion = await openai.chat.completions.create({
                        model: "gpt-4o-mini",
                        messages: [
                            { role: "system", content: `Aja como o assistente Mohsis. Se for apenas saudação, peça para digitar 'Menu'. Caso contrário, use: ${context}` },
                            { role: "user", content: input }
                        ]
                    });
                    responseText = completion.choices[0].message.content;
                    RAGService.learnResponse(input, embedding, responseText).catch(() => { });
                }
            }

            return responseText;

        } catch (error) {
            console.error("[AGENT_ERROR]:", error);
            return "Ocorreu um erro. Digite 'Menu' para reiniciar.";
        }
    }
}

module.exports = new AIAgentService();
