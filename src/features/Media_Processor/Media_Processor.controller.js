const MediaService = require('./Media_Processor.service');

exports.processAudio = async (req, res) => {
    try {
        const { url } = req.body;
        if (!url) return res.status(400).json({ error: 'URL required' });
        const text = await MediaService.transcribeAudio(url);
        res.json({ text });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.processImage = async (req, res) => {
    try {
        const { url } = req.body;
        if (!url) return res.status(400).json({ error: 'URL required' });
        const data = await MediaService.extractDataFromImage(url);
        res.json({ data });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
