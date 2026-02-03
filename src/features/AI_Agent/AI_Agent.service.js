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

// Expanded greetings to be more fuzzy
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

            // 1. FUZZY GREETING DETECTION (Catch common typos and short starts)
            const isGreeting = GREETINGS.some(g => lowerInput === g || lowerInput.startsWith(g + ' ')) || (lowerInput.length <= 3 && /^[a-z]+$/.test(lowerInput));

            if (isGreeting) {
                console.log(`[ROUTING] Greeting detected for: ${lowerInput}`);
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

            // 2. NUMERIC MENUS (Strictly Deterministic)
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
                            // If user sends a number in a non-menu stage but it's small, show menu
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
                if (stage === 'WAITING_CLIMATE_CITY' && input.length > 3) {
                    const ClimateService = require('../External_Context/Climate/Climate.service');
                    const coords = await ClimateService.getCoordinates(input);
                    if (!coords) responseText = `❌ Município não encontrado. Tente novamente:`;
                    else {
                        const station = await ClimateService.findNearestInmetStation(coords.latitude, coords.longitude);
                        this.updateState(client, 'WAITING_CLIMATE_PERIOD', { farm_location: { ...coords, station } });
                        responseText = `✅ Estação: ${station?.name || 'NASA'}\nInforme o período (ex: jan a mar 2024):`;
                    }
                }
            }

            // 5. AI FALLBACK (Knowledge Base)
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
                            { role: "system", content: `Aja como o assistente Mohsis. Se o usuário estiver apenas saudando, você pode sugerir digitar 'Menu'. Caso contrário, use o contexto: ${context}` },
                            { role: "user", content: input }
                        ]
                    });
                    responseText = completion.choices[0].message.content;
                    RAGService.learnResponse(input, embedding, responseText).catch(() => { });
                }
            }

            // FINAL FORMATTING
            const duration = Date.now() - start;
            return `${responseText}\n\n_⚡ Processado em ${duration}ms_`;

        } catch (error) {
            console.error("[AGENT_ERROR]:", error);
            return "Ocorreu um erro no processamento. Digite 'Menu' para voltar.";
        }
    }
}

module.exports = new AIAgentService();
