const OpenAI = require('openai');
const RAGService = require('../RAG_Core/RAG_Core.service');
const BaserowService = require('../External_Context/Baserow/Baserow.service');
const UazapiService = require('../Uazapi/Uazapi.service');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const ClientService = require('../Client/Client.service');
const Client = require('../../models/Client'); // Direct model access for updates if needed, or use service

class AIAgentService {
    async generateResponse(clientNumber, textInput) {
        try {
            console.log(`Processing message for ${clientNumber}: ${textInput}`);

            // Get Client State
            const client = await ClientService.findOrCreateClient(clientNumber);
            let currentState = client.conversation_stage || 'START';
            const input = textInput.trim();

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

            // --- RESET TRIGGER & GREETINGS ---
            const greetings = ['oi', 'olá', 'ola', 'menu', 'inicio', 'início', 'reset', 'começar', 'bom dia', 'boa tarde', 'boa noite', 'ajuda', 'termos'];
            const lowerInput = input.toLowerCase();

            // Allow substring match for greetings (e.g. "Oi!" or "Bom dia, tudo bem?")
            if (greetings.some(g => lowerInput.includes(g))) {
                if (input.toLowerCase() === 'termos') {
                    currentState = 'WAITING_TERMS';
                    await client.update({ conversation_stage: 'WAITING_TERMS' });
                    return TERMS_TEXT;
                }

                if (!client.conversation_stage || client.conversation_stage === 'START') {
                    currentState = 'WAITING_TERMS';
                    await client.update({ conversation_stage: 'WAITING_TERMS' });
                    return `🌾 Olá! Sou o Mohsis, assistente de informação do Dr. [Nome].\n\n` +
                        `⚠️ Importante: Sou uma ferramenta de informação e triagem. Não realizo análises jurídicas.\n\n` +
                        `Antes de continuar, você aceita nossos termos de uso?\n[Ver termos] [Aceitar e continuar] [Não quero continuar]`;
                }

                currentState = 'MENU_SHOWN';
                await client.update({ conversation_stage: 'MENU_SHOWN' });
                return MENU_TEXT;
            }

            // --- DOCUMENT DATA TRIGGER ---
            if (input.startsWith('[DADOS_DOCUMENTO]')) {
                textInput = `${input}\n\nAnalise estes dados identificados no documento com base no nosso contexto atual de ${currentState}.`;
            }

            // --- STATE: WAITING_TERMS (ONBOARDING) ---
            if (currentState === 'WAITING_TERMS') {
                if (input.toLowerCase().includes('ver termos') || input.toLowerCase().includes('termos')) {
                    return TERMS_TEXT;
                }
                if (input.toLowerCase().includes('aceit') || input.toLowerCase().includes('sim') || input.toLowerCase().includes('continuar')) {
                    currentState = 'MENU_SHOWN';
                    await client.update({ conversation_stage: 'MENU_SHOWN' });
                    return MENU_TEXT;
                }
                if (input.toLowerCase().includes('não') || input.toLowerCase().includes('nao')) {
                    await client.update({ conversation_stage: 'START' }); // Reset
                    return "Entendido! Sem problemas.\n\nPara informações gerais, acesse nosso site.\nSe mudar de ideia, é só enviar uma mensagem aqui.\n\nBom trabalho! 🌾";
                }
                // Fallback for this state
                return "Para prosseguir, preciso que você aceite ou veja os termos.\n[Ver termos] [Aceitar] [Não aceito]";
            }

            // --- STATE: MENU SELECTION ---
            if (currentState === 'MENU_SHOWN') {
                if (input === '1') {
                    await client.update({ conversation_stage: 'WAITING_MONITORAMENTO_SUBOPTION' });
                    return MONITORAMENTO_MENU;
                }
                if (input === '2') {
                    await client.update({ conversation_stage: 'WAITING_MERCADO_SUBOPTION' });
                    return MERCADO_MENU;
                }
                if (input === '3') {
                    await client.update({ conversation_stage: 'WAITING_RULES_SUBOPTION' });
                    return RULES_MENU;
                }
                if (input === '4' || input.toLowerCase().includes('agendar') || input.toLowerCase().includes('individual')) {
                    await client.update({ conversation_stage: 'WAITING_LAWYER_CONTACT' });
                    return "📅 *Análise de caso Individual (Agendar)*\n\nPara prosseguir com o agendamento, por favor informe (separado por vírgulas):\n1. Seu nome completo\n2. Município/estado do imóvel\n3. Tema principal\n4. Prioridade (sim/não)";
                }
                if (input === '0') {
                    await client.update({ conversation_stage: 'MENU_SHOWN' });
                    return MENU_TEXT;
                }

                // Smart Redirects from Climate Result
                if (input.toLowerCase().includes('nova consulta')) {
                    await client.update({ conversation_stage: 'WAITING_CLIMATE_CITY' });
                    return "🌦️ *Consulta a Dados Climáticos Públicos*\n\nInforme o município para consulta:\nExemplo: Uberlândia";
                }

                if (input.toLowerCase().includes('oi') || input.length < 5) return MENU_TEXT;
            }

            // --- SUBMENU: MONITORAMENTO ---
            if (currentState === 'WAITING_MONITORAMENTO_SUBOPTION') {
                if (input === '0') {
                    await client.update({ conversation_stage: 'MENU_SHOWN' });
                    return MENU_TEXT;
                }
                if (input === '1') {
                    await client.update({ conversation_stage: 'WAITING_CLIMATE_CITY' });
                    return "🌦️ *Consulta a Dados Climáticos Públicos*\n\nInforme o município para consulta:\nExemplo: Uberlândia";
                }
                if (input === '2') {
                    await client.update({ conversation_stage: 'WAITING_MONITORAMENTO_SUBOPTION' });
                    return `📊 *Zoneamento Agrícola de Risco Climático (ZARC)*\n\nO ZARC é uma ferramenta oficial do MAPA.\n\n📱 *Acesso oficial (gratuito):*\n\nAplicativo **Plantio Certo**:\n• Download: Play Store ou App Store\n\n💻 *Site do MAPA:*\nhttps://www.gov.br/agricultura/pt-br/assuntos/riscos-seguro/zarc\n\n[Voltar]`;
                }
                if (input === '3') {
                    await client.update({ conversation_stage: 'WAITING_MONITORAMENTO_SUBOPTION' });
                    return "📷 *Análise de frustração de safra*\n\nEsta funcionalidade permite analisar fotos e laudos de perdas na lavoura.\n\n⚠️ Funcionalidade em desenvolvimento.\nPara triagem manual, responda com sua situação ou agende com Dr. [Nome].\n\n[Voltar]";
                }
                return MONITORAMENTO_MENU;
            }

            // --- SUBMENU: MERCADO ---
            if (currentState === 'WAITING_MERCADO_SUBOPTION') {
                if (input === '0') {
                    await client.update({ conversation_stage: 'MENU_SHOWN' });
                    return MENU_TEXT;
                }
                const baseResponse = "📈 *MERCADO E PRODUÇÃO (Informativo)*\n\nApresento informações gerais baseadas em dados públicos e de mercado.\n\n⚠️ Funcionalidade automatizada (V2) em breve.\nPara consulta direta: https://cepea.esalq.usp.br\n\n[Voltar]";
                if (input === '1' || input === '2' || input === '3') {
                    await client.update({ conversation_stage: 'WAITING_MERCADO_SUBOPTION' });
                    return baseResponse;
                }
                return MERCADO_MENU;
            }

            // --- SUBMENU: RULES (Promoted Menu 3) ---
            if (currentState === 'WAITING_RULES_SUBOPTION') {
                if (input === '0') {
                    await client.update({ conversation_stage: 'MENU_SHOWN' });
                    return MENU_TEXT;
                }
                const ruleInfo = "📘 *Informação Geral*\n\nAs regras de crédito rural (MCR) permitem ajustes em parcelas sob certas condições (clima, preço, pragas).\n\n⚠️ Nota: A aplicação depende de análise contratual individual.\n\n[0] Voltar";
                if (['a', 'b', 'c', 'A', 'B', 'C'].includes(input)) {
                    await client.update({ conversation_stage: 'WAITING_RULES_SUBOPTION' });
                    return ruleInfo;
                }
                return RULES_MENU;
            }

            // --- REPLICABLE FLOW LOGIC (BEGINNING -> MIDDLE -> END) ---

            // FLOW 2: CLIMA (BEGINNING: Input -> MIDDLE: API -> END: Verdict + CTA)
            if (currentState === 'WAITING_CLIMATE_CITY') {
                const ClimateService = require('../External_Context/Climate/Climate.service');

                // FEEDBACK MSG: Map search can be slow
                await UazapiService.sendMessage(clientNumber, `🔍 Buscando informações sobre "${textInput}"... Aguarde um momento.`);

                // 1. Geocoding
                const coords = await ClimateService.getCoordinates(textInput);
                if (!coords) {
                    return `❌ Município não encontrado: "${textInput}"\n\nDicas:\n• Verifique a grafia\n• Informe também o estado: "Uberlândia MG"\n\nTente novamente:`;
                }

                // 2. Find Nearest Station
                const station = await ClimateService.findNearestInmetStation(coords.latitude, coords.longitude);
                if (!station) {
                    return `❌ Nenhuma estação INMET próxima encontrada para ${coords.displayName}.`;
                }

                // 3. Save Context & Ask Period
                await client.update({
                    conversation_stage: 'WAITING_CLIMATE_PERIOD',
                    farm_location: { ...coords, station }
                });

                return `✅ Estação encontrada: ${station.name} (${station.distance.toFixed(1)} km)\n\nInforme o período de consulta (DD/MM/AAAA a DD/MM/AAAA):\nExemplo: 01/01/2024 a 31/03/2024`;
            }

            if (currentState === 'WAITING_CLIMATE_PERIOD') {
                const ClimateService = require('../External_Context/Climate/Climate.service');
                const locationData = client.farm_location;

                // --- Date Parsing (DD/MM/YYYY) ---
                const dateRegex = /(\d{2})[\/.-](\d{2})[\/.-](\d{4})/g;
                const matches = [...textInput.matchAll(dateRegex)];

                let customStartDate = null;
                let customEndDate = null;
                let days = 90; // Default

                if (matches.length >= 2) {
                    // Start Date: YYYY-MM-DD
                    const startMatch = matches[0];
                    customStartDate = `${startMatch[3]}-${startMatch[2]}-${startMatch[1]}`;

                    // End Date: YYYY-MM-DD
                    const endMatch = matches[1];
                    customEndDate = `${endMatch[3]}-${endMatch[2]}-${endMatch[1]}`;

                    console.log(`[CLIMATE] Parsed custom period: ${customStartDate} to ${customEndDate}`);
                }
                else if (matches.length === 1) {
                    // Only start date found, assume 1 day or start->Now logic?
                    // For V1.4 simplify: if only 1 date, assume Start -> +30 days
                    const m = matches[0];
                    customStartDate = `${m[3]}-${m[2]}-${m[1]}`;
                    const s = new Date(customStartDate);
                    s.setDate(s.getDate() + 30);
                    customEndDate = s.toISOString().split('T')[0];
                }

                const climateData = await ClimateService.getInmetData(
                    locationData.latitude,
                    locationData.longitude,
                    days,
                    customStartDate,
                    customEndDate
                );

                await client.update({ conversation_stage: 'MENU_SHOWN' });

                // Format Result
                if (climateData && climateData.data) {
                    const totalRain = climateData.data.reduce((sum, day) => sum + (day.precipitation || 0), 0).toFixed(1);
                    const avgTemp = (climateData.data.reduce((sum, day) => sum + (day.tempAvg || 0), 0) / climateData.data.length).toFixed(1);

                    const periodStr = (customStartDate && customEndDate)
                        ? `${customStartDate} a ${customEndDate}`
                        : `Últimos ${days} dias`;

                    return `🌦️ *DADOS CLIMÁTICOS — INMET*\n\n` +
                        `Estação: ${climateData.station.name}\n` +
                        `Período: ${periodStr}\n` +
                        `Registros: ${climateData.metadata.dataPoints || climateData.data.length}\n\n` +
                        `📊 *RESUMO:*\n` +
                        `🌧️ Precipitação Total: ${totalRain} mm\n` +
                        `🌡️ Temperatura Média: ${avgTemp}°C\n\n` +
                        `ℹ️ *Nota:* Dados públicos oficiais (INMET/NASA).\n\n` +
                        `Esses dados se relacionam à sua situação?\n` +
                        `[Agendar consulta] [Nova consulta] [Voltar ao menu]`;
                } else {
                    return `⚠️ Sem dados disponíveis para o período na estação ${locationData.station.name}.\n\n[Tentar outra estação] [Voltar ao menu]`;
                }
            }

            // FLOW 5: LAWYER SCHEDULING
            if (currentState === 'WAITING_LAWYER_CONTACT') {
                // Log logic
                console.log(`[LEAD] New Scheduling Request: ${textInput}`);

                // FEEDBACK MSG
                await UazapiService.sendMessage(clientNumber, `⏳ Enviando solicitação...`);

                // --- INTEGRATION: BASEROW CRM ---
                try {
                    const parts = textInput.split(',').map(p => p.trim());
                    const leadData = {
                        whatsapp: clientNumber,
                        name: parts[0] || 'Desconhecido',
                        location: parts[1] || 'Não informado',
                        topic: parts[2] || 'Não informado',
                        priority: parts[3] || 'Não'
                    };
                    await BaserowService.saveLead(leadData);
                } catch (err) {
                    console.error("Failed to process lead for Baserow:", err);
                }

                await client.update({ conversation_stage: 'MENU_SHOWN' });
                return `✅ *Solicitação Recebida!*\n\nObrigado, ${textInput.split(',')[0]}! A equipe do Dr. [Nome] entrará em contato em breve para confirmar seu agendamento.\n\n[Voltar ao menu principal]`;
            }

            // FALLBACK: RAG ROUTER (Simple Educational)
            console.log(`Routing to RAG Brain: ${input}`);

            // FEEDBACK MSG
            await UazapiService.sendMessage(clientNumber, `⏳ Analisando sua dúvida no banco jurídico...`);

            const embedding = await RAGService.generateEmbedding(textInput);
            const chunks = await RAGService.searchChunks(embedding);
            const contextText = chunks.map(c => `[Doc: ${c.source}]: ${c.text}`).join('\n\n');

            const systemPrompt = `Você é o MOHSIS, assistente de informação jurídica agrária.
            Responda tecnicamente de forma educativa e informativa (Começo, Meio e Fim).

            DIRETRIZES ÉTICAS ABSOLUTAS (PROIBIÇÕES):
            - NÃO diga "Você tem direito" ou "O banco deve".
            - NÃO analise documentos ou contratos específicos.
            - NÃO garanta resultados judiciais ou isenção de dívidas.
            - NÃO sugira estratégias processuais.

            LINGUAGEM OBRIGATÓRIA:
            - Use: "A norma prevê a possibilidade...", "Em tese...", "Recomenda-se avaliar...".
            - SEMPRE termine com a frase: "Esta informação não substitui consulta jurídica profissional. Para análise específica, recomendo agendar consulta com advogado."

            CONTEXTO NORMATIVO: ${contextText}
            
            Entrada do usuário: ${textInput}`;

            const completion = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [{ role: "system", content: systemPrompt }, { role: "user", content: textInput }],
            });

            return completion.choices[0].message.content;

        } catch (error) {
            console.error("Critical Error in AIAgentService:", error);
            return "Erro técnico. Digite 'Menu' para reiniciar.";
        }
    }
}

module.exports = new AIAgentService();
