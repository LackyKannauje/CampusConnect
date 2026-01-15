// const rateLimit = require('express-rate-limit');
// const RedisStore = require('rate-limit-redis').default;
// const redis = require('redis');

// // Create Redis client for rate limiting
// const redisClient = redis.createClient({
//     url: process.env.REDIS_URL || 'redis://localhost:6379'
// });

// redisClient.on('error', (err) => {
//     console.error('Redis rate limit error:', err);
// });

// // Connect to Redis
// (async () => {
//     await redisClient.connect();
// })();

// const rateLimitMiddleware = {
//     // General API rate limiter
//     apiLimiter: rateLimit({
//         store: new RedisStore({
//             sendCommand: (...args) => redisClient.sendCommand(args),
//         }),
//         windowMs: 15 * 60 * 1000, // 15 minutes
//         max: 100, // Limit each IP to 100 requests per windowMs
//         standardHeaders: true,
//         legacyHeaders: false,
//         message: 'Too many requests, please try again later.',
//         skip: (req) => {
//             // Skip rate limiting for certain paths or IPs
//             return req.path.includes('/health') || 
//                    req.ip === '127.0.0.1' ||
//                    req.ip === '::1';
//         }
//     }),

//     // Strict rate limiter for auth endpoints
//     authLimiter: rateLimit({
//         store: new RedisStore({
//             sendCommand: (...args) => redisClient.sendCommand(args),
//         }),
//         windowMs: 60 * 60 * 1000, // 1 hour
//         max: 10, // 10 attempts per hour
//         message: 'Too many login attempts, please try again later.',
//         skipSuccessfulRequests: true // Don't count successful requests
//     }),

//     // AI endpoint rate limiter (cost-sensitive)
//     aiLimiter: (options = {}) => {
//         return rateLimit({
//             store: new RedisStore({
//                 sendCommand: (...args) => redisClient.sendCommand(args),
//             }),
//             windowMs: options.windowMs || 60000, // 1 minute default
//             max: options.max || 30, // 30 requests per minute default
//             keyGenerator: (req) => {
//                 // Rate limit by user ID if authenticated, otherwise by IP
//                 return req.user ? `user:${req.user._id}` : req.ip;
//             },
//             message: 'AI rate limit exceeded. Please wait before making more requests.',
//             standardHeaders: true,
//             legacyHeaders: false
            
//         });
//     },

//     // Upload rate limiter
//     uploadLimiter: rateLimit({
//         store: new RedisStore({
//             sendCommand: (...args) => redisClient.sendCommand(args),
//         }),
//         windowMs: 60 * 60 * 1000, // 1 hour
//         max: 50, // 50 uploads per hour
//         message: 'Too many uploads, please try again later.',
//         keyGenerator: (req) => {
//             return req.user ? `upload:${req.user._id}` : req.ip;
//         }
//     }),

//     // Custom rate limiter
//     custom: (options) => {
//         return rateLimit({
//             store: new RedisStore({
//                 sendCommand: (...args) => redisClient.sendCommand(args),
//             }),
//             windowMs: options.windowMs,
//             max: options.max,
//             keyGenerator: options.keyGenerator || ((req) => req.ip),
//             message: options.message || 'Rate limit exceeded',
//             standardHeaders: true,
//             legacyHeaders: false,
//             skip: options.skip
            
//         });
//     },

//     // Reset rate limit for a key
//     resetKey: async (key) => {
//         try {
//             await redisClient.del(key);
//             return true;
//         } catch (error) {
//             console.error('Error resetting rate limit:', error);
//             return false;
//         }
//     }
// };

// module.exports = rateLimitMiddleware;
const rateLimit = require('express-rate-limit');
// FIX 1: Add .default because newer versions of rate-limit-redis export the class there
const RedisStore = require('rate-limit-redis').default; 
const redis = require('redis');

// Create Redis client for rate limiting
const redisClient = redis.createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('error', (err) => {
    console.error('Redis rate limit error:', err);
});

// Connect to Redis
(async () => {
    try {
        await redisClient.connect();
        console.log('Redis connected for rate limiting');
    } catch (err) {
        console.error('Redis connection failed:', err);
    }
})();

const rateLimitMiddleware = {
    // General API rate limiter
    apiLimiter: rateLimit({
        store: new RedisStore({
            sendCommand: (...args) => redisClient.sendCommand(args),
        }),
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100, 
        standardHeaders: true,
        legacyHeaders: false,
        message: 'Too many requests, please try again later.',
        skip: (req) => {
            return req.path.includes('/health') || 
                   req.ip === '127.0.0.1' ||
                   req.ip === '::1';
        }
    }),

    // Strict rate limiter for auth endpoints
    authLimiter: rateLimit({
        store: new RedisStore({
            sendCommand: (...args) => redisClient.sendCommand(args),
        }),
        windowMs: 60 * 60 * 1000, // 1 hour
        max: 10,
        message: 'Too many login attempts, please try again later.',
        skipSuccessfulRequests: true
    }),

    // AI endpoint rate limiter (cost-sensitive)
    aiLimiter: (options = {}) => {
        return rateLimit({
            store: new RedisStore({
                sendCommand: (...args) => redisClient.sendCommand(args),
            }),
            windowMs: options.windowMs || 60000,
            max: options.max || 30,
            keyGenerator: (req) => {
                // Returns user ID if logged in, otherwise IP
                return req.user ? `user:${req.user._id}` : req.ip;
            },
            message: 'AI rate limit exceeded. Please wait before making more requests.',
            standardHeaders: true,
            legacyHeaders: false,
            // FIX 2: Correctly disable the IPv6 check based on docs
            validate: { keyGeneratorIpFallback: false } 
        });
    },

    // Upload rate limiter
    uploadLimiter: rateLimit({
        store: new RedisStore({
            sendCommand: (...args) => redisClient.sendCommand(args),
        }),
        windowMs: 60 * 60 * 1000, // 1 hour
        max: 50,
        message: 'Too many uploads, please try again later.',
        keyGenerator: (req) => {
            return req.user ? `upload:${req.user._id}` : req.ip;
        },
        // FIX 2: Correctly disable the IPv6 check based on docs
        validate: { keyGeneratorIpFallback: false }
    }),

    // Custom rate limiter
    custom: (options) => {
        return rateLimit({
            store: new RedisStore({
                sendCommand: (...args) => redisClient.sendCommand(args),
            }),
            windowMs: options.windowMs,
            max: options.max,
            keyGenerator: options.keyGenerator || ((req) => req.ip),
            message: options.message || 'Rate limit exceeded',
            standardHeaders: true,
            legacyHeaders: false,
            skip: options.skip,
            // FIX 2: Correctly disable the IPv6 check based on docs
            validate: { keyGeneratorIpFallback: false }
        });
    },

    // Reset rate limit for a key
    resetKey: async (key) => {
        try {
            await redisClient.del(key);
            return true;
        } catch (error) {
            console.error('Error resetting rate limit:', error);
            return false;
        }
    }
};

module.exports = rateLimitMiddleware;