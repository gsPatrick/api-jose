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

const GREETINGS = ['oi', 'olá', 'ola', 'menu', 'inicio', 'início', 'reset', 'começar', 'bom dia', 'boa tarde', 'boa noite', 'ajuda', 'termos'];

class AIAgentService {
    updateState(client, stage, extraData = {}) {
        client.update({ conversation_stage: stage, ...extraData }).catch(() => { });
    }

    async generateResponse(clientNumber, textInput) {
        const start = Date.now();
        const input = textInput.trim();
        const lowerInput = input.toLowerCase();

        let response = "";
        let isFinal = false;

        try {
            // 1. GREETINGS
            if (GREETINGS.some(g => lowerInput === g || lowerInput.startsWith(g + ' '))) {
                const client = await ClientService.findOrCreateClient(clientNumber);
                if (lowerInput === 'termos') {
                    this.updateState(client, 'WAITING_TERMS');
                    response = TERMS_TEXT;
                } else if (!client.conversation_stage || client.conversation_stage === 'START') {
                    this.updateState(client, 'WAITING_TERMS');
                    response = `🌾 Olá! Sou o Mohsis, assistente de informação do Dr. [Nome].\n\nAntes de continuar, você aceita nossos termos de uso?`;
                } else {
                    this.updateState(client, 'MENU_SHOWN');
                    response = MENU_TEXT;
                }
                isFinal = true;
            }

            // 2. NUMERIC MENUS
            if (!isFinal && /^\d+$/.test(input) && input.length <= 2) {
                const client = await ClientService.findOrCreateClient(clientNumber);
                const stage = client.conversation_stage;

                switch (stage) {
                    case 'MENU_SHOWN':
                        if (input === '1') { this.updateState(client, 'WAITING_MONITORAMENTO_SUBOPTION'); response = MONITORAMENTO_MENU; }
                        else if (input === '2') { response = `📈 *MERCADO*: Em breve.\n[0] Voltar`; }
                        else if (input === '3') { response = `⚖️ *REGRAS*: Em breve.\n[0] Voltar`; }
                        else if (input === '4') { this.updateState(client, 'WAITING_LAWYER_CONTACT'); response = "📅 *Agendar*: Envie Nome e Cidade."; }
                        else if (input === '0') { response = MENU_TEXT; }
                        break;
                    case 'WAITING_MONITORAMENTO_SUBOPTION':
                        if (input === '1') { this.updateState(client, 'WAITING_CLIMATE_CITY'); response = "🌦️ *CLIMA*\nInforme o município:"; }
                        else if (input === '0') { this.updateState(client, 'MENU_SHOWN'); response = MENU_TEXT; }
                        break;
                    case 'WAITING_TERMS':
                        if (input === '0') { this.updateState(client, 'START'); response = "Até mais! 🌾"; }
                        break;
                    default:
                        if (input === '0') { this.updateState(client, 'MENU_SHOWN'); response = MENU_TEXT; }
                }
                if (response) isFinal = true;
            }

            // 3. TERMS ACCEPTANCE
            if (!isFinal && (lowerInput.includes('aceito') || lowerInput.includes('continuar'))) {
                const client = await ClientService.findOrCreateClient(clientNumber);
                if (client.conversation_stage === 'WAITING_TERMS') {
                    this.updateState(client, 'MENU_SHOWN');
                    response = MENU_TEXT;
                    isFinal = true;
                }
            }

            // 4. CLIMATE FLOW
            if (!isFinal) {
                const client = await ClientService.findOrCreateClient(clientNumber);
                if (client.conversation_stage === 'WAITING_CLIMATE_CITY') {
                    const ClimateService = require('../External_Context/Climate/Climate.service');
                    const coords = await ClimateService.getCoordinates(input);
                    if (!coords) response = `❌ Município não encontrado. Tente novamente:`;
                    else {
                        const station = await ClimateService.findNearestInmetStation(coords.latitude, coords.longitude);
                        this.updateState(client, 'WAITING_CLIMATE_PERIOD', { farm_location: { ...coords, station } });
                        response = `✅ Estação: ${station?.name || 'NASA'}\nInforme o período (ex: jan a mar 2024):`;
                    }
                    isFinal = true;
                }
            }

            // 5. AI FALLBACK
            if (!isFinal) {
                const embedding = await RAGService.generateEmbedding(input);
                const cached = await RAGService.getSemanticHit(embedding);
                if (cached) response = cached;
                else {
                    const chunks = await RAGService.searchChunks(embedding);
                    const context = chunks.map(c => c.text).join('\n\n');
                    const completion = await openai.chat.completions.create({
                        model: "gpt-4o-mini",
                        messages: [
                            { role: "system", content: `Aja como o assistente Mohsis. Contexto: ${context}` },
                            { role: "user", content: input }
                        ]
                    });
                    response = completion.choices[0].message.content;
                    RAGService.learnResponse(input, embedding, response).catch(() => { });
                }
            }

            // ADD PERFORMANCE FOOTER
            const duration = Date.now() - start;
            return `${response}\n\n_⚡ Processado em ${duration}ms_`;

        } catch (error) {
            console.error("[AGENT_ERROR]:", error);
            return "Ocorreu um erro. Digite 'Menu' para reiniciar.";
        }
    }
}

module.exports = new AIAgentService();
