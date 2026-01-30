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
                    if (input.length < 15) return MENU_TEXT;
                }

                if (currentState === 'START') {
                    await client.update({ conversation_stage: 'MENU_SHOWN' });
                    return MENU_TEXT;
                }
            }

            // --- REPLICABLE FLOW LOGIC (BEGINNING -> MIDDLE -> END) ---

            // FLOW 1: ZARC
            if (currentState === 'WAITING_ZARC_DATA') {
                const culture = input.match(/Cultura:\s*(.*)/i)?.[1] || "Cultura";
                const city = input.match(/Município:\s*(.*)/i)?.[1] || textInput;

                await client.update({ conversation_stage: 'MENU_SHOWN' });
                return `🌱 *ZARC – Zoneamento de Risco*\\n\n📍 Cultura: ${culture}\n📍 Município: ${city}\n\n📅 Jan a Mar – risco baixo\n📅 Abr a Jun – risco moderado\n📅 Jul a Set – risco elevado\n\n*VEREDITO:* O plantio dentro da janela ideal reduz o risco e facilita o crédito.\n\nQuer alertas climáticos?\n✅ Sim, avisar\n🔙 Voltar ao menu`;
            }

            // FLOW 2: CLIMA (BEGINNING: Input -> MIDDLE: API -> END: Verdict + CTA)
            if (currentState === 'WAITING_CLIMATE_CITY') {
                const ClimateService = require('../External_Context/Climate/Climate.service');
                const risk = await ClimateService.getClimateRisk(-12.14, -44.99); // LEM default

                await client.update({ conversation_stage: 'MENU_SHOWN' });
                return `🌦️ *CLIMA E ALERTAS - ${textInput}*\n\n• Chuva prevista: ${risk.average_precipitation} mm\n• Temperatura: ${risk.average_temperature} °C\n• Estresse Hídrico: ${risk.risk_level === 'HIGH' ? 'ALTO' : 'BAIXO'}\n\n*ANÁLISE:* Condições impactam produtividade e manejo.\n\nQuer alertas automáticos?\n✅ Sim\n🔙 Voltar ao menu`;
            }

            // FLOW 5: DÍVIDAS (BEGINNING: Confirmation -> MIDDLE: Collection -> END: Analysis + CTA)
            if (currentState === 'WAITING_DEBT_DATA') {
                if (input.toLowerCase().includes('sim')) {
                    await client.update({ conversation_stage: 'COLLECTING_DEBT_DETAILS' });
                    return "Informe aproximadamente:\n• Valor total\n• Banco/Cooperativa\n• Parcelas em atraso";
                }
                await client.update({ conversation_stage: 'MENU_SHOWN' });
                return "Ótimo! Continue acompanhando suas finanças.\n\n🔙 Menu";
            }
            if (currentState === 'COLLECTING_DEBT_DETAILS') {
                await client.update({ conversation_stage: 'MENU_SHOWN' });
                return `📊 *ANÁLISE DE DÍVIDA*\n\nDívidas em atraso geram encargos e restrição de crédito.\n\n*PRÓXIMO PASSO:* Posso simular o risco financeiro e verificar normas de renegociação.\n🔍 Simular agora (Premium)\n🔙 Menu principal`;
            }

            // FLOW 6: RENEGOCIAÇÃO (BEGINNING: Option -> MIDDLE: Logic -> END: Verdict + CTA)
            if (currentState === 'WAITING_RENEGOTIATION_OPTION') {
                await client.update({ conversation_stage: 'MENU_SHOWN' });
                if (input === '2') return "📌 *VEREDITO:* Em quebras de safra, o MCR permite o alongamento da dívida.\n\nPosso iniciar sua análise premium?\n📷 Enviar fotos/laudo\n🔙 Menu";
                return "📌 *VEREDITO:* O MCR prevê prorrogação por dificuldade temporária.\n\nQuer uma simulação técnica?\n🔍 Simular Premium\n🔙 Menu";
            }

            // FLOW PREMIUM (Unified Endings)
            if (currentState.startsWith('PREMIUM_OFFER')) {
                if (input.toLowerCase().includes('sim')) {
                    await client.update({ conversation_stage: 'MENU_SHOWN' });
                    return "✅ *Assinatura Premium Ativada!*\nNossa IA está processando seus dados climáticos e financeiros para gerar seu relatório.\n\nPara estratégia jurídica completa:\n📅 Agendar com advogado";
                }
                await client.update({ conversation_stage: 'MENU_SHOWN' });
                return "Voltando ao menu principal.\n\n" + MENU_TEXT;
            }

            // FALLBACK: RAG ROUTER (REPLICATING THE TECHNICAL PATTERN)
            console.log(`Routing to RAG Brain: ${input}`);
            let extraContext = "";
            if (currentState.includes('FINANCE') || input.toLowerCase().includes('juros')) {
                const BacenService = require('../External_Context/Bacen/Bacen.service');
                const rates = await BacenService.obterTaxasCreditoRuralAtuais();
                extraContext += `\n[FINANCEIRO REAL]: ${JSON.stringify(rates)}`;
            }

            const embedding = await RAGService.generateEmbedding(textInput);
            const chunks = await RAGService.searchChunks(embedding);
            const contextText = chunks.map(c => `[Doc: ${c.source}]: ${c.text}`).join('\n\n');

            const systemPrompt = `Você é o MOHSIS. Responda tecnicamente (Começo, Meio e Fim):
            1. Analise o problema (MCR/Dados).
            2. Dê o veredito preliminar.
            3. Recomende agendamento com advogado.
            
            CONTEXTO: ${contextText} ${extraContext}
            Responda em JSON: {"resposta": "..."}`;

            const completion = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [{ role: "system", content: systemPrompt }, { role: "user", content: textInput }],
                response_format: { type: "json_object" }
            });

            return JSON.parse(completion.choices[0].message.content).resposta;

        } catch (error) {
            console.error("Critical Error in AIAgentService:", error);
            return "Erro técnico. Digite 'Menu' para reiniciar.";
        }
    }
}

module.exports = new AIAgentService();
