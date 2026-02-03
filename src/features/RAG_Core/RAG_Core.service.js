const OpenAI = require('openai');
const { sequelize } = require('../../config/db');
const LegalChunk = require('../../models/LegalChunk');
const { QueryTypes } = require('sequelize');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

class RAGService {
    constructor() {
        this.cache = new Map(); // Simple in-memory cache: { input_text: { response, timestamp } }
        this.CACHE_TTL = 100 * 60 * 1000; // 60 minutes
    }

    /**
     * Get response from cache if it exists and is fresh
     */
    getFromCache(text) {
        const key = text.trim().toLowerCase();
        const cached = this.cache.get(key);
        if (cached && (Date.now() - cached.timestamp < this.CACHE_TTL)) {
            console.log(`[RAG_CACHE] Cache hit for: "${key}"`);
            return cached.response;
        }
        return null;
    }

    /**
     * Save response to cache
     */
    saveToCache(text, response) {
        const key = text.trim().toLowerCase();
        this.cache.set(key, {
            response,
            timestamp: Date.now()
        });
        console.log(`[RAG_CACHE] Cached response for: "${key}"`);

        // Basic cleanup: if cache too big, clear half
        if (this.cache.size > 200) {
            console.warn("[RAG_CACHE] Cache size limit reached. Clearing...");
            this.cache.clear();
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
