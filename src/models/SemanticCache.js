const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

/**
 * Persistência de respostas da IA usando Busca Semântica por Vetores.
 * Permite que perguntas similares recebam respostas instantâneas sem chamar a OpenAI Completion.
 */
const SemanticCache = sequelize.define('SemanticCache', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    query_text: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    response_text: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    embedding: {
        type: DataTypes.VECTOR(1536), // PostgreSQL + pgvector
        allowNull: false,
    },
    hits: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
    }
}, {
    tableName: 'SemanticCaches',
    timestamps: true,
});

// Hook para criar o índice HNSW
SemanticCache.afterSync(async () => {
    try {
        // Indexação HNSW para busca vetorial ultra-rápida
        await sequelize.query(`
            CREATE INDEX IF NOT EXISTS "semantic_cache_embedding_idx" 
            ON "SemanticCaches" 
            USING hnsw (embedding vector_cosine_ops);
        `);
        console.log('HNSW Index created on SemanticCaches.embedding');
    } catch (err) {
        console.error('Error creating SemanticCache HNSW index:', err);
    }
});

module.exports = SemanticCache;
