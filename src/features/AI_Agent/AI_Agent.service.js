const OpenAI = require('openai');
const RAGService = require('../RAG_Core/RAG_Core.service');
const BaserowService = require('../External_Context/Baserow/Baserow.service');
const HubSpotService = require('../External_Context/HubSpot/HubSpot.service');
const ClientService = require('../Client/Client.service');
const { STATE_TEXTS } = require('./AIAgentStates');
const logger = require('../../utils/logger');

const { httpsAgent } = require('../../config/axios.config');
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    httpAgent: httpsAgent
});

class AIAgentService {
    // ---------------------------------------------------------
    // 1. STATE STACK LOGIC
    // ---------------------------------------------------------

    async pushState(client, newState) {
        const oldState = client.conversation_stage;
        const session = client.current_session || {};
        const stack = session.flow_stack || [];

        // Validation: Don't push repeated states or system states to stack
        const skipStack = ['PRIMEIRO_CONTATO', 'SAIR', 'APAGAR_CONFIRMADO', 'LOOP_PROTECAO', 'AGENDAMENTO_COLETA', 'AGENDAMENTO_CIDADE', 'AGENDAMENTO_URGENCIA', 'CONFIRMACAO_DADOS'];
        if (oldState && oldState !== newState && !skipStack.includes(oldState)) {
            stack.push(oldState);
            if (stack.length > 15) stack.shift();
        }

        await client.update({
            conversation_stage: newState,
            current_session: { ...session, flow_stack: stack, free_text_count: 0 }
        });
        logger.info(`[STATE_MOVE] ${oldState} -> ${newState} | StackSize: ${stack.length}`);
    }

    async popState(client) {
        const session = client.current_session || {};
        const stack = session.flow_stack || [];

        if (stack.length === 0) {
            await client.update({ conversation_stage: 'START' });
            return 'START';
        }

        const targetState = stack.pop();
        await client.update({
            conversation_stage: targetState,
            current_session: { ...session, flow_stack: stack }
        });
        return targetState;
    }

    // ---------------------------------------------------------
    // 2. DATA COLLECTION FLOW
    // ---------------------------------------------------------

    async handleCollection(client, input, upperInput) {
        const stage = client.conversation_stage;
        const session = client.current_session || {};
        const formData = session.appointment_data || {};

        if (stage === 'AGENDAMENTO_COLETA') {
            formData.nome = input;
            await client.update({ current_session: { ...session, appointment_data: formData } });
            await this.pushState(client, 'AGENDAMENTO_CIDADE');
            return STATE_TEXTS.AGENDAMENTO_CIDADE;
        }

        if (stage === 'AGENDAMENTO_CIDADE') {
            formData.municipio = input;
            await client.update({ current_session: { ...session, appointment_data: formData } });
            await this.pushState(client, 'AGENDAMENTO_URGENCIA');
            return STATE_TEXTS.AGENDAMENTO_URGENCIA;
        }

        if (stage === 'AGENDAMENTO_URGENCIA') {
            if (input === '1' || upperInput === 'SIM') formData.urgencia = 'SIM';
            else if (input === '2' || upperInput === 'NÃO' || upperInput === 'NAO') formData.urgencia = 'NÃO';
            else return "Por favor, responda com [1] SIM ou [2] NÃO.";

            // Infer theme from history if possible
            formData.tema = formData.tema || 'Assunto Geral (Agro)';

            await client.update({ current_session: { ...session, appointment_data: formData } });
            await this.pushState(client, 'CONFIRMACAO_DADOS');

            return STATE_TEXTS.CONFIRMACAO_DADOS
                .replace('{{nome}}', formData.nome)
                .replace('{{municipio}}', formData.municipio)
                .replace('{{tema}}', formData.tema)
                .replace('{{urgencia}}', formData.urgencia);
        }

        if (stage === 'CONFIRMACAO_DADOS') {
            if (input === '1') {
                const protocol = Math.floor(100000 + Math.random() * 900000);
                await this.pushState(client, 'HANDOFFCONFIRM');

                // SAVE TO CRM (HUBSPOT)
                HubSpotService.createContact({
                    whatsapp: client.whatsapp,
                    name: formData.nome,
                    location: formData.municipio,
                    topic: formData.tema,
                    priority: formData.urgencia
                }).catch(e => logger.error(`[HUBSPOT_SAVE_ERR] ${e.message}`));

                // Baserow is kept imported but call is removed to disable it
                // BaserowService.saveLead(...) 

                return STATE_TEXTS.HANDOFFCONFIRM.replace('{{protocolo}}', protocol);
            } else if (input === '2') {
                await this.pushState(client, 'AGENDAMENTO_COLETA');
                return "Vamos recomeçar.\n\n" + STATE_TEXTS.AGENDAMENTO_COLETA;
            }
        }

        return null;
    }

    // ---------------------------------------------------------
    // 3. MAIN ROUTER
    // ---------------------------------------------------------

    async generateResponse(clientNumber, textInput) {
        const input = textInput.trim();
        const upperInput = input.toUpperCase();
        const isNumeric = /^\d+$/.test(input) && input.length <= 2;

        try {
            const client = await ClientService.findOrCreateClient(clientNumber);
            let stage = client.conversation_stage || 'PRIMEIRO_CONTATO';
            const session = client.current_session || {};

            // GLOBAL COMMANDS
            if (upperInput === 'M' || upperInput === 'MENU') {
                await this.pushState(client, 'START');
                return STATE_TEXTS.START;
            }
            if (upperInput === 'P' || upperInput === 'PRIVACIDADE') {
                await this.pushState(client, 'PRIVACIDADE');
                return STATE_TEXTS.PRIVACIDADE;
            }
            if (upperInput === 'V' || upperInput === 'VOLTAR') {
                const target = await this.popState(client);
                return STATE_TEXTS[target] || STATE_TEXTS.START;
            }
            if (upperInput === 'S' || upperInput === 'SAIR') {
                await this.pushState(client, 'SAIR');
                return STATE_TEXTS.SAIR;
            }
            if (upperInput === '0' || upperInput === 'ESPECIALISTA') {
                await this.pushState(client, 'TERMO_AGENDAMENTO');
                return STATE_TEXTS.TERMO_AGENDAMENTO;
            }

            // HANDLE DATA COLLECTION
            const collectionResponse = await this.handleCollection(client, input, upperInput);
            if (collectionResponse) return collectionResponse;

            // STATE TRANSITIONS
            let nextState = null;

            if (stage === 'PRIMEIRO_CONTATO') {
                if (input === '1') nextState = 'START';
            } else if (stage === 'START') {
                const map = { '1': 'MENU1', '2': 'MENU2', '3': 'MENU3', '4': 'MENU4', '5': 'MENU5', '6': 'MENU6', '7': 'MENU7', '0': 'TERMO_AGENDAMENTO' };
                nextState = map[input];
            } else if (stage === 'MENU1') {
                const map = { '1': 'M1CLIMA', '2': 'M1CAIXA', '3': 'M1PROPOSTA', '4': 'M1DOCUMENTACAO', '5': 'M1URGENTE', '0': 'TERMO_AGENDAMENTO' };
                nextState = map[input];
            } else if (stage === 'M1CLIMA' || stage === 'M1CAIXA' || stage === 'M1PROPOSTA') {
                if (input === '4') nextState = 'M1DOCUMENTACAO';
                if (input === '0') nextState = 'TERMO_AGENDAMENTO';
            } else if (stage === 'MENU2') {
                const map = { '1': 'M2CICLO', '2': 'M2PARCELA', '3': 'M2DIFERENCA', '4': 'M2DOCUMENTACAO', '5': 'M2RISCOS', '0': 'TERMO_AGENDAMENTO' };
                nextState = map[input];
            } else if (stage === 'M2PARCELA') {
                if (input === '5') nextState = 'M2RISCOS';
                if (input === '4') nextState = 'M2DOCUMENTACAO';
                if (input === '0') nextState = 'TERMO_AGENDAMENTO';
            } else if (stage === 'MENU3') {
                const map = { '1': 'M3FAMILIA', '2': 'M3EXCECOES', '3': 'M3FIDUCIA', '4': 'M3DOCUMENTACAO', '5': 'M3JUDICIAL', '0': 'TERMO_AGENDAMENTO' };
                nextState = map[input];
            } else if (stage === 'MENU4') {
                const map = { '1': 'M4CAR', '2': 'M4EMBARGO', '3': 'M4SUSTENTAVEL', '4': 'M4DOCUMENTACAO', '5': 'M4PENDENCIA', '0': 'TERMO_AGENDAMENTO' };
                nextState = map[input];
            } else if (stage === 'MENU5') {
                const map = { '1': 'M5PRORROGACAO', '2': 'M5RENEGOCIACAO', '3': 'M5ALONGAMENTO', '4': 'M5AMBIENTAL', '5': 'M5GARANTIAS', '0': 'TERMO_AGENDAMENTO' };
                nextState = map[input];
            } else if (stage === 'MENU6') {
                const map = { '1': 'M6PRORROGACAO', '2': 'M6CLIMA', '0': 'TERMO_AGENDAMENTO' };
                nextState = map[input];
            } else if (stage === 'MENU7') {
                const map = { '1': 'M7CASO1', '2': 'M7CASO2', '3': 'M7CASO3', '4': 'M7CASO4', '5': 'M7CASO5', '0': 'TERMO_AGENDAMENTO' };
                nextState = map[input];
            } else if (stage === 'TERMO_AGENDAMENTO') {
                if (input === '1') nextState = 'CONSENTIMENTO_LGPD';
            } else if (stage === 'CONSENTIMENTO_LGPD') {
                if (input === '1') nextState = 'AGENDAMENTO_COLETA';
                if (input === '2') nextState = 'START';
            } else if (stage === 'PRIVACIDADE') {
                if (input === '1') nextState = 'START';
            } else if (stage === 'SAIR') {
                if (upperInput === 'M' || isNumeric) nextState = 'START';
            } else if (stage === 'APAGAR_SOLICITACAO') {
                if (input === '1') {
                    await client.destroy();
                    return STATE_TEXTS.APAGAR_CONFIRMADO;
                }
                nextState = 'START';
            }

            if (nextState) {
                await this.pushState(client, nextState);
                return STATE_TEXTS[nextState];
            }

            // FALLBACK / AI ROUTING
            if (!isNumeric) {
                const urgencyKeywords = /CITAÇÃO|INTIMAÇÃO|PROTESTO|URGENTE|LIMINAR|LEILÃO/i;
                if (urgencyKeywords.test(upperInput)) {
                    await this.pushState(client, 'TERMO_AGENDAMENTO');
                    return "⚠️ Identificamos uma mensagem com possível urgência.\n\n" + STATE_TEXTS.TERMO_AGENDAMENTO;
                }

                // Greeting check
                if (/^(OI|OLA|OLÁ|BOM DIA|BOA TARDE|BOA NOITE)/.test(upperInput)) {
                    await this.pushState(client, 'PRIMEIRO_CONTATO');
                    return STATE_TEXTS.PRIMEIRO_CONTATO;
                }
            }

            return STATE_TEXTS.FALLBACK_ANY;

        } catch (error) {
            logger.error(`[AGENT_ERR] ${error.message}`);
            return "Sinto muito, tive um erro técnico. Digite MENU para recomeçar.";
        }
    }
}

module.exports = new AIAgentService();
