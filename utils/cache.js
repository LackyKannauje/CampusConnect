const redis = require('redis');

class Cache {
    constructor() {
        this.client = redis.createClient({
            url: process.env.REDIS_URL || 'redis://localhost:6379'
        });
        
        this.client.on('error', (err) => {
            console.error('Redis Client Error:', err);
        });
        
        this.initialize();
    }

    async initialize() {
        await this.client.connect();
    }

    async get(key) {
        try {
            const data = await this.client.get(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('Cache get error:', error);
            return null;
        }
    }

    async set(key, value, ttl = 3600) {
        try {
            await this.client.set(key, JSON.stringify(value), {
                EX: ttl
            });
            return true;
        } catch (error) {
            console.error('Cache set error:', error);
            return false;
        }
    }

    async del(key) {
        try {
            await this.client.del(key);
            return true;
        } catch (error) {
            console.error('Cache delete error:', error);
            return false;
        }
    }

    async exists(key) {
        try {
            const result = await this.client.exists(key);
            return result === 1;
        } catch (error) {
            console.error('Cache exists error:', error);
            return false;
        }
    }

    async incr(key) {
        try {
            return await this.client.incr(key);
        } catch (error) {
            console.error('Cache incr error:', error);
            return 0;
        }
    }

    async clearPattern(pattern) {
        try {
            const keys = await this.client.keys(pattern);
            if (keys.length > 0) {
                await this.client.del(keys);
            }
            return keys.length;
        } catch (error) {
            console.error('Cache clear pattern error:', error);
            return 0;
        }
    }

    async flush() {
        try {
            await this.client.flushDb();
            return true;
        } catch (error) {
            console.error('Cache flush error:', error);
            return false;
        }
    }
}

module.exports = Cache;