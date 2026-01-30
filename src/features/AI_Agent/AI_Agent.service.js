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

            const MENU_TEXT = `Bem-vindo ao *MOHSIS Sistema de Inteligência do Agronegócio* 🌾\n\nSou seu assistente jurídico rural. Escolha uma opção abaixo para começarmos:\n\n` +
                `1️⃣ *Análise de Risco Climático/Safra*\n(Avaliar perdas e frustração de safra)\n\n` +
                `2️⃣ *Análise de Dívidas*\n(Simular capacidade de pagamento)\n\n` +
                `3️⃣ *Assistente Jurídico*\n(Tirar dúvidas sobre legislação)\n\n` +
                `9️⃣ *Outras Dúvidas*\n(Chat livre com IA)\n\n` +
                `_Digite apenas o número da opção desejada._`;

            // --- RESET TRIGGER ---
            // If user says "Menu", "Inicio", "Oi" (and isn't in middle of form) -> Reset to Menu
            if (['oi', 'olá', 'ola', 'menu', 'inicio', 'início', 'reset', 'começar'].includes(input.toLowerCase())) {
                currentState = 'START';
                await client.update({ conversation_stage: 'START' });
            }

            // --- STATE: START / MENU ---
            if (currentState === 'START' && !['1', '2', '3', '9'].includes(input)) {
                // If checking for START, we almost ALWAYS show menu, unless input is a direct option
                console.log(`State is START. Showing Text Menu.`);
                await client.update({ conversation_stage: 'MENU_SHOWN' });
                return MENU_TEXT;
            }

            // --- OPTION SELECTION ---
            if (currentState === 'MENU_SHOWN' || ['1', '2', '3', '9'].includes(input)) {

                if (input === '1') {
                    await client.update({ conversation_stage: 'WAITING_CLIMATE_DATA' });
                    return "🌾 *Análise de Risco Climático*\n\nPara prosseguir, por favor me envie:\n1. O nome da sua cidade/município.\n2. Se houve seca, geada ou excesso de chuva.\n\n_Você também pode enviar uma foto do laudo ou áudio explicando._";
                }

                if (input === '2') {
                    await client.update({ conversation_stage: 'WAITING_FINANCE_DATA' });
                    return "💰 *Análise Financeira*\n\nVamos simular sua dívida. Por favor, me diga:\nQual o valor do financiamento e o prazo em meses?\n\n_Ex: 200.000 em 60 meses_";
                }

                if (input === '3') {
                    await client.update({ conversation_stage: 'JURIDICAL_CHAT' });
                    return "⚖️ *Assistente Jurídico*\n\nEstou aqui para ajudar com dúvidas legais do MCR. Qual sua dúvida específica sobre legislação rural?";
                }

                if (input === '9') {
                    await client.update({ conversation_stage: 'FREE_CHAT' });
                    return "💬 *Chat Livre*\n\nPode perguntar o que quiser sobre crédito rural.";
                }

                // If user typed random text while in Menu, assuming they want RAG or confused
                // We fallback to checking if it's broad text or show menu again
                if (currentState === 'MENU_SHOWN') {
                    // Invalid option in menu state -> Show Menu again nicely
                    await client.update({ conversation_stage: 'START' }); // Reset
                    return "Opção não reconhecida. Por favor, escolha uma opção do menu ou digite 'Menu' para ver as opções.";
                }
            }

            // --- RAG FLOW (For Juridical/Free Chat or Fallback) ---
            // Proceed to RAG...

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
