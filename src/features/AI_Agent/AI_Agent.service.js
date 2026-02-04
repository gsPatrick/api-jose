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
        const startTime = Date.now();
        const input = textInput.trim();
        const lowerInput = input.toLowerCase();

        try {
            const client = await ClientService.findOrCreateClient(clientNumber);
            const stage = client.conversation_stage || 'START';
            const isTriageStage = stage.startsWith('TRIAGEM');

            console.log(`[ROUTING] Client: ${clientNumber} | Stage: ${stage} | Input: "${input}"`);

            // 0. HIGH PRIORITY COMMANDS (Exit/Delete)
            if (lowerInput === 'sair' || lowerInput === 'encerrar') {
                this.updateState(client, 'SAIR');
                return STATE_TEXTS.SAIR;
            }
            if (lowerInput === 'apagar' || lowerInput === 'excluir') {
                this.updateState(client, 'APAGAR');
                return STATE_TEXTS.APAGAR;
            }

            // 1. INITIAL CONTACT (Forced Triage)
            if (stage === 'START' || stage === 'START_CHOBOT') {
                this.updateState(client, 'TRIAGEM8');
                return `${STATE_TEXTS.MENU_INTRO}\n\n${STATE_TEXTS.TRIAGEM8}`;
            }

            // 2. TRIAGE PERSISTENCE (Block greetings from resetting until done)
            if (isTriageStage && stage !== 'TRIAGEMRESULTADO') {
                // Determine if input is valid for the current triage step
                if (stage === 'TRIAGEM8') {
                    if (/^[a-d1-4]$/i.test(input)) {
                        let choice = input.toUpperCase();
                        if (choice === '1') choice = 'A';
                        if (choice === '2') choice = 'B';
                        if (choice === '3') choice = 'C';
                        if (choice === '4') choice = 'D';
                        this.updateState(client, 'TRIAGEMQ2', { last_triagem_q1: choice });
                        return STATE_TEXTS.TRIAGEMQ2;
                    }
                } else if (stage === 'TRIAGEMQ2' && /^[1-4]$/.test(input)) {
                    this.updateState(client, 'TRIAGEMQ3', { last_triagem_q2: input });
                    return STATE_TEXTS.TRIAGEMQ3;
                } else if (stage === 'TRIAGEMQ3') {
                    this.updateState(client, 'TRIAGEMRESULTADO', { last_triagem_q3: input });
                    return STATE_TEXTS.TRIAGEMRESULTADO;
                }

                // If it's a greeting during triage, DO NOT reset to Menu. Just remind them.
                const isGreeting = /^(oi|ola|olá|oie|bom dia|boa tarde|boa noite)/i.test(lowerInput);
                if (isGreeting) {
                    return stage === 'TRIAGEM8' ? STATE_TEXTS.TRIAGEM8 : (stage === 'TRIAGEMQ2' ? STATE_TEXTS.TRIAGEMQ2 : STATE_TEXTS.TRIAGEMQ3);
                }
            }

            // 3. GLOBAL COMMANDS (Only available after triage or via explicit shortcut)
            const isMenuCmd = /^(m|menu|inicio|início|bom dia|boa tarde|boa noite|oi|ola|olá|oie)/i.test(lowerInput);
            if (isMenuCmd) {
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

            // 4. STATE MACHINE LOGIC
            let responseText = "";

            // --- MENU NAVIGATION ---
            if (/^\d+$/.test(input) && input.length <= 2) {
                switch (stage) {
                    case 'MENU':
                    case 'TRIAGEMRESULTADO':
                        if (input === '1') { this.updateState(client, 'MENU1'); responseText = STATE_TEXTS.MENU1; }
                        else if (input === '2') { this.updateState(client, 'MENU2'); responseText = STATE_TEXTS.MENU2; }
                        else if (input === '3') { this.updateState(client, 'MENU3'); responseText = STATE_TEXTS.MENU3; }
                        else if (input === '4') { this.updateState(client, 'MENU4'); responseText = STATE_TEXTS.MENU4; }
                        else if (input === '5') { this.updateState(client, 'MENU5'); responseText = STATE_TEXTS.MENU5; }
                        break;
                    case 'MENU1':
                        if (input === '1') {
                            this.updateState(client, 'WAITING_CLIMATE_CITY');
                            responseText = `${STATE_TEXTS.M1CLIMA}\n\n🌦️ *Informe o nome do seu município abaixo:*`;
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
                }
            }

            // --- TEXT-BASED STATE FLOWS ---
            if (!responseText) {
                if (stage === 'HANDOFF0') {
                    this.updateState(client, 'HANDOFFCONFIRM', { last_lead_note: input });
                    BaserowService.saveLead({ phone: clientNumber, note: input, stage: 'HANDOFF' }).catch(() => { });
                    responseText = STATE_TEXTS.HANDOFFCONFIRM;
                }
                else if (stage === 'WAITING_CLIMATE_CITY') {
                    const ClimateService = require('../External_Context/Climate/Climate.service');
                    const coords = await ClimateService.getCoordinates(input);
                    if (!coords) {
                        responseText = `❌ Município "${input}" não encontrado. Tente novamente ou mande M:`;
                    } else {
                        const station = await ClimateService.findNearestInmetStation(coords.latitude, coords.longitude);
                        this.updateState(client, 'WAITING_CLIMATE_PERIOD', { farm_location: { ...coords, station } });
                        responseText = `✅ Localizado: ${input}\n📍 Estação: ${station?.name || 'NASA'}\n\nInforme o período (ex: jan a mar 2024):`;
                    }
                }
            }

            // --- AI FALLBACK ---
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
                            { role: "system", content: `${POLICY_TEXT}\n\nAja como o assistente Mohsis. Se o usuário estiver apenas cumprimentando, apresente-se e sugira o MENU (M).\nContexto técnico:\n${context}` },
                            { role: "user", content: input }
                        ]
                    });
                    responseText = completion.choices[0].message.content;
                    RAGService.learnResponse(input, embedding, responseText).catch(() => { });
                }
            }

            const totalTime = Date.now() - startTime;
            console.log(`[PERF] ${clientNumber} processed in ${totalTime}ms`);
            return responseText;

        } catch (error) {
            console.error("[AGENT_ERROR]:", error);
            return "Ocorreu um erro. Digite M para voltar ao início.";
        }
    }
}

module.exports = new AIAgentService();
