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

    // ---------------------------------------------------------
    // 3. MAIN ROUTER & NLU
    // ---------------------------------------------------------

    matchIntent(input, currentState) {
        const text = input.toUpperCase();

        // GLOBAL COMMANDS
        if (text === 'M' || text.includes('MENU') || text.includes('INICIO') || text.includes('INÍCIO')) return 'START';
        if (text === 'V' || text.includes('VOLTAR')) return 'VOLTAR';
        if (text === 'S' || text.includes('SAIR')) return 'SAIR';
        if (text === 'P' || text.includes('PRIVACIDADE')) return 'PRIVACIDADE';
        if (text === '0' || text.includes('ESPECIALISTA') || text.includes('AGENDAR') || text.includes('HUMANO')) return 'TERMO_AGENDAMENTO';

        // CONTEXTUAL ROUTING based on Current State
        if (currentState === 'START') {
            if (text.includes('DIVIDA') || text.includes('DÍVIDA') || text.includes('RENEGOCIAR')) return 'MENU1';
            if (text.includes('PRAZO') || text.includes('ALONGAMENTO') || text.includes('PAGAR')) return 'MENU2';
            if (text.includes('PROTEGER') || text.includes('PENHORA') || text.includes('PATRIMONIO') || text.includes('PATRIMÔNIO')) return 'MENU3';
            if (text.includes('AMBIENTAL') || text.includes('CAR') || text.includes('EMBARGO')) return 'MENU4';
            if (text.includes('LEI') || text.includes('LEGISLACAO') || text.includes('LEGISLAÇÃO')) return 'MENU5';
            if (text.includes('DECISAO') || text.includes('DECISÃO') || text.includes('JUSTICA') || text.includes('JUSTIÇA')) return 'MENU6';
            if (text.includes('EXEMPLO') || text.includes('CASO') || text.includes('HISTORIA')) return 'MENU7';
        }

        if (currentState === 'MENU1') {
            if (text.includes('SAFRA') || text.includes('CHUVA') || text.includes('SECA') || text.includes('CLIMA') || text.includes('GELO')) return 'M1CLIMA';
            if (text.includes('PRECO') || text.includes('PREÇO') || text.includes('CUSTO')) return 'M1CAIXA';
            if (text.includes('NOVO') || text.includes('CONTRATO') || text.includes('PROPOSTA')) return 'M1PROPOSTA';
            if (text.includes('DOCUMENT') || text.includes('CHECKLIST')) return 'M1DOCUMENTACAO';
            if (text.includes('NOTIFICACAO') || text.includes('NOTIFICAÇÃO') || text.includes('URGENTE') || text.includes('JUIZO') || text.includes('CARTORIO')) return 'M1URGENTE';
        }

        if (currentState === 'MENU2') {
            if (text.includes('LONGO') || text.includes('CAFE') || text.includes('CAFÉ') || text.includes('FRUTA') || text.includes('EUCALIPTO')) return 'M2CICLO';
            if (text.includes('REDUZIR') || text.includes('PARCELA') || text.includes('MENSAL')) return 'M2PARCELA';
            if (text.includes('DIFERENCA') || text.includes('DIFERENÇA') || text.includes('PRORROGAR')) return 'M2DIFERENCA';
            if (text.includes('DOCUMENT')) return 'M2DOCUMENTACAO';
            if (text.includes('RISCO')) return 'M2RISCOS';
        }

        if (currentState === 'MENU3') {
            if (text.includes('BEM') || text.includes('FAMILIA') || text.includes('FAMÍLIA')) return 'M3FAMILIA';
            if (text.includes('NAO') || text.includes('EXCECAO') || text.includes('EXCEÇÃO')) return 'M3EXCECOES';
            if (text.includes('GARANTIA') || text.includes('FIDUCIA') || text.includes('FIDÚCIA') || text.includes('HIPOTECA')) return 'M3FIDUCIA';
            if (text.includes('DOCUMENT')) return 'M3DOCUMENTACAO';
            if (text.includes('JUDICIAL') || text.includes('DOCUMENTO')) return 'M3JUDICIAL';
        }

        if (currentState === 'MENU4') {
            if (text.includes('CAR') || text.includes('CADASTRO')) return 'M4CAR';
            if (text.includes('EMBARGO') || text.includes('RESTRICAO') || text.includes('RESTRIÇÃO')) return 'M4EMBARGO';
            if (text.includes('SUSTENTAVEL') || text.includes('SUSTENTÁVEL') || text.includes('CREDITO')) return 'M4SUSTENTAVEL';
            if (text.includes('DOCUMENT')) return 'M4DOCUMENTACAO';
            if (text.includes('PENDENCIA') || text.includes('PENDÊNCIA') || text.includes('TRAVOU')) return 'M4PENDENCIA';
        }

        if (currentState === 'MENU5') {
            if (text.includes('PRORROGA')) return 'M5PRORROGACAO';
            if (text.includes('RENEGOCIA')) return 'M5RENEGOCIACAO';
            if (text.includes('ALONGA')) return 'M5ALONGAMENTO';
            if (text.includes('AMBIENTAL')) return 'M5AMBIENTAL';
            if (text.includes('GARANTIA')) return 'M5GARANTIAS';
        }

        if (currentState === 'MENU6') {
            if (text.includes('PRORROGA') || text.includes('ALONGA')) return 'M6PRORROGACAO';
            if (text.includes('CLIMA') || text.includes('SAFRA')) return 'M6CLIMA';
        }

        if (currentState === 'MENU7') {
            if (text.includes('SECA') || text.includes('SOJA')) return 'M7CASO1';
            if (text.includes('DISFARCADO') || text.includes('DISFARÇADO') || text.includes('CAFE') || text.includes('GEADA')) return 'M7CASO2';
            if (text.includes('PREVENIDO') || text.includes('EXCESSO')) return 'M7CASO3';
            if (text.includes('COLETIVA') || text.includes('SINDICATO')) return 'M7CASO4';
            if (text.includes('IMPENHORA') || text.includes('PEQUENA')) return 'M7CASO5';
            // New cases added
            if (text.includes('REVISAO') || text.includes('REVISÃO') || text.includes('IMPREVISIVEL')) return 'M7CASO6';
            if (text.includes('SEGURO') || text.includes('NEGATIVA') || text.includes('TECNICO')) return 'M7CASO7';
            if (text.includes('PROAGRO') || text.includes('BUROCRACIA') || text.includes('PERDA')) return 'M7CASO8';
        }

        return null;
    }

    async generateResponse(clientNumber, textInput) {
        const input = textInput.trim();
        const upperInput = input.toUpperCase();
        const isNumeric = /^\d+$/.test(input) && input.length <= 2;

        try {
            const client = await ClientService.findOrCreateClient(clientNumber);
            let stage = client.conversation_stage || 'PRIMEIRO_CONTATO';
            const session = client.current_session || {};

            // 1. Keyword/Navigation Check (Prioritize explicit commands)
            const intent = this.matchIntent(input, stage);

            if (intent === 'START') {
                await this.pushState(client, 'START');
                return STATE_TEXTS.START;
            }
            if (intent === 'VOLTAR') {
                const target = await this.popState(client);
                return STATE_TEXTS[target] || STATE_TEXTS.START;
            }
            if (intent === 'SAIR') {
                await this.pushState(client, 'SAIR');
                return STATE_TEXTS.SAIR;
            }
            if (intent === 'PRIVACIDADE') {
                await this.pushState(client, 'PRIVACIDADE');
                return STATE_TEXTS.PRIVACIDADE;
            }
            if (intent === 'TERMO_AGENDAMENTO') {
                await this.pushState(client, 'TERMO_AGENDAMENTO');
                return STATE_TEXTS.TERMO_AGENDAMENTO;
            }

            // 2. Determine Next State via Number OR Intent
            let nextState = null;

            // Priority: Intent from Keyword -> Number Mapping -> Fallback
            if (intent && stage.startsWith('MENU')) {
                nextState = intent; // Direct jump within menu context
            }

            // HANDLE DATA COLLECTION (Priority over navigation)
            const collectionResponse = await this.handleCollection(client, input, upperInput);
            if (collectionResponse) return collectionResponse;

            // NUMERIC MAPPING
            if (!nextState && isNumeric) {
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
                    const map = {
                        '1': 'M7CASO1', '2': 'M7CASO2', '3': 'M7CASO3', '4': 'M7CASO4',
                        '5': 'M7CASO5', '6': 'M7CASO6', '7': 'M7CASO7', '8': 'M7CASO8',
                        '0': 'TERMO_AGENDAMENTO'
                    };
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
            }

            // EXECUTE TRANSITION
            if (nextState) {
                await this.pushState(client, nextState);
                return STATE_TEXTS[nextState];
            }

            // NLU FALLBACK (For out-of-date greetings or valid commands)
            if (!isNumeric) {
                // Greeting check
                if (/^(OI|OLA|OLÁ|BOM DIA|BOA TARDE|BOA NOITE)/.test(upperInput)) {
                    await this.pushState(client, 'PRIMEIRO_CONTATO');
                    return STATE_TEXTS.PRIMEIRO_CONTATO;
                }

                // Urgency check (Global)
                const urgencyKeywords = /CITAÇÃO|CITACAO|INTIMAÇÃO|INTIMACAO|PROTESTO|URGENTE|LIMINAR|LEILÃO|LEILAO/i;
                if (urgencyKeywords.test(upperInput)) {
                    await this.pushState(client, 'TERMO_AGENDAMENTO');
                    return "⚠️ Identificamos uma mensagem com possível urgência.\n\n" + STATE_TEXTS.TERMO_AGENDAMENTO;
                }
            }

            return STATE_TEXTS.ERRO_ENTRADA || STATE_TEXTS.FALLBACK_ANY;

        } catch (error) {
            logger.error(`[AGENT_ERR] ${error.message}`);
            return "Sinto muito, tive um erro técnico. Digite MENU para recomeçar.";
        }
    }
}

module.exports = new AIAgentService();
