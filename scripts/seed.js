const { sequelize } = require('../src/config/db');
const LegalChunk = require('../src/models/LegalChunk');
const Client = require('../src/models/Client');
const OpenAI = require('openai');
require('dotenv').config(); // Load .env file

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function generateEmbedding(text) {
    if (!process.env.OPENAI_API_KEY) {
        console.warn("⚠️  OPENAI_API_KEY not found. Using mock embeddings (zeros).");
        return new Array(1536).fill(0);
    }
    const response = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: text,
    });
    return response.data[0].embedding;
}

const mockChunks = [
    {
        doc_id: "MCR_TESTE_001",
        chunk_id: "sec_2_3",
        text: "O crédito rural é o suprimento de recursos financeiros por entidades públicas e estabelecimentos particulares de crédito a produtores rurais ou a suas cooperativas para aplicação exclusiva nas atividades que se enquadrem nos objetivos indicados na legislação em vigor."
    },
    {
        doc_id: "MCR_TESTE_002",
        chunk_id: "sec_4_1",
        text: "É vedada a concessão de crédito rural a pessoas físicas ou jurídicas estrangeiras residentes ou domiciliadas no exterior, exceto quando se tratar de crédito de comercialização."
    },
    {
        doc_id: "LEI_TESTE_003",
        chunk_id: "art_55",
        text: "O seguro rural é um dos mais importantes instrumentos de política agrícola, pois permite ao produtor proteger-se contra perdas decorrentes de fenômenos climáticos adversos."
    }
];

async function seed() {
    try {
        console.log('🌱 Starting Seed Process...');

        await sequelize.authenticate();
        console.log('✅ Connected to Database');

        // Create pgvector extension
        await sequelize.query('CREATE EXTENSION IF NOT EXISTS vector;');
        console.log('✅ pgvector extension ensured');

        // Sync models (force: true drops tables if they exist)
        // WARNING: Use force: false in production to avoid data loss
        await sequelize.sync({ force: true });
        console.log('✅ Database Models Synced');

        // Insert Mock Legal Chunks
        console.log('📝 Generating Embeddings and Inserting Mock Chunks...');
        for (const chunk of mockChunks) {
            const embedding = await generateEmbedding(chunk.text);
            await LegalChunk.create({
                ...chunk,
                embedding: embedding,
                source: "Manual de Crédito Rural (Teste)"
            });
            console.log(`   - Inserted: ${chunk.doc_id} / ${chunk.chunk_id}`);
        }

        console.log('✅ Seeding Completed Successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Seeding Failed:', error);
        process.exit(1);
    }
}

seed();
