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
    // ---------------------------------------------------------
    // 1. STATE STACK LOGIC (Memory for "Back" button)
    // ---------------------------------------------------------

    async pushState(client, newState) {
        const start = Date.now();
        const oldState = client.conversation_stage;

        // Load or init session
        const session = client.current_session || {};
        const stack = session.flow_stack || [];

        // Rules for stack:
        // 1. Don't push same state twice consecutively
        // 2. Don't push purely transient/fallback states
        // 3. Limit stack size to 10
        if (oldState && oldState !== newState && !['SAIR', 'APAGAR', 'VOLTARV'].includes(oldState)) {
            stack.push(oldState);
            if (stack.length > 10) stack.shift();
        }

        const dataToUpdate = {
            conversation_stage: newState,
            current_session: { ...session, flow_stack: stack, free_text_count: 0 } // Reset free text on menu move
        };

        await client.update(dataToUpdate);
        logger.info(`[STACK_PUSH] ${oldState} -> ${newState} | Stack: ${stack.join(',')} (${Date.now() - start}ms)`);
    }

    async popState(client) {
        const start = Date.now();
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

        logger.info(`[STACK_POP] To ${targetState} | Remainder: ${stack.length} (${Date.now() - start}ms)`);
        return targetState;
    }

    // ---------------------------------------------------------
    // 2. INTENT CLASSIFIER (Router)
    // ---------------------------------------------------------

    async classifyIntent(text) {
        const start = Date.now();
        const prompt = `
        Analise a mensagem do usuário e determine qual opção do menu melhor se aplica.
        Retorne APENAS o ID do estado correspondente da lista abaixo. Se não souber, retorne "UNKNOWN".
        
        CONTEXTO DE ESTADOS:
        - MENU1: Cobrança, dívida, parcelas vencendo, laudo de clima, frustração de safra.
        - MENU2: Alongamento, prorrogação, aumentar prazo, reduzir valor da parcela.
        - MENU3: Garantias, riscos sobre bens, imóvel da família, herança, temor de perda de terra.
        - MENU4: Ambiental, CAR, Embargo, crédito travado por pendência ambiental.
        - MENU5: Resumos, explicações simples, normas do crédito rural.
        - HANDOFF0: Falar com advogado, atendimento humano, citação judicial, intimação, processo correndo.
        - TRIAGEM8: Quer fazer uma triagem, quer ajuda para escolher por onde começar.
        - DOCS9: Quer ver o checklist de documentos.
        
        REGRAS:
        - Não responda à mensagem.
        - Se for apenas saudação (oi, olá), não use este classificador (será tratado separadamente).
        - Se for urgência judicial clara, use HANDOFF0.
        
        MENSAGEM: "${text}"
        ID:`;

        try {
            const response = await openai.chat.completions.create({
                model: "gpt-4o",
                messages: [{ role: "system", content: "Você é um roteador de intenções focado em agronegócio." }, { role: "user", content: prompt }],
                temperature: 0,
                max_tokens: 10
            });

            const identifiedState = response.choices[0].message.content.trim().toUpperCase();

            // Map to Friendly Names for UX (V18.1)
            const friendlyNames = {
                'MENU1': 'Dívida / Cobrança',
                'MENU2': 'Alongamento de Prazo / Prorrogação',
                'MENU3': 'Garantias / Riscos sobre Bens',
                'MENU4': 'Ambiental (CAR / Embargo)',
                'MENU5': 'Resumos e Normas',
                'HANDOFF0': 'Atendimento Humano',
                'TRIAGEM8': 'Triagem de Caso',
                'DOCS9': 'Checklist de Documentos'
            };

            logger.info(`[INTENT_CLASSIFIED] State: ${identifiedState} in ${Date.now() - start}ms`);

            if (identifiedState === 'UNKNOWN' || !STATE_TEXTS[identifiedState]) return null;

            return {
                id: identifiedState,
                name: friendlyNames[identifiedState] || 'este tema'
            };
        } catch (err) {
            logger.error(`[CLASSIFIER_ERROR]: ${err.message}`);
            return null;
        }
    }

    async generateResponse(clientNumber, textInput) {
        const startTime = Date.now();
        const input = textInput.trim();
        const upperInput = input.toUpperCase();

        logger.info(`[GEN_START] Client: ${clientNumber} | Input: "${input}"`);

        try {
            // 1. Load Client
            const client = await ClientService.findOrCreateClient(clientNumber);
            const stage = client.conversation_stage || 'START';
            const session = client.current_session || {};
            const freeCount = session.free_text_count || 0;

            // ---------------------------------------------------------
            // 2. GLOBAL ROUTER (Deterministic & Instant)
            // ---------------------------------------------------------
            if (upperInput === 'SAIR' || upperInput === 'ENCERRAR') {
                await this.pushState(client, 'SAIR');
                return STATE_TEXTS.SAIR;
            }
            if (upperInput === 'APAGAR' || upperInput === 'EXCLUIR') {
                await this.pushState(client, 'APAGAR');
                return STATE_TEXTS.APAGAR;
            }
            if (upperInput === 'M' || upperInput === 'MENU' || upperInput === 'INICIO') {
                await this.pushState(client, 'MENUPRINCIPAL');
                return STATE_TEXTS.MENUPRINCIPAL;
            }
            if (upperInput === '0' || upperInput === 'HUMANO' || upperInput === 'ADVOGADO') {
                await this.pushState(client, 'HANDOFF0');
                return STATE_TEXTS.HANDOFF0;
            }
            if (/^(OI|OLA|OLÁ|OIE|BOM DIA|BOA TARDE|BOA NOITE)/.test(upperInput)) {
                await this.pushState(client, 'START');
                return STATE_TEXTS.START;
            }
            if (upperInput === '8' || upperInput === 'TRIAGEM') {
                await this.pushState(client, 'TRIAGEM8');
                return STATE_TEXTS.TRIAGEM8;
            }
            if (upperInput === '9' || upperInput === 'CHECKLIST') {
                await this.pushState(client, 'DOCS9');
                return STATE_TEXTS.DOCS9;
            }
            if (upperInput === 'V' || upperInput === 'VOLTAR') {
                const target = await this.popState(client);
                return STATE_TEXTS[target] || STATE_TEXTS.MENUPRINCIPAL;
            }

            // ---------------------------------------------------------
            // 3. DETERMINISTIC NAVIGATION (Instant Switch)
            // ---------------------------------------------------------
            const isNumeric = /^\d+$/.test(input) && input.length <= 2;
            if (isNumeric) {
                let nextState = null;
                if (stage === 'START') {
                    if (input === '1') nextState = 'TRIAGEM8';
                    if (input === '2') nextState = 'MENUPRINCIPAL';
                } else if (stage === 'MENUPRINCIPAL') {
                    const map = { '1': 'MENU1', '2': 'MENU2', '3': 'MENU3', '4': 'MENU4', '5': 'MENU5', '0': 'HANDOFF0' };
                    nextState = map[input];
                } else if (stage === 'MENU1') {
                    const map = { '1': 'M1CLIMA', '2': 'M1CAIXA', '3': 'M1PROPOSTA', '4': 'M1CHECKLIST', '5': 'M1URGENTE' };
                    nextState = map[input];
                } else if (stage === 'MENU2') {
                    const map = { '1': 'M2CICLOLONGO', '2': 'M2REDUZIR_PARCELA', '3': 'M2DIFERENCA', '4': 'M2CHECKLIST_BANCO', '5': 'M2PONTOSATENCAO' };
                    nextState = map[input];
                } else if (stage === 'MENU3') {
                    const map = { '1': 'M3GARANTIAGERAL', '2': 'M3PROPRIEDADEFAMILIA', '3': 'M3RISCOSITUACOES', '4': 'M3CHECKLISTGARANTIAS', '5': 'M3URGENTEJUDICIAL' };
                    nextState = map[input];
                } else if (stage === 'MENU4') {
                    const map = { '1': 'M4CARPASSOS', '2': 'M4EMBARGOCREDITO', '3': 'M4CHECKLISTANTESFINANCIAR', '4': 'M4PENDENCIAPASSOS', '5': 'M4ZARCINFO' };
                    nextState = map[input];
                } else if (stage === 'MENU5') {
                    const map = { '1': 'RESUMO1PRORROGACAO', '2': 'RESUMO2RENEGOCIACAO', '3': 'RESUMO3ALONGAMENTO', '4': 'RESUMO4AMBIENTAL', '5': 'RESUMO5GARANTIAS' };
                    nextState = map[input];
                }

                if (nextState) {
                    await this.pushState(client, nextState);
                    return STATE_TEXTS[nextState];
                }
            }

            // ---------------------------------------------------------
            // 4. TRIAGEM PARSER (Deterministic Logic)
            // ---------------------------------------------------------
            if (stage === 'TRIAGEM8') {
                const match = upperInput.match(/([A-D])\s*[-/.,]?\s*([1-3])\s*[-/.,]?\s*([1-4])/);
                if (match) {
                    const [_full, tema, urgencia, _doc] = match;
                    if (urgencia === '1') {
                        await this.pushState(client, 'HANDOFF0');
                        return STATE_TEXTS.TRIAGEM_DONE_URGENTE;
                    }
                    const temaMap = { 'A': 'MENU1', 'B': 'MENU2', 'C': 'MENU3', 'D': 'MENU4' };
                    const next = temaMap[tema] || 'MENUPRINCIPAL';
                    await this.pushState(client, next);
                    return STATE_TEXTS[next];
                }
            }

            // ---------------------------------------------------------
            // 5. INTENT ROUTING & UNIFIED COUNTER (V18.1)
            // ---------------------------------------------------------

            // Rule: If limit reached, deny free text and force numeric selection
            if (freeCount >= 3) {
                await this.pushState(client, 'MENUPRINCIPAL');
                return "Você atingiu o limite de mensagens livres por segurança (3/3). Por favor, escolha uma opção numérica do menu para continuar:\n\n" + STATE_TEXTS.MENUPRINCIPAL;
            }

            // Detect Urgent Keywords first (Fast Path)
            const urgencyKeywords = /CITAÇÃO|INTIMAÇÃO|PROTESTO|CARTÓRIO|PRAZO|OFICIAL DE JUSTIÇA/i;
            if (urgencyKeywords.test(upperInput)) {
                await this.pushState(client, 'HANDOFF0');
                return `⚠️ Detectei urgência no seu relato.\n\n${STATE_TEXTS.HANDOFF0}`;
            }

            // AI Routing (V18.1 Confirmation Template + RAG Augmentation V18.2)
            const result = await this.classifyIntent(input);
            if (result && result.id) {
                await this.pushState(client, result.id);

                let response = `Entendi sua dúvida sobre **${result.name}**. Por favor, escolha a opção desejada neste menu:\n\n${STATE_TEXTS[result.id]}`;

                // Add RAG Insight if available
                try {
                    const RAGCoreService = require('../RAG_Core/RAG_Core.service');
                    const embedding = await RAGCoreService.generateEmbedding(input);
                    const chunks = await RAGCoreService.searchChunks(embedding, 1);

                    if (chunks && chunks.length > 0 && chunks[0].similarity > 0.8) {
                        response += `\n\n🧠 **Complemento Técnico (MCR):**\n${chunks[0].text}`;
                    }
                } catch (ragErr) {
                    logger.error(`[RAG_ERROR]: ${ragErr.message}`);
                }

                return response;
            }

            // ---------------------------------------------------------
            // 6. FALLBACK / HANDOFF AS LAST RESORT
            // ---------------------------------------------------------
            if (stage === 'HANDOFF0') {
                await this.pushState(client, 'HANDOFFCONFIRM');
                BaserowService.saveLead({ phone: clientNumber, note: input, stage: 'HANDOFF' }).catch(() => { });
                return STATE_TEXTS.HANDOFFCONFIRM;
            }

            // Increment unified free text count if we reached here
            const newCount = freeCount + 1;
            await client.update({ current_session: { ...session, free_text_count: newCount } });

            logger.info(`[FALLBACK] Input not routed. Counter: ${newCount}/3`);
            return `Não consegui identificar sua escolha (${newCount}/3). Por favor, use as opções numéricas ou comandos (M, V, 0).`;

        } catch (error) {
            logger.error(`[AGENT_ERROR]: ${error.message} \n ${error.stack}`);
            return "Ocorreu um erro técnico. Por favor, digite M para voltar ao início.";
        }
    }
}

module.exports = new AIAgentService();
