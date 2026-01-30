const OpenAI = require('openai');
const RAGService = require('../RAG_Core/RAG_Core.service');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

class AIAgentService {
    async generateResponse(clientNumber, textInput) {
        try {
            console.log(`Processing message for ${clientNumber}: ${textInput}`);

            // 1. Generate Embedding
            const embedding = await RAGService.generateEmbedding(textInput);

            // 2. Search Chunks (RAG)
            const chunks = await RAGService.searchChunks(embedding);

            // Format chunks for context
            const contextText = chunks.map(c =>
                `[Source: ${c.source}, DocID: ${c.doc_id}, ChunkID: ${c.chunk_id}]: ${c.text}`
            ).join('\n\n');

            // 3. Construct Prompt
            const systemPrompt = `
            Você é um assistente jurídico/financeiro especializado.
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
                // Fallback logic could be complex, for now returning a safety message
                return "Peço desculpas, mas verifiquei minhas fontes e encontrei uma inconsistência. Poderia reformular a pergunta?";
            }

            return parsedResponse.resposta;

        } catch (error) {
            console.error("Error in AI Agent:", error);
            return "Desculpe, ocorreu um erro interno ao processar sua solicitação.";
        }
    }
}

module.exports = new AIAgentService();
