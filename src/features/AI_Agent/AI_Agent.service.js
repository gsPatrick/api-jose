const OpenAI = require('openai');
const RAGService = require('../RAG_Core/RAG_Core.service');
const BaserowService = require('../External_Context/Baserow/Baserow.service');
const ClientService = require('../Client/Client.service');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// --- CONSTANTS (Outside for performance) ---
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
    // Helper for non-blocking state updates
    updateState(client, stage, extraData = {}) {
        client.update({ conversation_stage: stage, ...extraData }).catch(err => {
            console.error(`[DB_UPDATE_ERROR] Failed to update state to ${stage}:`, err.message);
        });
    }

    async generateResponse(clientNumber, textInput) {
        const UazapiService = require('../Uazapi/Uazapi.service');
        try {
            const input = textInput.trim();
            const lowerInput = input.toLowerCase();

            // 1. Get Client State (Essential blocking call)
            const client = await ClientService.findOrCreateClient(clientNumber);
            let currentState = client.conversation_stage || 'START';

            // --- RESET TRIGGER & GREETINGS ---
            if (GREETINGS.some(g => lowerInput.includes(g))) {
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

            // --- DOCUMENT DATA TRIGGER ---
            if (input.startsWith('[DADOS_DOCUMENTO]')) {
                textInput = `${input}\n\nAnalise estes dados identificados no documento com base no nosso contexto atual de ${currentState}.`;
            }

            // --- STATE: WAITING_TERMS ---
            if (currentState === 'WAITING_TERMS') {
                if (lowerInput.includes('ver termos') || lowerInput.includes('termos')) return TERMS_TEXT;
                if (lowerInput.includes('aceit') || lowerInput.includes('sim') || lowerInput.includes('continuar')) {
                    this.updateState(client, 'MENU_SHOWN');
                    return MENU_TEXT;
                }
                if (lowerInput.includes('não') || lowerInput.includes('nao')) {
                    this.updateState(client, 'START');
                    return "Entendido! Sem problemas.\n\nPara informações gerais, acesse nosso site.\nSe mudar de ideia, é só enviar uma mensagem aqui.\n\nBom trabalho! 🌾";
                }
                return "Para prosseguir, preciso que você aceite ou veja os termos.\n[Ver termos] [Aceitar] [Não aceito]";
            }

            // --- STATE: MENU SELECTION ---
            if (currentState === 'MENU_SHOWN') {
                if (input === '1') {
                    this.updateState(client, 'WAITING_MONITORAMENTO_SUBOPTION');
                    return MONITORAMENTO_MENU;
                }
                if (input === '2') {
                    this.updateState(client, 'WAITING_MERCADO_SUBOPTION');
                    return MERCADO_MENU;
                }
                if (input === '3') {
                    this.updateState(client, 'WAITING_RULES_SUBOPTION');
                    return RULES_MENU;
                }
                if (input === '4' || lowerInput.includes('agendar') || lowerInput.includes('individual')) {
                    this.updateState(client, 'WAITING_LAWYER_CONTACT');
                    return "📅 *Análise de caso Individual (Agendar)*\n\nPara prosseguir com o agendamento, por favor informe (separado por vírgulas):\n1. Seu nome completo\n2. Município/estado do imóvel\n3. Tema principal\n4. Prioridade (sim/não)";
                }
                if (input === '0') {
                    this.updateState(client, 'MENU_SHOWN');
                    return MENU_TEXT;
                }
                if (lowerInput.includes('nova consulta')) {
                    this.updateState(client, 'WAITING_CLIMATE_CITY');
                    return "🌦️ *Consulta a Dados Climáticos Públicos*\n\nInforme o município para consulta:\nExemplo: Uberlândia";
                }
            }

            // --- SUBMENU transitions ---
            if (currentState === 'WAITING_MONITORAMENTO_SUBOPTION') {
                if (input === '0') { this.updateState(client, 'MENU_SHOWN'); return MENU_TEXT; }
                if (input === '1') { this.updateState(client, 'WAITING_CLIMATE_CITY'); return "🌦️ *Consulta a Dados Climáticos Públicos*\n\nInforme o município para consulta:\nExemplo: Uberlândia"; }
                if (input === '2') return `📊 *Zoneamento Agrícola de Risco Climático (ZARC)*\n\nO ZARC é uma ferramenta oficial do MAPA.\n\n📱 *Acesso oficial (gratuito):*\n\nAplicativo **Plantio Certo**:\n• Download: Play Store ou App Store\n\n💻 *Site do MAPA:*\nhttps://www.gov.br/agricultura/pt-br/assuntos/riscos-seguro/zarc\n\n[Voltar]`;
                if (input === '3') return "📷 *Análise de frustração de safra*\n\n⚠️ Funcionalidade em desenvolvimento.\nPara triagem manual, responda com sua situação ou agende com Dr. [Nome].\n\n[Voltar]";
                return MONITORAMENTO_MENU;
            }

            if (currentState === 'WAITING_MERCADO_SUBOPTION') {
                if (input === '0') { this.updateState(client, 'MENU_SHOWN'); return MENU_TEXT; }
                if (['1', '2', '3'].includes(input)) return "📈 *MERCADO E PRODUÇÃO (Informativo)*\n\nApresento informações gerais baseadas em dados públicos e de mercado.\n\n⚠️ Funcionalidade automatizada (V2) em breve.\nPara consulta direta: https://cepea.esalq.usp.br\n\n[Voltar]";
                return MERCADO_MENU;
            }

            if (currentState === 'WAITING_RULES_SUBOPTION') {
                if (input === '0') { this.updateState(client, 'MENU_SHOWN'); return MENU_TEXT; }
                if (['a', 'b', 'c', 'A', 'B', 'C'].includes(input)) return "📘 *Informação Geral*\n\nAs regras de crédito rural (MCR) permitem ajustes em parcelas sob certas condições (clima, preço, pragas).\n\n⚠️ Nota: A aplicação depende de análise contratual individual.\n\n[0] Voltar";
                return RULES_MENU;
            }

            // --- FLOW: CLIMA (BEGINNING: Input -> MIDDLE: API -> END: Verdict + CTA) ---
            if (currentState === 'WAITING_CLIMATE_CITY') {
                const ClimateService = require('../External_Context/Climate/Climate.service');
                UazapiService.sendMessage(clientNumber, `🔍 Buscando informações sobre "${input}"... Aguarde um momento.`);

                if (/^\d+$/.test(input) && input.length <= 2) {
                    return `❌ *Município inválido.* Por favor, informe o nome da cidade por extenso (ex: Uberlândia MG).\n\nPara voltar, digite *0*.`;
                }

                const coords = await ClimateService.getCoordinates(input);
                if (!coords) return `❌ Município não encontrado: "${input}"\n\nDicas:\n• Verifique a grafia\n• Informe também o estado: "Uberlândia MG"\n\nTente novamente:`;

                const station = await ClimateService.findNearestInmetStation(coords.latitude, coords.longitude);
                if (!station) return `❌ Nenhuma estação INMET próxima encontrada para ${coords.displayName}.`;

                this.updateState(client, 'WAITING_CLIMATE_PERIOD', { farm_location: { ...coords, station } });
                return `✅ Estação encontrada: ${station.name} (${station.distance.toFixed(1)} km)\n\nInforme o período de consulta (DD/MM/AAAA a DD/MM/AAAA):\nExemplo: 01/01/2024 a 31/03/2024`;
            }

            if (currentState === 'WAITING_CLIMATE_PERIOD') {
                const ClimateService = require('../External_Context/Climate/Climate.service');
                const locationData = client.farm_location;

                const dateRegex = /(\d{2})[\/.-](\d{2})[\/.-](\d{4})/g;
                const matches = [...input.matchAll(dateRegex)];
                let customStartDate = null, customEndDate = null, days = 90;

                if (matches.length >= 2) {
                    customStartDate = `${matches[0][3]}-${matches[0][2]}-${matches[0][1]}`;
                    customEndDate = `${matches[1][3]}-${matches[1][2]}-${matches[1][1]}`;
                } else if (matches.length === 1) {
                    customStartDate = `${matches[0][3]}-${matches[0][2]}-${matches[0][1]}`;
                    const s = new Date(customStartDate);
                    s.setDate(s.getDate() + 30);
                    customEndDate = s.toISOString().split('T')[0];
                }

                const climateData = await ClimateService.getInmetData(locationData.latitude, locationData.longitude, days, customStartDate, customEndDate);
                this.updateState(client, 'MENU_SHOWN');

                if (climateData && climateData.data) {
                    const totalRain = climateData.data.reduce((sum, day) => sum + (day.precipitation || 0), 0).toFixed(1);
                    const avgTemp = (climateData.data.reduce((sum, day) => sum + (day.tempAvg || 0), 0) / climateData.data.length).toFixed(1);
                    const periodStr = (customStartDate && customEndDate) ? `${customStartDate} a ${customEndDate}` : `Últimos ${days} dias`;

                    return `🌦️ *DADOS CLIMÁTICOS — INMET*\n\n` +
                        `Estação: ${climateData.station.name}\n` +
                        `Período: ${periodStr}\n\n` +
                        `📊 *RESUMO:*\n` +
                        `🌧️ Precipitação Total: ${totalRain} mm\n` +
                        `🌡️ Temperatura Média: ${avgTemp}°C\n\n` +
                        `ℹ️ Dados públicos (INMET/NASA).\n\n` +
                        `Esses dados se relacionam à sua situação?\n` +
                        `[Agendar consulta] [Nova consulta] [Voltar ao menu]`;
                }
                return `⚠️ Sem dados disponíveis para o período na estação ${locationData.station.name}.\n\n[Tentar outra estação] [Voltar ao menu]`;
            }

            // --- FLOW: LAWYER SCHEDULING ---
            if (currentState === 'WAITING_LAWYER_CONTACT') {
                UazapiService.sendMessage(clientNumber, `⏳ Enviando solicitação...`);
                try {
                    const parts = input.split(',').map(p => p.trim());
                    BaserowService.saveLead({ whatsapp: clientNumber, name: parts[0] || 'Desc.', location: parts[1] || 'N/I', topic: parts[2] || 'N/I', priority: parts[3] || 'Não' }).catch(() => { });
                } catch (err) { console.error("Baserow error:", err); }

                this.updateState(client, 'MENU_SHOWN');
                return `✅ *Solicitação Recebida!*\n\nObrigado, ${input.split(',')[0]}! A equipe entrará em contato em breve.\n\n[Voltar ao menu principal]`;
            }

            // --- NUMERIC PROTECTION (Anti-RAG) ---
            if (/^\d+$/.test(input) && input.length <= 2) {
                return `❌ *Opção inválida.*\n\nPor favor, escolha um dos números do menu ou descreva sua dúvida por extenso.\n\n` + MENU_TEXT;
            }

            // --- FALLBACK: RAG Brain ---
            console.log(`Routing to RAG Brain: ${input}`);
            const embedding = await RAGService.generateEmbedding(textInput);
            const cachedResponse = await RAGService.getSemanticHit(embedding);
            if (cachedResponse) return cachedResponse;

            UazapiService.sendMessage(clientNumber, `⏳ Analisando sua dúvida no banco jurídico...`);
            const chunks = await RAGService.searchChunks(embedding);
            const contextText = chunks.map(c => `[Doc: ${c.source}]: ${c.text}`).join('\n\n');

            const systemPrompt = `Você é o MOHSIS, assistente jurídico agrário. Responda tecnicamente de forma educativa.
            PROIBIDO: Garantir resultados, dizer "tem direito", analisar contratos específicos.
            CONTEXTO: ${contextText}\nEntrada: ${textInput}`;

            const completion = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "system", content: systemPrompt }, { role: "user", content: textInput }] });
            const finalResponse = completion.choices[0].message.content;

            RAGService.learnResponse(textInput, embedding, finalResponse).catch(() => { });
            return finalResponse;

        } catch (error) {
            console.error("Critical Error in AIAgentService:", error);
            return "Erro técnico. Digite 'Menu' para reiniciar.";
        }
    }
}

module.exports = new AIAgentService();
