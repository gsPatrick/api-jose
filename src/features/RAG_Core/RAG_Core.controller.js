const RAGService = require('./RAG_Core.service');

exports.testSearch = async (req, res) => {
    try {
        const { query } = req.body;
        if (!query) return res.status(400).json({ error: 'Query required' });

        const embedding = await RAGService.generateEmbedding(query);
        const results = await RAGService.searchChunks(embedding);

        res.json({ results });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
