const axios = require('axios');
const http = require('http');
const https = require('https');

// Persistent agents to reuse TCP/TLS connections
const httpAgent = new http.Agent({ keepAlive: true });
const httpsAgent = new https.Agent({ keepAlive: true });

const axiosInstance = axios.create({
    httpAgent,
    httpsAgent,
    timeout: 30000,
});

// Export both the instance and the agents for services like OpenAI SDK
module.exports = {
    axios: axiosInstance,
    httpAgent,
    httpsAgent
};
