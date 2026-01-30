const ClimateService = require('./Climate.service');

exports.getRealtimeData = async (req, res) => {
    try {
        const { lat, lon, days } = req.query;
        if (!lat || !lon) {
            return res.status(400).json({ error: 'Latitude (lat) and Longitude (lon) are required.' });
        }

        const latitude = parseFloat(lat);
        const longitude = parseFloat(lon);
        const numDays = days ? parseInt(days) : 7;

        const data = await ClimateService.getInmetData(latitude, longitude, numDays);
        res.json(data);
    } catch (error) {
        console.error('Error in getRealtimeData:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.getHistoricalData = async (req, res) => {
    try {
        const { lat, lon, start, end } = req.query;
        if (!lat || !lon || !start || !end) {
            return res.status(400).json({ error: 'Latitude (lat), Longitude (lon), Start Date (start), and End Date (end) are required.' });
        }

        const latitude = parseFloat(lat);
        const longitude = parseFloat(lon);

        const data = await ClimateService.getNasaPowerData(latitude, longitude, start, end);
        res.json(data);
    } catch (error) {
        console.error('Error in getHistoricalData:', error);
        res.status(500).json({ error: error.message });
    }
};
