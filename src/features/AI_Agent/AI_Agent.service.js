const OpenAI = require('openai');
const RAGService = require('../RAG_Core/RAG_Core.service');
const BaserowService = require('../External_Context/Baserow/Baserow.service');
const ClientService = require('../Client/Client.service');
const ClimateService = require('../External_Context/Climate/Climate.service');
const { STATE_TEXTS, POLICY_TEXT } = require('./AIAgentStates');
const logger = require('../../utils/logger');

const { httpsAgent } = require('../../config/axios.config');
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    httpAgent: httpsAgent
});

class AIAgentService {
    // Helper: Update state and save last_state for "V" command
    updateState(client, newState, extraData = {}) {
        const start = Date.now();
        const oldState = client.conversation_stage;

        // Don't save transient states or same state as history
        const dataToUpdate = { conversation_stage: newState, ...extraData };
        if (oldState && oldState !== newState && oldState !== 'SAIR' && oldState !== 'APAGAR') {
            dataToUpdate.last_conversation_stage = oldState;
        }

        client.update(dataToUpdate)
            .then(() => logger.info(`[DB_UPDATE] ${oldState} -> ${newState} saved in ${Date.now() - start}ms`))
            .catch(err => logger.error(`[DB_UPDATE_ERROR] ${err.message}`));
    }

    async generateResponse(clientNumber, textInput) {
        const startTime = Date.now();
        const input = textInput.trim();
        const upperInput = input.toUpperCase(); // Normalize for command checks

        logger.info(`[GEN_START] Client: ${clientNumber} | Input: "${input}"`);

        try {
            // 1. Load Client
            const dbStart = Date.now();
            const client = await ClientService.findOrCreateClient(clientNumber);
            logger.info(`[DB_CLIENT_LOADED] in ${Date.now() - dbStart}ms`);

            const stage = client.conversation_stage || 'START';

            // ---------------------------------------------------------
            // 2. GLOBAL ROUTER (Priority High)
            // ---------------------------------------------------------
            if (upperInput === 'SAIR' || upperInput === 'ENCERRAR') {
                this.updateState(client, 'SAIR');
                return STATE_TEXTS.SAIR;
            }
            if (upperInput === 'APAGAR' || upperInput === 'EXCLUIR') {
                this.updateState(client, 'APAGAR');
                return STATE_TEXTS.APAGAR;
            }
            if (upperInput === 'M' || upperInput === 'MENU' || upperInput === 'INICIO') {
                this.updateState(client, 'MENUPRINCIPAL');
                return STATE_TEXTS.MENUPRINCIPAL;
            }
            if (upperInput === '0' || upperInput === 'HUMANO' || upperInput === 'ADVOGADO') {
                this.updateState(client, 'HANDOFF0');
                return STATE_TEXTS.HANDOFF0;
            }
            // GREETINGS -> RESET TO START (User Expectation)
            const isGreeting = /^(OI|OLA|OLÁ|OIE|BOM DIA|BOA TARDE|BOA NOITE)/.test(upperInput);
            if (isGreeting) {
                this.updateState(client, 'START');
                return STATE_TEXTS.START;
            }
            if (upperInput === '8' || upperInput === 'TRIAGEM') {
                this.updateState(client, 'TRIAGEM8');
                return STATE_TEXTS.TRIAGEM8;
            }
            if (upperInput === '9' || upperInput === 'CHECKLIST') {
                this.updateState(client, 'DOCS9');
                return STATE_TEXTS.DOCS9;
            }
            // VOLTAR (V)
            if (upperInput === 'V' || upperInput === 'VOLTAR') {
                const target = client.last_conversation_stage || 'MENUPRINCIPAL';
                this.updateState(client, target); // Will update last_state again, behaving like a simple toggler or stack depending on logic. Simpler here: just go back.
                return STATE_TEXTS[target] || STATE_TEXTS.MENUPRINCIPAL;
            }

            // ---------------------------------------------------------
            // 3. HYBRID START (1 -> Triagem, 2 -> Menu)
            // ---------------------------------------------------------
            if (stage === 'START' || stage === 'START_CHOBOT') {
                if (input === '1') {
                    this.updateState(client, 'TRIAGEM8');
                    return STATE_TEXTS.TRIAGEM8;
                }
                if (input === '2') {
                    this.updateState(client, 'MENUPRINCIPAL');
                    return STATE_TEXTS.MENUPRINCIPAL;
                }
                // Fallback for Start
                return STATE_TEXTS.START; // Re-send intro
            }

            // ---------------------------------------------------------
            // 4. TRIAGEM PARSER (A-2-3)
            // ---------------------------------------------------------
            if (stage === 'TRIAGEM8') {
                // Regex for Letter (A-D) ... Number (1-3) ... Number (1-4)
                // Flexible with spaces and separators
                const match = upperInput.match(/([A-D])\s*[-/.,]?\s*([1-3])\s*[-/.,]?\s*([1-4])/);

                if (match) {
                    const [_full, tema, urgencia, doc] = match;

                    // Critical Urgency Rule
                    if (urgencia === '1') {
                        this.updateState(client, 'HANDOFF0', { last_triagem: input });
                        return STATE_TEXTS.TRIAGEM_DONE_URGENTE;
                    }

                    // Route by Theme
                    let targetState = 'MENUPRINCIPAL';
                    if (tema === 'A') targetState = 'MENU1';
                    if (tema === 'B') targetState = 'MENU2';
                    if (tema === 'C') targetState = 'MENU3';
                    if (tema === 'D') targetState = 'MENU4';

                    this.updateState(client, targetState, { last_triagem: input });
                    // Provide a small UX bridge if documents are in hand, or just show the menu
                    // User requested direct menu show
                    return STATE_TEXTS[targetState];
                }

                // Fallback for Triagem
                return STATE_TEXTS.FALLBACK_ANY;
            }

            // ---------------------------------------------------------
            // 5. DETERMINISTIC MENU ROUTING
            // ---------------------------------------------------------
            let responseText = "";
            const isNumeric = /^\d+$/.test(input) && input.length <= 2;

            if (isNumeric) {
                switch (stage) {
                    case 'MENUPRINCIPAL':
                        if (input === '1') { this.updateState(client, 'MENU1'); responseText = STATE_TEXTS.MENU1; }
                        else if (input === '2') { this.updateState(client, 'MENU2'); responseText = STATE_TEXTS.MENU2; }
                        else if (input === '3') { this.updateState(client, 'MENU3'); responseText = STATE_TEXTS.MENU3; }
                        else if (input === '4') { this.updateState(client, 'MENU4'); responseText = STATE_TEXTS.MENU4; }
                        else if (input === '5') { this.updateState(client, 'MENU5'); responseText = STATE_TEXTS.MENU5; }
                        else if (input === '0') { this.updateState(client, 'HANDOFF0'); responseText = STATE_TEXTS.HANDOFF0; }
                        break;
                    case 'MENU1':
                        if (input === '1') { this.updateState(client, 'M1CLIMA'); responseText = STATE_TEXTS.M1CLIMA; }
                        else if (input === '2') { this.updateState(client, 'M1CAIXA'); responseText = STATE_TEXTS.M1CAIXA; }
                        else if (input === '3') { this.updateState(client, 'M1PROPOSTA'); responseText = STATE_TEXTS.M1PROPOSTA; }
                        else if (input === '4') { this.updateState(client, 'M1CHECKLIST'); responseText = STATE_TEXTS.M1CHECKLIST; }
                        else if (input === '5') { this.updateState(client, 'M1URGENTE'); responseText = STATE_TEXTS.M1URGENTE; }
                        break;
                    case 'MENU2':
                        if (input === '1') { this.updateState(client, 'M2CICLOLONGO'); responseText = STATE_TEXTS.M2CICLOLONGO; }
                        else if (input === '2') { this.updateState(client, 'M2REDUZIR_PARCELA'); responseText = STATE_TEXTS.M2REDUZIR_PARCELA; }
                        else if (input === '3') { this.updateState(client, 'M2DIFERENCA'); responseText = STATE_TEXTS.M2DIFERENCA; }
                        else if (input === '4') { this.updateState(client, 'M2CHECKLIST_BANCO'); responseText = STATE_TEXTS.M2CHECKLIST_BANCO; }
                        else if (input === '5') { this.updateState(client, 'M2PONTOSATENCAO'); responseText = STATE_TEXTS.M2PONTOSATENCAO; }
                        break;
                    case 'MENU3':
                        if (input === '1') { this.updateState(client, 'M3GARANTIAGERAL'); responseText = STATE_TEXTS.M3GARANTIAGERAL; }
                        else if (input === '2') { this.updateState(client, 'M3PROPRIEDADEFAMILIA'); responseText = STATE_TEXTS.M3PROPRIEDADEFAMILIA; }
                        else if (input === '3') { this.updateState(client, 'M3RISCOSITUACOES'); responseText = STATE_TEXTS.M3RISCOSITUACOES; }
                        else if (input === '4') { this.updateState(client, 'M3CHECKLISTGARANTIAS'); responseText = STATE_TEXTS.M3CHECKLISTGARANTIAS; }
                        else if (input === '5') { this.updateState(client, 'M3URGENTEJUDICIAL'); responseText = STATE_TEXTS.M3URGENTEJUDICIAL; }
                        break;
                    case 'MENU4':
                        if (input === '1') { this.updateState(client, 'M4CARPASSOS'); responseText = STATE_TEXTS.M4CARPASSOS; }
                        else if (input === '2') { this.updateState(client, 'M4EMBARGOCREDITO'); responseText = STATE_TEXTS.M4EMBARGOCREDITO; }
                        else if (input === '3') { this.updateState(client, 'M4CHECKLISTANTESFINANCIAR'); responseText = STATE_TEXTS.M4CHECKLISTANTESFINANCIAR; }
                        else if (input === '4') { this.updateState(client, 'M4PENDENCIAPASSOS'); responseText = STATE_TEXTS.M4PENDENCIAPASSOS; }
                        else if (input === '5') { this.updateState(client, 'M4ZARCINFO'); responseText = STATE_TEXTS.M4ZARCINFO; }
                        break;
                    case 'MENU5':
                        if (input === '1') { this.updateState(client, 'RESUMO1PRORROGACAO'); responseText = STATE_TEXTS.RESUMO1PRORROGACAO; }
                        else if (input === '2') { this.updateState(client, 'RESUMO2RENEGOCIACAO'); responseText = STATE_TEXTS.RESUMO2RENEGOCIACAO; }
                        else if (input === '3') { this.updateState(client, 'RESUMO3ALONGAMENTO'); responseText = STATE_TEXTS.RESUMO3ALONGAMENTO; }
                        else if (input === '4') { this.updateState(client, 'RESUMO4AMBIENTAL'); responseText = STATE_TEXTS.RESUMO4AMBIENTAL; }
                        else if (input === '5') { this.updateState(client, 'RESUMO5GARANTIAS'); responseText = STATE_TEXTS.RESUMO5GARANTIAS; }
                        break;
                }
            }

            if (responseText) {
                logger.info(`[ROUTED] ${stage} -> ${isNumeric} -> OK`);
                return responseText;
            }

            // ---------------------------------------------------------
            // 6. TEXT HANDOFF (Urgência) & FLOWS
            // ---------------------------------------------------------
            if (stage === 'HANDOFF0') {
                this.updateState(client, 'HANDOFFCONFIRM');
                BaserowService.saveLead({ phone: clientNumber, note: input, stage: 'HANDOFF' }).catch(() => { });
                return STATE_TEXTS.HANDOFFCONFIRM;
            }

            // Urgency Detection (Guardrail 8)
            const urgencyKeywords = /CITAÇÃO|INTIMAÇÃO|PROTESTO|CARTÓRIO|PRAZO|OFICIAL DE JUSTIÇA/i;
            if (urgencyKeywords.test(upperInput)) {
                this.updateState(client, 'HANDOFF0');
                // Return a custom header + the handoff text
                return `⚠️ Detectei urgência no seu relato.\n\n${STATE_TEXTS.HANDOFF0}`;
            }

            // ---------------------------------------------------------
            // 7. FALLBACK
            // ---------------------------------------------------------
            logger.info(`[FALLBACK] Input "${input}" not matched in stage ${stage}`);
            return STATE_TEXTS.FALLBACK_ANY;

        } catch (error) {
            logger.error(`[AGENT_ERROR]: ${error.message}`);
            return "Ocorreu um erro. Digite M para voltar ao menu.";
        }
    }
}

module.exports = new AIAgentService();
