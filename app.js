// const express = require('express');
// const cors = require('cors');
// const helmet = require('helmet');
// const compression = require('compression');
// const morgan = require('morgan');
// const cookieParser = require('cookie-parser');

// // Import configs
// const connectDB = require('./config/database');
// const { connectRedis } = require('./config/redis');
// const { configureCloudinary } = require('./config/cloudinary');

// // Import middleware
// const errorMiddleware = require('./middleware/error.middleware');
// const rateLimitMiddleware = require('./middleware/rateLimit.middleware');

// // Import routes
// const routes = require('./routes');

// const app = express();

// // Security middleware
// app.use(helmet({
//     contentSecurityPolicy: {
//         directives: {
//             defaultSrc: ["'self'"],
//             styleSrc: ["'self'", "'unsafe-inline'"],
//             scriptSrc: ["'self'"],
//             imgSrc: ["'self'", "data:", "https://res.cloudinary.com"],
//             fontSrc: ["'self'"],
//             connectSrc: ["'self'"]
//         }
//     },
//     crossOriginResourcePolicy: { policy: "cross-origin" }
// }));

// // CORS configuration
// app.use(cors({
//     origin: process.env.CORS_ORIGIN || ['http://localhost:3000'],
//     credentials: true,
//     methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
//     allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
// }));

// // Compression
// app.use(compression());

// // Request parsing
// app.use(express.json({ limit: '10mb' }));
// app.use(express.urlencoded({ extended: true, limit: '10mb' }));
// app.use(cookieParser());

// // Logging
// if (process.env.NODE_ENV === 'development') {
//     app.use(morgan('dev'));
// } else {
//     app.use(morgan('combined'));
// }

// // Rate limiting
// app.use('/api/', rateLimitMiddleware.apiLimiter);

// // Health check endpoint
// app.get('/health', (req, res) => {
//     res.status(200).json({
//         status: 'healthy',
//         timestamp: new Date().toISOString(),
//         uptime: process.uptime(),
//         memory: process.memoryUsage()
//     });
// });

// // API routes
// app.use(routes);

// // 404 handler
// // app.use('*', errorMiddleware.notFound);

// // Global error handler
// app.use(errorMiddleware.errorHandler);

// // Initialize services
// const initializeApp = async () => {
//     try {
//         // Connect to database
//         await connectDB();
        
//         // Connect to Redis
//         await connectRedis();
        
//         // Configure Cloudinary
//         configureCloudinary();
        
//         console.log('✅ All services initialized successfully');
//         return app;
//     } catch (error) {
//         console.error('❌ Failed to initialize app:', error);
//         process.exit(1);
//     }
// };

// module.exports = { app, initializeApp };

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');

// Import configs
const connectDB = require('./config/database');
const { connectRedis } = require('./config/redis');
const { configureCloudinary } = require('./config/cloudinary');

// Import middleware
const errorMiddleware = require('./middleware/error.middleware');
const rateLimitMiddleware = require('./middleware/rateLimit.middleware');

// Import routes
const routes = require('./routes');

const app = express();

/* ===========================
   SECURITY MIDDLEWARE
=========================== */
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https://res.cloudinary.com"],
        fontSrc: ["'self'"],
        connectSrc: ["'self'"],
      },
    },
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

/* ===========================
   CORS
=========================== */
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

/* ===========================
   PERFORMANCE & PARSING
=========================== */
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

/* ===========================
   LOGGING
=========================== */
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

/* ===========================
   RATE LIMITING
=========================== */
app.use('/api', rateLimitMiddleware.apiLimiter);

/* ===========================
   HEALTH CHECK
=========================== */
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  });
});

/* ===========================
   ROUTES
=========================== */
app.use(routes);

/* ===========================
   404 HANDLER
=========================== */
app.use(errorMiddleware.notFound);

/* ===========================
   GLOBAL ERROR HANDLER
=========================== */
app.use(errorMiddleware.errorHandler);
app.use(`/api/v1`, (req, res) => {
    res.status(404).json({
        error: 'API endpoint not found',
        path: req.originalUrl
    });
});


/* ===========================
   INITIALIZE SERVICES
=========================== */
const initializeApp = async () => {
  // Database is CRITICAL
  await connectDB();

  // Redis is OPTIONAL
  try {
    await connectRedis();
    console.log('✅ Redis connected');
  } catch (err) {
    console.error('⚠️ Redis unavailable, continuing without cache');
  }

  // Cloudinary is OPTIONAL
  try {
    configureCloudinary();
    console.log('✅ Cloudinary configured');
  } catch (err) {
    console.error('⚠️ Cloudinary configuration failed');
  }

  console.log('✅ App initialized successfully');
  return app;
};

module.exports = { app, initializeApp };
