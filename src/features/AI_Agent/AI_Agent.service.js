const OpenAI = require('openai');
const RAGService = require('../RAG_Core/RAG_Core.service');

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

            const MENU_TEXT = `Olá, sou seu assistente inteligente rural. 🌾\nEstou aqui para ajudar você com produção, clima, mercados e gestão de dívidas rurais.\nSelecione uma opção abaixo para começar:\n\n` +
                `🌱 1. ZARC – risco climático da sua cultura\n` +
                `🌦️ 2. Clima e alertas da lavoura\n` +
                `📈 3. Preços do mercado rural\n` +
                `🐄 4. Produção e pecuária\n` +
                `💰 5. Analisar dívidas em atraso\n` +
                `💳 6. Prorrogar ou renegociar dívidas rurais\n` +
                `📊 7. Simular risco financeiro (Premium)\n` +
                `📷 8. Analisar frustração de safra (Premium)\n` +
                `🏠 9. Diagnóstico de patrimônio rural (Premium)\n` +
                `📘 10. Normas de crédito rural e renegociação\n` +
                `📅 11. Agendar com advogado\n\n` +
                `_Digite apenas o número da opção desejada._`;

            // --- RESET TRIGGER & GREETINGS ---
            const greetings = ['oi', 'olá', 'ola', 'menu', 'inicio', 'início', 'reset', 'começar', 'bom dia', 'boa tarde', 'boa noite', 'ajuda'];
            if (greetings.includes(input.toLowerCase())) {
                currentState = 'START';
                await client.update({ conversation_stage: 'START' });
                return MENU_TEXT;
            }

            // --- DOCUMENT DATA TRIGGER ---
            if (input.startsWith('[DADOS_DOCUMENTO]')) {
                textInput = `${input}\n\nAnalise estes dados identificados no documento com base no nosso contexto atual de ${currentState}.`;
            }

            // --- STATE: START / MENU SELECTION ---
            if (currentState === 'START' || currentState === 'MENU_SHOWN') {
                // Return Menu immediately if state is START and no option selected
                if (currentState === 'START' && !['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'].includes(input)) {
                    await client.update({ conversation_stage: 'MENU_SHOWN' });
                    return MENU_TEXT;
                }
                if (input === '1') {
                    await client.update({ conversation_stage: 'WAITING_ZARC_DATA' });
                    return "🌱 *ZARC – Risco Climático*\n\nInforme sua cidade ou município e a cultura principal.\n\nExemplo:\n📍 Município: Arapiraca – AL\n🌾 Cultura: Soja";
                }
                if (input === '2') {
                    await client.update({ conversation_stage: 'WAITING_CLIMATE_CITY' });
                    return "🌦️ *Clima e Alertas*\n\nQual cidade ou área deseja acompanhar?";
                }
                if (input === '3') {
                    await client.update({ conversation_stage: 'WAITING_PRICES_OPTION' });
                    return "📈 *Preços do Mercado*\n\nSelecione o produto que deseja acompanhar:\n1. 🐂 Boi Gordo\n2. 🌽 Milho\n3. 🌱 Soja";
                }
                if (input === '4') {
                    await client.update({ conversation_stage: 'WAITING_PRODUCTION_OPTION' });
                    return "🐄 *Produção e Pecuária*\n\nSelecione um item:\n1. 🌱 Desenvolvimento da lavoura\n2. 🐄 Ganho de peso do gado\n3. 📆 Conselhos safristas";
                }
                if (input === '5') {
                    await client.update({ conversation_stage: 'WAITING_DEBT_DATA' });
                    return "💰 *Dívidas em Atraso*\n\nVocê tem dívidas rurais em atraso ou próximas do vencimento?\n(Responda Sim ou Não)";
                }
                if (input === '6') {
                    await client.update({ conversation_stage: 'WAITING_RENEGOTIATION_OPTION' });
                    return "💳 *Prorrogação/Renegociação*\n\nSelecione sua situação:\n1️⃣ Parcela vencida ou prestes a vencer\n2️⃣ Quebra ou frustração de safra\n3️⃣ Queda de renda ou prejuízo\n4️⃣ Dívidas acumuladas";
                }
                if (input === '7') {
                    await client.update({ conversation_stage: 'PREMIUM_OFFER_7' });
                    return "🛑 *Acesso Premium*\n\nEssa análise faz parte do plano Premium capaz de gerar um relatório técnico automatizado.\n\n💰 Assinatura: R$ 99,90/mês\n\nDeseja continuar?\n✅ Sim, assinar Premium\n🔙 Voltar ao menu";
                }
                if (input === '8') {
                    await client.update({ conversation_stage: 'PREMIUM_OFFER_8' });
                    return "🛑 *Acesso Premium*\n\nEssa análise faz parte do plano Premium. Pode exigir envio de fotos e dados climáticos.\n\nDeseja continuar?\n✅ Sim, Premium\n🔙 Menu";
                }
                if (input === '9') {
                    await client.update({ conversation_stage: 'PREMIUM_OFFER_9' });
                    return "🛑 *Acesso Premium*\n\nEssa análise faz parte do plano Premium.\nEnvie matrícula do imóvel ou documentos de garantias.\n\nDeseja continuar?\n✅ Sim, Premium\n🔙 Menu";
                }
                if (input === '10') {
                    await client.update({ conversation_stage: 'WAITING_NORM_OPTION' });
                    return "📘 *Normas e Legislação*\n\nSelecione um item:\n1️⃣ Resoluções do CMN\n2️⃣ Manual de Crédito Rural\n3️⃣ Exemplos de renegociação prática\n4️⃣ Recuperação extrajudicial rural";
                }
                if (input === '11') {
                    await client.update({ conversation_stage: 'WAITING_LEGAL_SCHEDULE' });
                    return "📅 *Agendar com Advogado*\n\nVocê pode agendar atendimento com especialista.\nPor favor, informe:\n📅 dia (dd/mm)\n⏰ horário preferido";
                }

                if (currentState === 'MENU_SHOWN') {
                    // If user is in Menu state but typed something unrecognized
                    // If it's short (like a greeting), just return Menu again
                    if (input.length < 15) {
                        return MENU_TEXT;
                    }
                    // If it's a long question, we'll let it fall through to RAG below
                }

                if (currentState === 'START') {
                    await client.update({ conversation_stage: 'MENU_SHOWN' });
                    return MENU_TEXT;
                }
            }

            // --- FLOW: 1. ZARC ---
            if (currentState === 'WAITING_ZARC_DATA') {
                await client.update({ conversation_stage: 'MENU_SHOWN' });
                const cultureMatch = input.match(/Cultura:\s*(.*)/i) || [null, "Cultura"];
                const cityMatch = input.match(/Município:\s*(.*)/i) || [null, textInput];
                return `🌱 *ZARC – Zoneamento Agrícola*\n\n📍 Cultura: ${cultureMatch[1]}\n📍 Município: ${cityMatch[1]}\n\n📅 Jan a Mar – risco baixo\n📅 Abr a Jun – risco moderado\n📅 Jul a Set – risco elevado\n\nPlantio dentro da janela ideal reduz o risco. Fonte: MAPA.\n\nQuer receber alertas?\n✅ Sim, avisar\n🔙 Voltar ao menu`;
            }

            // --- FLOW: 2. CLIMA (WITH API) ---
            if (currentState === 'WAITING_CLIMATE_CITY') {
                const ClimateService = require('../External_Context/Climate/Climate.service');
                const riskData = await ClimateService.getClimateRisk(-12.14, -44.99); // LEM default

                await client.update({ conversation_stage: 'MENU_SHOWN' });
                return `☁️ *Previsão Climática para ${textInput}:*\n` +
                    `• Chuva prevista: ${riskData.average_precipitation || 0} mm\n` +
                    `• Temperatura média: ${riskData.average_temperature || 25}°C\n` +
                    `• Possibilidade de estiagem: ${riskData.risk_level === 'HIGH' ? 'Alta' : 'Baixa'}\n\n` +
                    `Isso impacta sua produtividade.\n\nQuer receber alertas?\n✅ Sim\n🔙 Menu`;
            }

            // --- FLOW: 3. PREÇOS ---
            if (currentState === 'WAITING_PRICES_OPTION') {
                await client.update({ conversation_stage: 'MENU_SHOWN' });
                let produto = "Boi Gordo";
                if (input === '2') produto = "Milho";
                if (input === '3') produto = "Soja";
                return `📈 *Preço atual de ${produto} na sua região:*\nR$ 285,00/@ (Simulado)\nVariação semanal: +1.2%\n\n✅ Receber alertas\n🔙 Menu principal`;
            }

            // --- FLOW: 5. DÍVIDAS ---
            if (currentState === 'WAITING_DEBT_DATA') {
                if (input.toLowerCase().includes('sim')) {
                    await client.update({ conversation_stage: 'COLLECTING_DEBT_DETAILS' });
                    return "Informe aproximadamente:\n• valor total das dívidas\n• banco ou cooperativa\n• parcelas em atraso";
                }
                await client.update({ conversation_stage: 'MENU_SHOWN' });
                return "Ótimo! Continue acompanhando sua produção.\n\n🔙 Menu";
            }
            if (currentState === 'COLLECTING_DEBT_DETAILS') {
                await client.update({ conversation_stage: 'MENU_SHOWN' });
                return "Obrigado. Dívidas em atraso afetam seu crédito.\n\nSe quiser, posso simular o risco financeiro Premium.\n🔍 Simular agora\n🔙 Menu principal";
            }

            // --- FLOW: 6. RENEGOCIAÇÃO ---
            if (currentState === 'WAITING_RENEGOTIATION_OPTION') {
                await client.update({ conversation_stage: 'MENU_SHOWN' });
                if (input === '1') return "📌 Manual de Crédito Rural prevê possibilidade de prorrogação quando há dificuldade temporária.\n\nQuer análise técnica?\n🔍 Simular Premium\n🔙 Menu";
                if (input === '2') return "📌 Em eventos climáticos, o MCR permite alongamento.\n\nPosso analisar seu caso com fotos?\n📷 Enviar fotos/data";
                return "📌 Reorganização do passivo disponível no MCR.\n\nQuer simular Premium?\n🔍 Simular agora\n🔙 Menu";
            }

            // --- FLOW: 7. SIMULAR RISCO (PREMIUM) ---
            if (currentState === 'PREMIUM_OFFER_7') {
                if (input.toLowerCase().includes('sim') || input.toLowerCase().includes('assinar')) {
                    await client.update({ conversation_stage: 'COLLECTING_PREMIUM_FINANCE_DATA' });
                    return "✅ *Assinatura Premium Confirmada!*\n\nPor favor, informe para o relatório:\n• valor total das dívidas\n• renda mensal estimada\n• banco/coop\n• período de contrato";
                }
                await client.update({ conversation_stage: 'MENU_SHOWN' });
                return "Entendido. Voltando ao menu.\n\n" + MENU_TEXT;
            }

            // --- FLOW: 8. FRUSTRAÇÃO DE SAFRA (PREMIUM) ---
            if (currentState === 'PREMIUM_OFFER_8') {
                if (input.toLowerCase().includes('sim')) {
                    await client.update({ conversation_stage: 'WAITING_PREMIUM_PHOTOS' });
                    return "✅ *Acesso Premium Liberado!*\n\nPor favor, envie as fotos da lavoura ou laudos técnicos para iniciarmos a análise de frustração.";
                }
                await client.update({ conversation_stage: 'MENU_SHOWN' });
                return "Voltando ao menu principal.\n\n" + MENU_TEXT;
            }

            // --- RAG ROUTER (FALLBACK FOR OPEN QUESTIONS OR PREMIUM ANALYSIS) ---
            console.log(`Routing to RAG AI for input: ${input} in stage: ${currentState}`);

            let extraContext = "";

            // Integrate Real-Time Data if relevant to Finance or Climate
            if (currentState.includes('FINANCE') || currentState.includes('DEBT') || input.toLowerCase().includes('juros')) {
                const BacenService = require('../External_Context/Bacen/Bacen.service');
                try {
                    const rates = await BacenService.obterTaxasCreditoRuralAtuais();
                    extraContext += `\n[DADOS REAIS BACEN]: ${JSON.stringify(rates)}`;
                } catch (e) { console.error("Bacen inject error", e.message); }
            }

            if (currentState.includes('CLIMATE') || currentState.includes('SAFRA') || input.toLowerCase().includes('chuva')) {
                const ClimateService = require('../External_Context/Climate/Climate.service');
                try {
                    const risk = await ClimateService.getClimateRisk(-12.14, -44.99); // LEM Hub
                    extraContext += `\n[DADOS REAIS CLIMA NASA/INMET]: ${JSON.stringify(risk)}`;
                } catch (e) { console.error("Climate inject error", e.message); }
            }

            const embedding = await RAGService.generateEmbedding(textInput);
            const chunks = await RAGService.searchChunks(embedding);
            const contextText = chunks.map(c => `[Doc: ${c.source}, ID: ${c.doc_id}]: ${c.text}`).join('\n\n');

            const systemPrompt = `
            Você é o assistente virtual do MOHSIS (Sistema de Inteligência do Agronegócio).
            Sua missão é responder com base ESTRITAMENTE nos dados técnicos, Manual de Crédito Rural (MCR) e dados de API fornecidos.
            
            DIRETRIZES DE INTEGRAÇÃO:
            1. Se o usuário apenas te cumprimentar (ex: "oi", "boa tarde") sem uma dúvida técnica, peça educadamente para ele escolher uma opção do menu principal ou digitar "Menu".
            2. Se houver [DADOS REAIS BACEN], use-os para analisar juros e simular parcelas.
            3. Se houver [DADOS REAIS CLIMA], use-os para validar perdas de safra.
            4. Cite sempre o MCR como base jurídica para prorrogações.
            5. Use os termos: "análise preliminar", "indícios técnicos".
            
            CONTEXTO JURÍDICO (RAG):
            ${contextText}
            
            DADOS DE API (REAL-TIME):
            ${extraContext}
            
            Responda em JSON: {"resposta": "...", "citacoes": []}
            `;

            const completion = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: textInput }
                ],
                response_format: { type: "json_object" },
                temperature: 0.1
            });

            const parsed = JSON.parse(completion.choices[0].message.content);
            return parsed.resposta;

        } catch (error) {
            console.error("Critical Error in AIAgentService:", error);
            return "Desculpe, ocorreu um erro técnico. Digite 'Menu' para reiniciar.";
        }
    }
}

module.exports = new AIAgentService();
