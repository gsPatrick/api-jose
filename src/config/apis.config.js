module.exports = {
    inmet: {
        baseURL: 'https://apitempo.inmet.gov.br',
        timeout: 30000, // 30 seconds
        retry: 3,
        retryDelay: 1000
    },
    nasaPower: {
        baseURL: 'https://power.larc.nasa.gov/api/temporal/daily/point',
        timeout: 60000, // 60 seconds
        maxParams: 20,
        retry: 3,
        retryDelay: 2000
    }
};
