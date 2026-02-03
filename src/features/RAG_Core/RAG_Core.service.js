const OpenAI = require('openai');
const { sequelize } = require('../../config/db');
const LegalChunk = require('../../models/LegalChunk');
const { QueryTypes } = require('sequelize');

const { httpsAgent } = require('../../config/axios.config');
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    httpAgent: httpsAgent
});

const SemanticCache = require('../../models/SemanticCache');

class RAGService {
    constructor() {
        this.SIMILARITY_THRESHOLD = 0.98; // Increased for higher precision
    }

    /**
     * Busca uma resposta similar já gerada anteriormente no cache persistente.
     * Retorna a resposta se a similaridade por vetor for maior que o threshold.
     */
    async getSemanticHit(queryEmbedding) {
        try {
            const vectorString = JSON.stringify(queryEmbedding);

            // Busca o registro mais similar no Banco de Dados
            const results = await sequelize.query(
                `SELECT query_text, response_text, 1 - (embedding <=> :vector) as similarity
                 FROM "SemanticCaches"
                 WHERE (1 - (embedding <=> :vector)) > :threshold
                 ORDER BY embedding <=> :vector
                 LIMIT 1`,
                {
                    replacements: { vector: vectorString, threshold: this.SIMILARITY_THRESHOLD },
                    type: QueryTypes.SELECT
                }
            );

            if (results && results.length > 0) {
                const hit = results[0];
                console.log(`[PERSISTENT_CACHE] Semantic hit found! Similarity: ${hit.similarity.toFixed(4)}`);

                // Opcional: Incrementar contador de hits de forma assíncrona
                SemanticCache.increment('hits', { where: { query_text: hit.query_text } }).catch(() => { });

                return hit.response_text;
            }
            return null;
        } catch (error) {
            console.error("[PERSISTENT_CACHE] Error during semantic lookup:", error.message);
            return null;
        }
    }

    /**
     * Salva uma nova resposta no cache persistente para aprendizado futuro.
     */
    async learnResponse(queryText, embedding, responseText) {
        try {
            // SAFEGUARDS: Do NOT cache if:
            // 1. Query is very short (likely numeric/menu)
            // 2. Query is numeric
            // 3. Response is too short
            if (queryText.length < 5 || /^\d+$/.test(queryText)) return;
            if (responseText.length < 10) return;

            // Evitar duplicatas exatas ou muito próximas
            const existing = await this.getSemanticHit(embedding);
            if (existing) return;

            await SemanticCache.create({
                query_text: queryText,
                embedding: embedding,
                response_text: responseText
            });
            console.log(`[PERSISTENT_CACHE] Learned insight for: "${queryText.substring(0, 30)}..."`);
        } catch (error) {
            console.warn(`[PERSISTENT_CACHE] Failed to learn response: ${error.message}`);
        }
    }
    async generateEmbedding(text) {
        try {
            const response = await openai.embeddings.create({
                model: "text-embedding-3-small",
                input: text,
            });
            return response.data[0].embedding;
        } catch (error) {
            console.error("Error generating embedding:", error);
            throw error;
        }
    }

    async searchChunks(queryEmbedding, topK = 5) {
        // Using raw query for optimized vector search with distance
        // Although Sequelize supports pure models, raw queries are often clearer for vector math operators
        try {
            // vector_cosine_ops is used in the index, so <=> (cosine distance) is appropriate.
            // Ordering by embedding <=> vector LIMIT k gives nearest neighbors.
            const vectorString = JSON.stringify(queryEmbedding);

            const results = await sequelize.query(
                `SELECT id, text, doc_id, chunk_id, source, 1 - (embedding <=> :vector) as similarity
                 FROM "LegalChunks"
                 ORDER BY embedding <=> :vector
                 LIMIT :topK`,
                {
                    replacements: { vector: vectorString, topK: topK },
                    type: QueryTypes.SELECT
                }
            );
            return results;
        } catch (error) {
            console.error("Error searching chunks:", error);
            throw error;
        }
    }

    async validateCitations(citationIds) {
        // citationIds: Array of { doc_id, chunk_id }
        // Returns true if all exist, or returns the missing ones.
        if (!citationIds || citationIds.length === 0) return true;

        const results = [];
        for (const citation of citationIds) {
            const exists = await LegalChunk.findOne({
                where: {
                    doc_id: citation.doc_id,
                    chunk_id: citation.chunk_id
                }
            });
            if (!exists) {
                results.push(citation);
            }
        }

        if (results.length > 0) {
            return { valid: false, missing: results };
        }
        return { valid: true };
    }
}

module.exports = new RAGService();
