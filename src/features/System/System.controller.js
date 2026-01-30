const SystemService = require('./System.service');

exports.runDiagnostics = async (req, res) => {
    try {
        const result = await SystemService.runDiagnostics();

        res.json({
            message: 'Diagnostics execution complete.',
            savedToFile: result.filePath,
            reportPreview: result.report.split('\n')
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
