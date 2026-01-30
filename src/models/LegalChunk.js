const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const LegalChunk = sequelize.define('LegalChunk', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    text: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    embedding: {
        type: DataTypes.VECTOR(1536), // OpenAI embedding dimension
        allowNull: false,
    },
    doc_id: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    chunk_id: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    source: {
        type: DataTypes.STRING,
        allowNull: true,
    }
}, {
    timestamps: true,
    tableName: 'LegalChunks',
    indexes: [
        {
            fields: ['doc_id', 'chunk_id']
        }
    ]
});

// Hook to create HNSW index after sync
LegalChunk.afterSync(async () => {
    try {
        await sequelize.query(`
            CREATE INDEX IF NOT EXISTS legal_chunk_embedding_hnsw_idx 
            ON "LegalChunks" 
            USING hnsw (embedding vector_cosine_ops);
        `);
        console.log('HNSW Index created on LegalChunks.embedding');
    } catch (err) {
        console.error('Error creating HNSW index:', err);
    }
});

module.exports = LegalChunk;
