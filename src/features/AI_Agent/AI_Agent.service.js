const OpenAI = require('openai');
const RAGService = require('../RAG_Core/RAG_Core.service');
const BaserowService = require('../External_Context/Baserow/Baserow.service');
const ClientService = require('../Client/Client.service');
const { STATE_TEXTS, POLICY_TEXT } = require('./AIAgentStates');

const { httpsAgent } = require('../../config/axios.config');
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    httpAgent: httpsAgent
});

class AIAgentService {
    updateState(client, stage, extraData = {}) {
        client.update({ conversation_stage: stage, ...extraData }).catch(() => { });
    }

    async generateResponse(clientNumber, textInput) {
        const input = textInput.trim();
        const lowerInput = input.toLowerCase();

        console.log(`[ROUTING] Incoming "${input}" for ${clientNumber}`);

        try {
            const client = await ClientService.findOrCreateClient(clientNumber);
            const stage = client.conversation_stage || 'START';

            // 1. INITIAL TRIAGE (START Phase Priority)
            // No matter what the input is, if it's the first message, force Triage.
            if (stage === 'START' || stage === 'START_CHOBOT') {
                this.updateState(client, 'TRIAGEM8');
                return `${STATE_TEXTS.MENU_INTRO}\n\n${STATE_TEXTS.TRIAGEM8}`;
            }

            // 2. GLOBAL COMMANDS (Intersects everything after first contact)
            const isMenuGreeting = ['m', 'menu', 'inicio', 'início', 'ola', 'olá', 'oi', 'oie'].includes(lowerInput);
            if (isMenuGreeting) {
                this.updateState(client, 'MENU');
                return STATE_TEXTS.MENU;
            }
            if (lowerInput === '0' || lowerInput === 'atendimento' || lowerInput === 'humano') {
                this.updateState(client, 'HANDOFF0');
                return STATE_TEXTS.HANDOFF0;
            }
            if (lowerInput === '8' || lowerInput === 'triagem') {
                this.updateState(client, 'TRIAGEM8');
                return STATE_TEXTS.TRIAGEM8;
            }
            if (lowerInput === '9' || lowerInput === 'checklist' || lowerInput === 'documentos') {
                this.updateState(client, 'DOCS9');
                return STATE_TEXTS.DOCS9;
            }
            if (lowerInput === 'sair' || lowerInput === 'encerrar') {
                this.updateState(client, 'SAIR');
                return STATE_TEXTS.SAIR;
            }
            if (lowerInput === 'apagar' || lowerInput === 'excluir') {
                this.updateState(client, 'APAGAR');
                return STATE_TEXTS.APAGAR;
            }

            // 3. STATE MACHINE LOGIC
            let responseText = "";

            // --- MENU NAVIGATION ---
            if (/^\d+$/.test(input) && input.length <= 2) {
                switch (stage) {
                    case 'MENU':
                        if (input === '1') { this.updateState(client, 'MENU1'); responseText = STATE_TEXTS.MENU1; }
                        else if (input === '2') { this.updateState(client, 'MENU2'); responseText = STATE_TEXTS.MENU2; }
                        else if (input === '3') { this.updateState(client, 'MENU3'); responseText = STATE_TEXTS.MENU3; }
                        else if (input === '4') { this.updateState(client, 'MENU4'); responseText = STATE_TEXTS.MENU4; }
                        else if (input === '5') { this.updateState(client, 'MENU5'); responseText = STATE_TEXTS.MENU5; }
                        break;

                    case 'MENU1':
                        if (input === '1') {
                            this.updateState(client, 'WAITING_CLIMATE_CITY');
                            responseText = `${STATE_TEXTS.M1CLIMA}\n\n🌦️ *Para consultar os dados reais de chuva da sua região, informe o nome do município abaixo:*`;
                        }
                        else if (input === '2') { this.updateState(client, 'M1CAIXA'); responseText = STATE_TEXTS.M1CAIXA; }
                        else if (input === '3') { this.updateState(client, 'M1PROPOSTA'); responseText = STATE_TEXTS.M1PROPOSTA; }
                        else if (input === '4') { this.updateState(client, 'M1CHECKLIST'); responseText = STATE_TEXTS.M1CHECKLIST; }
                        else if (input === '5') { this.updateState(client, 'M1URGENTE'); responseText = STATE_TEXTS.M1URGENTE; }
                        break;

                    case 'MENU2':
                        if (input === '1') { this.updateState(client, 'M2_CULTURA'); responseText = STATE_TEXTS.M2_CULTURA; }
                        else if (input === '2') { this.updateState(client, 'M2_REDUZIR'); responseText = STATE_TEXTS.M2_REDUZIR; }
                        else if (input === '3') { this.updateState(client, 'M2DIFERENCA'); responseText = STATE_TEXTS.M2DIFERENCA; }
                        else if (input === '4') { responseText = STATE_TEXTS.DOCS9; }
                        else if (input === '5') { this.updateState(client, 'M2PONTOSATENCAO'); responseText = STATE_TEXTS.M2PONTOSATENCAO; }
                        break;

                    case 'MENU3':
                        if (input === '1') { this.updateState(client, 'M3GARANTIA'); responseText = STATE_TEXTS.M3GARANTIA; }
                        else if (input === '2') { this.updateState(client, 'M3_FAMILIA'); responseText = STATE_TEXTS.M3_FAMILIA; }
                        else if (input === '3') { this.updateState(client, 'M3_RISCO'); responseText = STATE_TEXTS.M3_RISCO; }
                        else if (input === '4') { responseText = STATE_TEXTS.DOCS9; }
                        else if (input === '5') { this.updateState(client, 'M3URGENTEJUDICIAL'); responseText = STATE_TEXTS.M3URGENTEJUDICIAL; }
                        break;

                    case 'MENU4':
                        if (input === '1') { this.updateState(client, 'M4_CAR'); responseText = STATE_TEXTS.M4_CAR; }
                        else if (input === '2') { this.updateState(client, 'M4_EMBARGO'); responseText = STATE_TEXTS.M4_EMBARGO; }
                        else if (input === '3') { this.updateState(client, 'M4_CHECKLIST_AMB'); responseText = STATE_TEXTS.M4_CHECKLIST_AMB; }
                        else if (input === '4') { this.updateState(client, 'M4PENDENCIA'); responseText = STATE_TEXTS.M4PENDENCIA; }
                        else if (input === '5') { this.updateState(client, 'M4_ZARC'); responseText = STATE_TEXTS.M4_ZARC; }
                        break;

                    case 'TRIAGEM8':
                        this.updateState(client, 'TRIAGEMQ2', { last_triagem_q1: input });
                        responseText = STATE_TEXTS.TRIAGEMQ2;
                        break;

                    case 'TRIAGEMQ2':
                        this.updateState(client, 'TRIAGEMQ3', { last_triagem_q2: input });
                        responseText = STATE_TEXTS.TRIAGEMQ3;
                        break;

                    case 'MENU5':
                        const policyNote = "\n\n⚠️ *Lembrete:* Isso é conteúdo informativo. Para aplicar ao seu caso, precisa análise humana.";
                        if (input === '1') responseText = `📚 *PRORROGAÇÃO/CLIMA*\n\nEm caso de quebra de safra por clima, o Manual de Crédito Rural (MCR) prevê a possibilidade de prorrogação das dívidas conforme a capacidade de pagamento.${policyNote}`;
                        else if (input === '2') responseText = `📚 *RENEGOCIAÇÃO*\n\nA renegociação permite ajustar taxas e prazos de contratos vigentes para evitar a inadimplência.${policyNote}`;
                        else if (input === '3') responseText = `📚 *ALONGAMENTO*\n\nO alongamento reorganiza o cronograma de pagamento por um período maior, diluindo o peso das parcelas.${policyNote}`;
                        else if (input === '4') responseText = `📚 *AMBIENTAL E CRÉDITO*\n\nPendências no CAR ou embargos ambientais podem impedir a liberação de novos recursos ou renovações.${policyNote}`;
                        else if (input === '5') responseText = `📚 *GARANTIAS E RISCOS*\n\nConhecer o impacto de garantias reais (imóveis) e pessoais (aval) é fundamental antes de assinar contratos.${policyNote}`;
                        break;
                }
            }

            // --- TEXT-BASED STATE FLOWS ---
            if (!responseText) {
                // TRIAGEM Q1 (A, B, C, D)
                if (stage === 'TRIAGEM8' && /^[a-d]$/i.test(input)) {
                    this.updateState(client, 'TRIAGEMQ2', { last_triagem_q1: input.toUpperCase() });
                    responseText = STATE_TEXTS.TRIAGEMQ2;
                }
                // TRIAGEM Q3 (Letters or N)
                else if (stage === 'TRIAGEMQ3') {
                    this.updateState(client, 'TRIAGEMRESULTADO', { last_triagem_q3: input });
                    responseText = STATE_TEXTS.TRIAGEMRESULTADO;
                }
                // HANDOFF FLOW (Save to Baserow when finished)
                else if (stage === 'HANDOFF0') {
                    this.updateState(client, 'HANDOFFCONFIRM', { last_lead_note: input });
                    BaserowService.saveLead({ phone: clientNumber, note: input, stage: 'HANDOFF' }).catch(() => { });
                    responseText = STATE_TEXTS.HANDOFFCONFIRM;
                }
                // CLIMATE FLOW (PRESERVED)
                else if (stage === 'WAITING_CLIMATE_CITY') {
                    const ClimateService = require('../External_Context/Climate/Climate.service');
                    const coords = await ClimateService.getCoordinates(input);
                    if (!coords) {
                        responseText = `❌ Município "${input}" não encontrado. Tente novamente ou mande M para o Menu:`;
                    } else {
                        const station = await ClimateService.findNearestInmetStation(coords.latitude, coords.longitude);
                        this.updateState(client, 'WAITING_CLIMATE_PERIOD', { farm_location: { ...coords, station } });
                        responseText = `✅ Cidade: ${input}\n📍 Estação: ${station?.name || 'NASA'}\n\nInforme o período desejado (ex: jan a mar 2024):`;
                    }
                }
                else if (stage === 'WAITING_CLIMATE_PERIOD') {
                    const ClimateService = require('../External_Context/Climate/Climate.service');
                    const dateCompletion = await openai.chat.completions.create({
                        model: "gpt-4o-mini",
                        messages: [
                            { role: "system", content: "Extraia startDate e endDate (YYYY-MM-DD). Use 2024 se não mencionado. Retorne apenas JSON: { \"startDate\": \"...\", \"endDate\": \"...\" }" },
                            { role: "user", content: input }
                        ],
                        response_format: { type: "json_object" }
                    });
                    try {
                        const { startDate, endDate } = JSON.parse(dateCompletion.choices[0].message.content);
                        const farmLoc = client.farm_location;
                        const climateData = await ClimateService.getInmetData(farmLoc.latitude, farmLoc.longitude, 30, startDate, endDate);
                        const summary = await openai.chat.completions.create({
                            model: "gpt-4o-mini",
                            messages: [
                                { role: "system", content: "Resuma dados climáticos para um produtor rural de forma concisa e amigável." },
                                { role: "user", content: `Dados para ${input} in ${farmLoc.displayName}:\n${JSON.stringify(climateData)}` }
                            ]
                        });
                        responseText = summary.choices[0].message.content;
                        this.updateState(client, 'MENU');
                    } catch (err) {
                        responseText = "❌ Erro ao obter dados climáticos. Tente outro período ou mande M:";
                    }
                }
            }

            // --- AI FALLBACK / GREETING ---
            if (!responseText) {
                if (lowerInput.length <= 3) {
                    this.updateState(client, 'MENU');
                    return STATE_TEXTS.MENU;
                }

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
                            { role: "system", content: `${POLICY_TEXT}\n\nAja como o assistente Mohsis. Contexto agrícola:\n${context}` },
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
            return "Ocorreu um erro. Digite M para voltar ao início.";
        }
    }
}

module.exports = new AIAgentService();
