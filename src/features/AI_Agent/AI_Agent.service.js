const OpenAI = require('openai');
const RAGService = require('../RAG_Core/RAG_Core.service');
const BaserowService = require('../External_Context/Baserow/Baserow.service');
const ClientService = require('../Client/Client.service');

const axiosConfig = require('../../config/axios.config');
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    httpAgent: axiosConfig.defaults.httpAgent
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
    `O que o Mohsis faz:\n✅ Consulta dados públicos (IBAMA, INMET, SICAR)\n✅ Explica informações de forma educativa\n✅ Agenda consulta com o Dr. [Nome]\n\n` +
    `O que o Mohsis NÃO faz:\n❌ Análise jurídica de casos específicos\n❌ Emissão de laudos ou pareceres\n❌ Promessa de resultados\n\n` +
    `Ao continuar, você autoriza o tratamento dos seus dados para triagem e agendamento.\n\n` +
    `Deseja aceitar e continuar?\n✅ [Aceitar e continuar] | ❌ [Não aceito]`;

const GREETINGS = ['oi', 'olá', 'ola', 'menu', 'inicio', 'início', 'reset', 'começar', 'bom dia', 'boa tarde', 'boa noite', 'ajuda', 'termos'];

class AIAgentService {
    // Non-blocking state update
    updateState(client, stage, extraData = {}) {
        client.update({ conversation_stage: stage, ...extraData }).catch(() => { });
    }

    async generateResponse(clientNumber, textInput) {
        const globalStart = Date.now();
        console.log(`[AGENT_START] Message from ${clientNumber}: "${textInput.substring(0, 30)}"`);

        const UazapiService = require('../Uazapi/Uazapi.service');
        const input = textInput.trim();
        const lowerInput = input.toLowerCase();

        // 1. FAST PATH: Greetings (Deterministic)
        if (GREETINGS.some(g => lowerInput === g || lowerInput.startsWith(g + ' '))) {
            const client = await ClientService.findOrCreateClient(clientNumber);
            console.log(`[AGENT_TIME] Greeting path (Stage: ${client.conversation_stage}) took ${Date.now() - globalStart}ms`);

            if (lowerInput === 'termos') {
                this.updateState(client, 'WAITING_TERMS');
                return TERMS_TEXT;
            }
            if (!client.conversation_stage || client.conversation_stage === 'START') {
                this.updateState(client, 'WAITING_TERMS');
                return `🌾 Olá! Sou o Mohsis, assistente de informação do Dr. [Nome].\n\n⚠️ Importante: Sou uma ferramenta de informação e triagem. Não realizo análises jurídicas.\n\nAntes de continuar, você aceita nossos termos de uso?`;
            }
            this.updateState(client, 'MENU_SHOWN');
            return MENU_TEXT;
        }

        // 2. FAST PATH: Numeric (Menus)
        if (/^\d+$/.test(input) && input.length <= 2) {
            const client = await ClientService.findOrCreateClient(clientNumber);
            const currentState = client.conversation_stage;
            console.log(`[AGENT_TIME] Numeric path (Stage: ${currentState}) took ${Date.now() - globalStart}ms`);

            // Simple Switch Router - ZERO AI INVOLVED
            switch (currentState) {
                case 'MENU_SHOWN':
                    if (input === '1') { this.updateState(client, 'WAITING_MONITORAMENTO_SUBOPTION'); return MONITORAMENTO_MENU; }
                    if (input === '2') { this.updateState(client, 'WAITING_MERCADO_SUBOPTION'); return `📈 *MERCADO E PRODUÇÃO*\n\nEm breve novidades.\n[0] Voltar`; }
                    if (input === '3') { this.updateState(client, 'WAITING_RULES_SUBOPTION'); return `⚖️ *ALONGAMENTO E PRORROGAÇÃO*\n\nEm breve novidades.\n[0] Voltar`; }
                    if (input === '4') { this.updateState(client, 'WAITING_LAWYER_CONTACT'); return "📅 *Agendar*\nEnvie: Nome, Município, Tema."; }
                    if (input === '0') { this.updateState(client, 'MENU_SHOWN'); return MENU_TEXT; }
                    break;
                case 'WAITING_MONITORAMENTO_SUBOPTION':
                    if (input === '1') { this.updateState(client, 'WAITING_CLIMATE_CITY'); return "🌦️ *DADOS CLIMÁTICOS*\n\nInforme o município para consulta:\nExemplo: Uberlândia"; }
                    if (input === '0') { this.updateState(client, 'MENU_SHOWN'); return MENU_TEXT; }
                    break;
                case 'WAITING_TERMS':
                    if (input === '0') { this.updateState(client, 'START'); return "Encerrado. 🌾"; }
                    break;
                default:
                    // Fallback for numbers in wrong stages
                    if (input === '0') { this.updateState(client, 'MENU_SHOWN'); return MENU_TEXT; }
            }
            // If it falls through, it might be an invalid menu option
            if (input.length <= 2) return `❌ Opção inválida.\n\n` + MENU_TEXT;
        }

        // 3. SPECIAL COMMANDS (Deterministic)
        if (lowerInput.includes('aceito') || lowerInput.includes('continuar')) {
            const client = await ClientService.findOrCreateClient(clientNumber);
            if (client.conversation_stage === 'WAITING_TERMS') {
                this.updateState(client, 'MENU_SHOWN');
                return MENU_TEXT;
            }
        }

        // 4. FLOWS (Climate/Lead)
        const client = await ClientService.findOrCreateClient(clientNumber);
        const currentState = client.conversation_stage;

        if (currentState === 'WAITING_CLIMATE_CITY') {
            const ClimateService = require('../External_Context/Climate/Climate.service');
            UazapiService.sendMessage(clientNumber, `🔍 Buscando dados para "${input}"...`);
            const coords = await ClimateService.getCoordinates(input);
            if (!coords) return `❌ Município não encontrado. Tente novamente:`;
            const station = await ClimateService.findNearestInmetStation(coords.latitude, coords.longitude);
            if (!station) return `❌ Sem estação próxima. Tente outro município:`;
            this.updateState(client, 'WAITING_CLIMATE_PERIOD', { farm_location: { ...coords, station } });
            return `✅ Estação: ${station.name}\n\nInforme o período (ex: 01/01/2024 a 31/03/2024):`;
        }

        if (currentState === 'WAITING_CLIMATE_PERIOD') {
            const ClimateService = require('../External_Context/Climate/Climate.service');
            const data = await ClimateService.getInmetData(client.farm_location.latitude, client.farm_location.longitude, 90);
            this.updateState(client, 'MENU_SHOWN');
            if (data && data.data) {
                const rain = data.data.reduce((s, d) => s + (d.precipitation || 0), 0).toFixed(1);
                return `🌦️ *INMET*\n🌧️ Chuva: ${rain} mm\n\n[Nova consulta] [Voltar]`;
            }
            return `⚠️ Sem dados. [Voltar]`;
        }

        // 5. AI PATH (RAG) - Only for complex text
        console.log(`[RAG] Processing text query: ${input}`);
        const ragStart = Date.now();
        const embedding = await RAGService.generateEmbedding(input);
        const cached = await RAGService.getSemanticHit(embedding);
        if (cached) {
            console.log(`[AGENT_TIME] Semantic cache hit in ${Date.now() - ragStart}ms`);
            return cached;
        }

        UazapiService.sendMessage(clientNumber, `⏳ Analisando no banco jurídico...`);
        const chunks = await RAGService.searchChunks(embedding);
        const context = chunks.map(c => c.text).join('\n\n');
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: `Você é o assistente Mohsis. Use o contexto: ${context}` },
                { role: "user", content: input }
            ]
        });
        const response = completion.choices[0].message.content;
        RAGService.learnResponse(input, embedding, response).catch(() => { });

        console.log(`[AGENT_TIME] Full RAG path took ${Date.now() - ragStart}ms. Total: ${Date.now() - globalStart}ms`);
        return response;
    }
}

module.exports = new AIAgentService();
