const redis = require('redis');

// Create a client and connect (ensure Redis is running)
// For this environment, we will make it optional/fail-safe if Redis isn't there
const client = redis.createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
});

client.on('error', (err) => console.log('Redis Client Error', err));

// Only connect if explicit env var to avoid crashing dev env without redis
if (process.env.USE_REDIS === 'true') {
    client.connect().catch(console.error);
}

module.exports = client;
