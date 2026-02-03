const axios = require('axios');
const { format, subDays } = require('date-fns');
const config = require('../../../config/apis.config');

// In-memory cache for INMET stations
let stationsCache = null;
let lastCacheUpdate = 0;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Calcula distância entre dois pontos (Haversine)
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Raio da Terra em km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function toRad(degrees) {
    return degrees * (Math.PI / 180);
}

/**
 * Busca estação INMET mais próxima
 */
async function findNearestInmetStation(latitude, longitude) {
    try {
        // Use cache if available and fresh
        if (!stationsCache || (Date.now() - lastCacheUpdate > CACHE_DURATION)) {
            console.log("[CLIMATE] Refreshing INMET stations cache...");
            const response = await axios.get(
                `${config.inmet.baseURL}/estacoes/T`,
                { timeout: config.inmet.timeout }
            );
            stationsCache = response.data;
            lastCacheUpdate = Date.now();
        }

        const stations = stationsCache;
        let nearestStation = null;
        let minDistance = Infinity;

        for (const station of stations) {
            if (!station.VL_LATITUDE || !station.VL_LONGITUDE) continue;

            const distance = calculateDistance(
                latitude,
                longitude,
                station.VL_LATITUDE,
                station.VL_LONGITUDE
            );

            if (distance < minDistance) {
                minDistance = distance;
                nearestStation = {
                    code: station.CD_ESTACAO,
                    name: station.DC_NOME,
                    state: station.SG_ESTADO,
                    latitude: station.VL_LATITUDE,
                    longitude: station.VL_LONGITUDE,
                    status: station.CD_SITUACAO,
                    distance: parseFloat(distance.toFixed(2))
                };
            }
        }

        return nearestStation;
    } catch (error) {
        throw new Error(`Erro ao buscar estações INMET: ${error.message}`);
    }
}

/**
 * Processa dados brutos do INMET
 */
function processInmetData(rawData) {
    const dailyData = {};

    // Agrupar por dia
    for (const record of rawData) {
        if (!record.DT_MEDICAO) continue;

        const date = record.DT_MEDICAO.split(' ')[0];

        if (!dailyData[date]) {
            dailyData[date] = {
                precipitation: [],
                tempMin: [],
                tempMax: [],
                tempInst: []
            };
        }

        const isValid = (value) => {
            return value !== null &&
                value !== 'Null' &&
                value !== '' &&
                value !== 9999 &&
                !isNaN(parseFloat(value));
        };

        if (isValid(record.CHUVA)) {
            dailyData[date].precipitation.push(parseFloat(record.CHUVA));
        }
        if (isValid(record.TEM_MIN)) {
            dailyData[date].tempMin.push(parseFloat(record.TEM_MIN));
        }
        if (isValid(record.TEM_MAX)) {
            dailyData[date].tempMax.push(parseFloat(record.TEM_MAX));
        }
        if (isValid(record.TEM_INS)) {
            dailyData[date].tempInst.push(parseFloat(record.TEM_INS));
        }
    }

    // Calcular valores diários
    return Object.entries(dailyData).map(([date, values]) => ({
        date,
        precipitation: values.precipitation.reduce((a, b) => a + b, 0),
        tempMin: values.tempMin.length > 0 ? Math.min(...values.tempMin) : null,
        tempMax: values.tempMax.length > 0 ? Math.max(...values.tempMax) : null,
        tempAvg: values.tempInst.length > 0
            ? values.tempInst.reduce((a, b) => a + b) / values.tempInst.length
            : null
    })).sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Obtém dados climáticos (Tenta INMET, se falhar ou vazio, tenta NASA)
 */
async function getInmetData(latitude, longitude, days = 7, customStartDate = null, customEndDate = null) {
    // Validações
    if (days < 1 || days > 90) {
        throw new Error('Parâmetro "days" deve estar entre 1 e 90');
    }

    // Calcular período
    let startDate;
    let endDate;
    let startStr;
    let endStr;

    if (customStartDate && customEndDate) {
        // Use custom dates (format expected: YYYY-MM-DD or Date objects)
        startDate = new Date(customStartDate);
        endDate = new Date(customEndDate);
        startStr = customStartDate.includes('-') ? customStartDate : format(startDate, 'yyyy-MM-dd');
        endStr = customEndDate.includes('-') ? customEndDate : format(endDate, 'yyyy-MM-dd');
        console.log(`[CLIMATE] Using custom dates: ${startStr} to ${endStr}`);
    } else {
        // Fallback to "last X days" logic
        endDate = new Date();
        startDate = subDays(endDate, days);
        startStr = format(startDate, 'yyyy-MM-dd');
        endStr = format(endDate, 'yyyy-MM-dd');
    }

    // 1. TENTATIVA INMET
    try {
        const station = await findNearestInmetStation(latitude, longitude);

        if (station) {
            const url = `${config.inmet.baseURL}/estacao/${startStr}/${endStr}/${station.code}`;
            const response = await axios.get(url, { timeout: config.inmet.timeout });

            const processedData = processInmetData(response.data);

            if (processedData && processedData.length > 0) {
                return {
                    station,
                    data: processedData,
                    metadata: {
                        source: 'INMET',
                        period: { start: startStr, end: endStr },
                        dataPoints: response.data.length
                    }
                };
            }
            console.warn(`INMET station ${station.code} returned no data. Falling back to NASA POWER.`);
        }
    } catch (error) {
        console.warn(`INMET API failed: ${error.message}. Falling back to NASA POWER.`);
    }

    // 2. TENTATIVA NASA POWER (Fallback)
    try {
        const startNasa = format(startDate, 'yyyyMMdd');
        const endNasa = format(endDate, 'yyyyMMdd');

        console.log(`Fetching data from NASA POWER for ${latitude}, ${longitude}`);
        const nasaData = await getNasaPowerData(latitude, longitude, startNasa, endNasa);

        return {
            station: { name: 'NASA Satellite', code: 'NASA_POWER', distance: 0 },
            data: nasaData.data,
            metadata: {
                source: 'NASA POWER',
                warning: 'INMET indisponível ou sem dados. Usando dados de satélite.',
                period: { start: startStr, end: endStr }
            }
        };

    } catch (nasaError) {
        console.error("Critical: Both INMET and NASA APIs failed.", nasaError);
        throw new Error("Não foi possível obter dados climáticos de nenhuma fonte.");
    }
}

/**
 * Processa dados da NASA POWER
 */
function processNasaPowerData(responseData) {
    const { properties, header } = responseData;
    const { parameter } = properties;
    const fillValue = header.fill_value;

    // Obter datas
    const dates = new Set();
    for (const paramValues of Object.values(parameter)) {
        for (const date of Object.keys(paramValues)) {
            dates.add(date);
        }
    }

    // Converter para formato tabular
    return Array.from(dates).sort().map(dateKey => {
        const year = dateKey.substring(0, 4);
        const month = dateKey.substring(4, 6);
        const day = dateKey.substring(6, 8);

        const dayData = {
            date: `${year}-${month}-${day}`
        };

        // Extrair valores de cada parâmetro
        for (const [paramName, paramValues] of Object.entries(parameter)) {
            const value = paramValues[dateKey];

            if (value !== fillValue && value !== null) {
                switch (paramName) {
                    case 'PRECTOTCORR':
                        dayData.precipitation = parseFloat(value.toFixed(1));
                        break;
                    case 'T2M_MIN':
                        dayData.tempMin = parseFloat(value.toFixed(1));
                        break;
                    case 'T2M_MAX':
                        dayData.tempMax = parseFloat(value.toFixed(1));
                        break;
                    case 'T2M':
                        dayData.tempAvg = parseFloat(value.toFixed(1));
                        break;
                    case 'ALLSKY_SFC_SW_DWN':
                        dayData.solarRadiation = parseFloat(value.toFixed(2));
                        break;
                }
            }
        }

        return dayData;
    });
}

/**
 * Obtém dados históricos da NASA POWER
 */
async function getNasaPowerData(latitude, longitude, startDate, endDate) {
    const params = {
        parameters: 'PRECTOTCORR,T2M_MAX,T2M_MIN,T2M,ALLSKY_SFC_SW_DWN',
        community: 'AG',
        longitude: longitude,
        latitude: latitude,
        start: startDate, // YYYYMMDD
        end: endDate,     // YYYYMMDD
        format: 'JSON'
    };

    const response = await axios.get(config.nasaPower.baseURL, {
        params,
        timeout: config.nasaPower.timeout
    });

    const data = response.data;
    const processedData = processNasaPowerData(data);

    return {
        location: {
            latitude: data.geometry.coordinates[1],
            longitude: data.geometry.coordinates[0],
            elevation: data.geometry.coordinates[2]
        },
        data: processedData,
        metadata: {
            source: 'NASA POWER',
            sources: data.header.sources,
            fillValue: data.header.fill_value
        }
    };
}

/**
 * Obtém coordenadas de uma cidade usando Nominatim (OpenStreetMap)
 */
async function getCoordinates(cityState) {
    try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cityState)}&limit=1`;
        const response = await axios.get(url, {
            headers: { 'User-Agent': 'MOHSIS-Bot/1.0' }
        });

        if (response.data && response.data.length > 0) {
            return {
                latitude: parseFloat(response.data[0].lat),
                longitude: parseFloat(response.data[0].lon),
                displayName: response.data[0].display_name
            };
        }
        return null;
    } catch (error) {
        console.error("Geocoding error:", error.message);
        return null; // Fail gracefully
    }
}

module.exports = {
    getInmetData,
    getNasaPowerData,
    findNearestInmetStation,
    getCoordinates
};
