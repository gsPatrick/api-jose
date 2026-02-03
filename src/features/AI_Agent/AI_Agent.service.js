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

            // 1. GLOBAL COMMANDS (Intersects everything)
            if (lowerInput === 'm' || lowerInput === 'menu' || lowerInput === 'inicio' || lowerInput === 'início') {
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

            // 2. STATE MACHINE LOGIC
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
                        if (input === '1') { this.updateState(client, 'WAITING_CLIMATE_CITY'); responseText = "🌦️ *CLIMA*\nInforme o município:"; }
                        else if (input === '2') { this.updateState(client, 'M1_CAIXA'); responseText = STATE_TEXTS.M1_CAIXA; }
                        else if (input === '3') { this.updateState(client, 'M1_PROPOSTA'); responseText = STATE_TEXTS.M1_PROPOSTA; }
                        else if (input === '4') { this.updateState(client, 'M1_CHECKLIST'); responseText = STATE_TEXTS.M1_CHECKLIST; }
                        else if (input === '5') { this.updateState(client, 'M1_URGENTE'); responseText = STATE_TEXTS.M1_URGENTE; }
                        break;

                    case 'MENU2':
                        if (input === '1') { responseText = STATE_TEXTS.MENU2; }
                        else if (input === '2') { responseText = STATE_TEXTS.MENU2; }
                        else if (input === '3') { this.updateState(client, 'M2_DIFERENCA'); responseText = STATE_TEXTS.M2_DIFERENCA; }
                        else if (input === '4') { responseText = STATE_TEXTS.DOCS9; }
                        else if (input === '5') { this.updateState(client, 'M2PONTOSATENCAO'); responseText = STATE_TEXTS.M2PONTOSATENCAO; }
                        break;

                    case 'MENU3':
                        if (input === '1') { this.updateState(client, 'M3_GARANTIA'); responseText = STATE_TEXTS.M3_GARANTIA; }
                        else if (input === '5') { this.updateState(client, 'M3URGENTEJUDICIAL'); responseText = STATE_TEXTS.M3URGENTEJUDICIAL; }
                        break;

                    case 'MENU4':
                        if (input === '4') { this.updateState(client, 'M4_PENDENCIA'); responseText = STATE_TEXTS.M4_PENDENCIA; }
                        break;

                    case 'TRIAGEM8':
                        this.updateState(client, 'TRIAGEMQ2', { last_triagem_q1: input });
                        responseText = STATE_TEXTS.TRIAGEMQ2;
                        break;

                    case 'TRIAGEMQ2':
                        this.updateState(client, 'TRIAGEMQ3', { last_triagem_q2: input });
                        responseText = STATE_TEXTS.TRIAGEMQ3;
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
                    this.updateState(client, 'TRIAGEM_RESULTADO', { last_triagem_q3: input });
                    responseText = STATE_TEXTS.TRIAGEM_RESULTADO;
                }
                // HANDOFF FLOW (Save to Baserow when finished)
                else if (stage === 'HANDOFF0') {
                    // Start collecting lead data (Basic implementation, could be more granular)
                    this.updateState(client, 'HANDOFF_CONFIRM', { last_lead_note: input });
                    // Mock Baserow save
                    BaserowService.saveLead({ phone: clientNumber, note: input, stage: 'HANDOFF' }).catch(() => { });
                    responseText = STATE_TEXTS.HANDOFF_CONFIRM;
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
                                { role: "user", content: `Dados para ${input} em ${farmLoc.displayName}:\n${JSON.stringify(climateData)}` }
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
                if (stage === 'START' || stage === 'START_CHOBOT' || lowerInput.length < 3) {
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
