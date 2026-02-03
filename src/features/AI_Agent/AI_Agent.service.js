const OpenAI = require('openai');
const RAGService = require('../RAG_Core/RAG_Core.service');
const BaserowService = require('../External_Context/Baserow/Baserow.service');
const ClientService = require('../Client/Client.service');

// Initialize OpenAI once
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// --- CONSTANTS (Menu Texts) ---
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

const MERCADO_MENU = `📈 *MERCADO E PRODUÇÃO*\n\nEscolha uma opção:\n\n` +
    `[1] 📊 Preços do mercado rural\n` +
    `[2] 🌾 Produção agrícola\n` +
    `[3] 🐄 Pecuária e indicadores\n\n` +
    `[0] 🔙 Voltar ao menu principal`;

const RULES_MENU = `⚖️ *ALONGAMENTO E PRORROGAÇÃO*\n\nEscolha um tema para informação geral:\n\n` +
    `[A] Prorrogação de dívidas\n` +
    `[B] Alongamento de contratos\n` +
    `[C] Renegociação\n\n` +
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
        client.update({ conversation_stage: stage, ...extraData }).catch(err => {
            console.error(`[DB_UPDATE_ERROR] Stage: ${stage}`, err.message);
        });
    }

    async generateResponse(clientNumber, textInput) {
        // Resolve circular dependency lazily but once
        const UazapiService = require('../Uazapi/Uazapi.service');

        try {
            const input = textInput.trim();
            const lowerInput = input.toLowerCase();

            // 1. FAST PATH: Numeric/Short commands (100% Deterministic If/Else)
            const isNumeric = /^\d+$/.test(input);
            const isShort = input.length <= 15; // Covers "Sim", "Aceito", etc.

            // Get Client State (Cached in ClientService)
            const client = await ClientService.findOrCreateClient(clientNumber);
            let currentState = client.conversation_stage || 'START';

            // GREETING ROUTER
            if (GREETINGS.some(g => lowerInput === g || lowerInput.startsWith(g + ' '))) {
                if (lowerInput === 'termos') {
                    this.updateState(client, 'WAITING_TERMS');
                    return TERMS_TEXT;
                }
                if (!client.conversation_stage || client.conversation_stage === 'START') {
                    this.updateState(client, 'WAITING_TERMS');
                    return `🌾 Olá! Sou o Mohsis, assistente de informação do Dr. [Nome].\n\n` +
                        `⚠️ Importante: Sou uma ferramenta de informação e triagem. Não realizo análises jurídicas.\n\n` +
                        `Antes de continuar, você aceita nossos termos de uso?\n[Ver termos] [Aceitar e continuar] [Não quero continuar]`;
                }
                this.updateState(client, 'MENU_SHOWN');
                return MENU_TEXT;
            }

            // MENU ROUTER (Deterministic)
            if (isNumeric || isShort) {
                // WAITING_TERMS
                if (currentState === 'WAITING_TERMS') {
                    if (lowerInput.includes('aceit') || lowerInput.includes('sim') || lowerInput.includes('continuar')) {
                        this.updateState(client, 'MENU_SHOWN');
                        return MENU_TEXT;
                    }
                    if (lowerInput.includes('termo')) return TERMS_TEXT;
                    if (lowerInput.includes('não') || lowerInput.includes('nao')) {
                        this.updateState(client, 'START');
                        return "Entendido! Sem problemas. Se mudar de ideia, é só enviar uma mensagem. 🌾";
                    }
                }

                // MENU_SHOWN
                if (currentState === 'MENU_SHOWN') {
                    if (input === '1') { this.updateState(client, 'WAITING_MONITORAMENTO_SUBOPTION'); return MONITORAMENTO_MENU; }
                    if (input === '2') { this.updateState(client, 'WAITING_MERCADO_SUBOPTION'); return MERCADO_MENU; }
                    if (input === '3') { this.updateState(client, 'WAITING_RULES_SUBOPTION'); return RULES_MENU; }
                    if (input === '4' || lowerInput.includes('agendar')) {
                        this.updateState(client, 'WAITING_LAWYER_CONTACT');
                        return "📅 *Análise de caso Individual (Agendar)*\n\nPor favor informe (separado por vírgulas):\n1. Nome\n2. Município\n3. Tema\n4. Prioridade (sim/no)";
                    }
                    if (input === '0') { this.updateState(client, 'MENU_SHOWN'); return MENU_TEXT; }
                }

                // MONITORAMENTO_SUBOPTION
                if (currentState === 'WAITING_MONITORAMENTO_SUBOPTION') {
                    if (input === '0') { this.updateState(client, 'MENU_SHOWN'); return MENU_TEXT; }
                    if (input === '1') { this.updateState(client, 'WAITING_CLIMATE_CITY'); return "🌦️ *Consulta a Dados Climáticos Públicos*\n\nInforme o município para consulta:\nExemplo: Uberlândia"; }
                    if (input === '2') return `📊 *ZARC*:\n\n📱 Baixe o App **Plantio Certo**\n💻 Acesse: https://www.gov.br/agricultura/pt-br/assuntos/riscos-seguro/zarc\n\n[0] Voltar`;
                    if (input === '3') return "📷 *Análise de frustração de safra*\n\n⚠️ Em desenvolvimento.\n[0] Voltar";
                }

                // CLIMATE_PERIOD CTA Redirects
                if (lowerInput.includes('nova consulta')) {
                    this.updateState(client, 'WAITING_CLIMATE_CITY');
                    return "🌦️ *Consulta Climática*\n\nInforme o município:";
                }
                if (lowerInput.includes('voltar ao menu')) {
                    this.updateState(client, 'MENU_SHOWN');
                    return MENU_TEXT;
                }
            }

            // 2. FLOW PATHS (Clima & Lead) 
            if (currentState === 'WAITING_CLIMATE_CITY' && !isNumeric) {
                const ClimateService = require('../External_Context/Climate/Climate.service');
                UazapiService.sendMessage(clientNumber, `🔍 Buscando "${input}"...`);
                const coords = await ClimateService.getCoordinates(input);
                if (!coords) return `❌ Município não encontrado. Tente novamente:`;
                const station = await ClimateService.findNearestInmetStation(coords.latitude, coords.longitude);
                if (!station) return `❌ Sem estação próxima. Tente outro município:`;
                this.updateState(client, 'WAITING_CLIMATE_PERIOD', { farm_location: { ...coords, station } });
                return `✅ Estação: ${station.name}\n\nInforme o período (DD/MM/AAAA a DD/MM/AAAA):`;
            }

            if (currentState === 'WAITING_CLIMATE_PERIOD' && !isNumeric) {
                const ClimateService = require('../External_Context/Climate/Climate.service');
                const locationData = client.farm_location;
                const matches = [...input.matchAll(/(\d{2})[\/.-](\d{2})[\/.-](\d{4})/g)];
                let start = null, end = null;
                if (matches.length >= 2) {
                    start = `${matches[0][3]}-${matches[0][2]}-${matches[0][1]}`;
                    end = `${matches[1][3]}-${matches[1][2]}-${matches[1][1]}`;
                }
                const data = await ClimateService.getInmetData(locationData.latitude, locationData.longitude, 90, start, end);
                this.updateState(client, 'MENU_SHOWN');
                if (data && data.data) {
                    const totalRain = data.data.reduce((s, d) => s + (d.precipitation || 0), 0).toFixed(1);
                    return `🌦️ *INMET*\n📍 ${locationData.displayName}\n🌧️ Chuva Total: ${totalRain} mm\n\n[Nova consulta] [Voltar ao menu]`;
                }
                return `⚠️ Sem dados. [Voltar ao menu]`;
            }

            if (currentState === 'WAITING_LAWYER_CONTACT' && !isNumeric) {
                UazapiService.sendMessage(clientNumber, `⏳ Enviando...`);
                const parts = input.split(',');
                BaserowService.saveLead({ whatsapp: clientNumber, name: parts[0], location: parts[1], topic: parts[2] }).catch(() => { });
                this.updateState(client, 'MENU_SHOWN');
                return `✅ Recebido! Entraremos em contato.\n\n[0] Voltar`;
            }

            // 3. AI PATH: RAG (Only if not numeric/short or explicitly triggered)
            if (isNumeric && input.length <= 2) return `❌ Opção inválida.\n\n` + MENU_TEXT;

            console.log(`[RAG] Processing: ${input}`);
            const embedding = await RAGService.generateEmbedding(input);
            const cached = await RAGService.getSemanticHit(embedding);
            if (cached) return cached;

            UazapiService.sendMessage(clientNumber, `⏳ Analisando...`);
            const chunks = await RAGService.searchChunks(embedding);
            const context = chunks.map(c => c.text).join('\n\n');
            const completion = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    { role: "system", content: `Você é o MOHSIS, assistente jurídico agrário. Use o contexto: ${context}` },
                    { role: "user", content: input }
                ],
            });
            const response = completion.choices[0].message.content;
            RAGService.learnResponse(input, embedding, response).catch(() => { });
            return response;

        } catch (error) {
            console.error("Critical Error:", error);
            return "Erro técnico. Digite 'Menu' para voltar.";
        }
    }
}

module.exports = new AIAgentService();
