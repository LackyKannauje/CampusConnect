const redis = require('redis');

let redisClient = null;

const connectRedis = async () => {
    try {
        redisClient = redis.createClient({
            url: process.env.REDIS_URL || 'redis://localhost:6379',
            socket: {
                reconnectStrategy: (retries) => {
                    if (retries > 10) {
                        console.error('❌ Redis reconnect attempts exhausted');
                        return new Error('Redis reconnect failed');
                    }
                    return Math.min(retries * 100, 3000);
                }
            }
        });

        redisClient.on('error', (err) => {
            console.error('❌ Redis Client Error:', err);
        });

        redisClient.on('connect', () => {
            console.log('✅ Redis Connected');
        });

        redisClient.on('ready', () => {
            console.log('✅ Redis Ready');
        });

        redisClient.on('end', () => {
            console.log('⚠️ Redis Connection Ended');
        });

        await redisClient.connect();
        
        return redisClient;
    } catch (error) {
        console.error('❌ Redis connection failed:', error.message);
        return null;
    }
};

const getRedisClient = () => {
    if (!redisClient) {
        throw new Error('Redis client not initialized');
    }
    return redisClient;
};

module.exports = { connectRedis, getRedisClient };