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
    try {
        const response = await openai.embeddings.create({
            model: "text-embedding-3-small",
            input: text,
        });
        return response.data[0].embedding;
    } catch (error) {
        console.warn(`⚠️  OpenAI Error (${error.code || 'Unknown'}). Using mock embeddings (zeros) to proceed with seeding.`);
        return new Array(1536).fill(0);
    }
}

const mockChunks = [
    {
        source: "MCR - Manual de Crédito Rural",
        doc_id: "MCR_CAP_16",
        chunk_id: "MCR_16_1_1",
        text: "MCR 16-1-1: O Programa de Garantia da Atividade Agropecuária (Proagro) garante a exoneração de obrigações financeiras relativas a operações de crédito rural de custeio, cuja liquidação seja dificultada pela ocorrência de fenômenos naturais, pragas e doenças que atinjam rebanhos e plantações."
    },
    {
        source: "MCR - Manual de Crédito Rural",
        doc_id: "MCR_CAP_16",
        chunk_id: "MCR_16_2_4",
        text: "MCR 16-2-4: O beneficiário deve comunicar a ocorrência de perdas ao agente financeiro tão logo as constate, e antes da colheita, salvo se a perda ocorrer durante a colheita, para que o agente providencie a comprovação das perdas."
    },
    {
        source: "MCR - Manual de Crédito Rural",
        doc_id: "MCR_CAP_16",
        chunk_id: "MCR_16_3_9",
        text: "MCR 16-3-9: A comprovação de perdas deve ser realizada mediante vistoria da lavoura por técnico credenciado, devendo o laudo conter a estimativa da produção obtida e a causa dos prejuízos (seca, excesso de chuvas, geada, granizo, etc.)."
    },
    {
        source: "Resolução CMN 4.966/2021",
        doc_id: "RES_4966",
        chunk_id: "RES_4966_ART_1",
        text: "Resolução CMN 4.966, Art. 1º: As instituições financeiras devem classificar as operações de crédito conforme o risco de crédito, considerando a situação econômico-financeira do devedor e as garantias oferecidas."
    },
    {
        source: "MCR - Manual de Crédito Rural",
        doc_id: "MCR_CAP_2",
        chunk_id: "MCR_2_6_9",
        text: "MCR 2-6-9: É permitida a prorrogação de dívidas de crédito rural quando a capacidade de pagamento do mutuário for prejudicada por frustração de safras devido a fatores adversos, ou dificuldades de comercialização."
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
