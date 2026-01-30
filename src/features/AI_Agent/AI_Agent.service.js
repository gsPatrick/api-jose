const OpenAI = require('openai');
const RAGService = require('../RAG_Core/RAG_Core.service');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

class AIAgentService {
    async generateResponse(clientNumber, textInput) {
        try {
            console.log(`Processing message for ${clientNumber}: ${textInput}`);

            // Normalizing Input
            const input = textInput.trim();

            const MENU_TEXT = `Bem-vindo ao *LegalFarm AI*. Escolha o que deseja analisar:\n\n` +
                `1️⃣ Análise de Risco Climático/Safra\n` +
                `2️⃣ Análise de Dívidas e Capacidade de Pagamento\n` +
                `3️⃣ Falar com Advogado (Assistente IA)\n` +
                `9️⃣ Outras Dúvidas (Chat Livre)\n\n` +
                `_Digite o número da opção desejada._`;

            // --- MENU LOGIC ---

            // If user says "Oi", "Ola", "Menu", "Inicio" -> Show Menu
            if (['oi', 'olá', 'ola', 'menu', 'inicio', 'início', 'ajuda'].includes(input.toLowerCase())) {
                return MENU_TEXT;
            }

            // Option 1: Climate Risk (Simplified for this version)
            if (input === '1') {
                return "🌾 *Análise de Risco Climático*\n\nPara prosseguir, por favor me envie:\n1. O nome da sua cidade/município.\n2. Se houve seca, geada ou excesso de chuva.\n\n_Você também pode enviar uma foto do laudo ou áudio explicando._";
            }

            // Option 2: Financial Risk
            if (input === '2') {
                return "💰 *Análise Financeira*\n\nVamos simular sua dívida. Por favor, me diga:\nQual o valor do financiamento e o prazo em meses?\n\n_Ex: 200.000 em 60 meses_";
            }

            // Option 3: Lawyer
            if (input === '3') {
                return "⚖️ *Assistente Jurídico*\n\nEstou aqui para ajudar com dúvidas legais do MCR. Qual sua dúvida específica sobre legislação rural?";
            }

            // Option 9 or Free Text -> RAG Flow
            // If it's a number but not 1, 2, 3, 9, show menu again
            if (/^\d+$/.test(input) && input !== '9') {
                return "Opção inválida.\n\n" + MENU_TEXT;
            }

            // --- RAG FLOW (Existing Logic) ---

            // 1. Generate Embedding
            const embedding = await RAGService.generateEmbedding(textInput);

            // 2. Search Chunks (RAG)
            const chunks = await RAGService.searchChunks(embedding);

            // If no relevant chunks found (basic threshold check via empty array if service implements it, or fallback)
            // For now assuming service always returns arrays.

            // Format chunks for context
            const contextText = chunks.map(c =>
                `[Source: ${c.source}, DocID: ${c.doc_id}, ChunkID: ${c.chunk_id}]: ${c.text}`
            ).join('\n\n');

            // 3. Construct Prompt
            const systemPrompt = `
            Você é um assistente jurídico/financeiro especializado em Crédito Rural (LegalFarm AI).
            Sua missão é responder com base ESTRITAMENTE no contexto fornecido abaixo.
            
            PROTOCOLO ANTI-ALUCINAÇÃO:
            - Se a resposta não estiver no contexto, diga "Não encontrei essa informação na minha base de dados jurídica."
            - NÃO invente leis ou dados.
            - CITE as fontes usando doc_id e chunk_id.
            
            FORMATO OBRIGATÓRIO DE RESPOSTA (JSON):
            {
                "resposta": "Texto da resposta ao usuário...",
                "citacoes": [
                    { "doc_id": "...", "chunk_id": "..." }
                ],
                "score": 0.0 a 1.0 (confiança)
            }
            
            CONTEXTO:
            ${contextText}
            `;

            // 4. Call LLM
            const completion = await openai.chat.completions.create({
                model: "gpt-4o-mini", // Using 'mini' as requested for cost/speed
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: textInput }
                ],
                response_format: { type: "json_object" },
                temperature: 0.1 // Low temp for factual accuracy
            });

            const responseContent = completion.choices[0].message.content;
            const parsedResponse = JSON.parse(responseContent);

            // 5. Validate Citations
            const validation = await RAGService.validateCitations(parsedResponse.citacoes);

            if (!validation.valid) {
                console.warn("Invalid citations detected, triggering fallback:", validation.missing);
                return "Peço desculpas, mas verifiquei minhas fontes e encontrei uma inconsistência na citação do documento. Poderia reformular a pergunta?";
            }

            return parsedResponse.resposta;

        } catch (error) {
            console.error("Error in AI Agent:", error);
            return "Desculpe, ocorreu um erro interno ao processar sua solicitação.";
        }
    }
}

module.exports = new AIAgentService();
