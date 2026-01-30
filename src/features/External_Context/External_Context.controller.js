const ExternalService = require('./External_Context.service');

exports.getRates = async (req, res) => {
    const rates = await ExternalService.getBacenRates();
    res.json(rates);
};

exports.getClimate = async (req, res) => {
    const { location } = req.query;
    const data = await ExternalService.getHistoricalClimate(location || 'SP');
    res.json(data);
};
