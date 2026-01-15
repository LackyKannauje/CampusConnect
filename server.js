// require('dotenv').config();

// const { initializeApp } = require('./app');

// const PORT = process.env.PORT || 5000;
// const HOST = process.env.HOST || '0.0.0.0';

// const startServer = async () => {
//     try {
//         const { app } = await initializeApp();
        
//         const server = app.listen(PORT, HOST, () => {
//             console.log(`🚀 Server running on http://${HOST}:${PORT}`);
//             console.log(`📁 Environment: ${process.env.NODE_ENV || 'development'}`);
//             console.log(`⏰ Started at: ${new Date().toISOString()}`);
//         });

//         // Graceful shutdown
//         const shutdown = async (signal) => {
//             console.log(`\n${signal} received. Starting graceful shutdown...`);
            
//             server.close(async () => {
//                 console.log('✅ HTTP server closed');
                
//                 // Close MongoDB connection
//                 const mongoose = require('mongoose');
//                 if (mongoose.connection.readyState === 1) {
//                     await mongoose.connection.close();
//                     console.log('✅ MongoDB connection closed');
//                 }
                
//                 // Close Redis connection
//                 const { getRedisClient } = require('./config/redis');
//                 try {
//                     const redisClient = getRedisClient();
//                     await redisClient.quit();
//                     console.log('✅ Redis connection closed');
//                 } catch (error) {
//                     console.log('⚠️ Redis already disconnected');
//                 }
                
//                 console.log('👋 Graceful shutdown complete');
//                 process.exit(0);
//             });

//             // Force shutdown after 10 seconds
//             setTimeout(() => {
//                 console.error('❌ Could not close connections in time, forcefully shutting down');
//                 process.exit(1);
//             }, 10000);
//         };

//         // Handle shutdown signals
//         process.on('SIGTERM', () => shutdown('SIGTERM'));
//         process.on('SIGINT', () => shutdown('SIGINT'));

//         // Handle uncaught exceptions
//         process.on('uncaughtException', (error) => {
//             console.error('❌ Uncaught Exception:', error);
//             shutdown('uncaughtException');
//         });

//         // Handle unhandled promise rejections
//         process.on('unhandledRejection', (reason, promise) => {
//             console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
//             shutdown('unhandledRejection');
//         });

//     } catch (error) {
//         console.error('❌ Failed to start server:', error);
//         process.exit(1);
//     }
// };

// // Start the server
// if (require.main === module) {
//     startServer();
// }
require('dotenv').config();

const mongoose = require('mongoose');
const { app, initializeApp } = require('./app');

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';

let server;

/* ===========================
   START SERVER
=========================== */
const startServer = async () => {
  try {
    // Initialize services (DB, Redis, Cloudinary)
    await initializeApp();

    server = app.listen(PORT, HOST, () => {
      console.log(`🚀 Server running on http://${HOST}:${PORT}`);
      console.log(`📁 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`⏰ Started at: ${new Date().toISOString()}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

/* ===========================
   GRACEFUL SHUTDOWN
=========================== */
const shutdown = async (signal) => {
  console.log(`\n${signal} received. Starting graceful shutdown...`);

  if (server) {
    server.close(async () => {
      console.log('✅ HTTP server closed');

      // Close MongoDB
      if (mongoose.connection.readyState === 1) {
        await mongoose.connection.close();
        console.log('✅ MongoDB connection closed');
      }

      // Close Redis (optional)
      try {
        const { getRedisClient } = require('./config/redis');
        const redisClient = getRedisClient();
        if (redisClient) {
          await redisClient.quit();
          console.log('✅ Redis connection closed');
        }
      } catch {
        console.log('⚠️ Redis already disconnected');
      }

      console.log('👋 Graceful shutdown complete');
      process.exit(0);
    });

    // Force exit after 10 seconds
    setTimeout(() => {
      console.error('❌ Forced shutdown');
      process.exit(1);
    }, 10000);
  }
};

/* ===========================
   PROCESS SIGNALS
=========================== */
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  shutdown('uncaughtException');
});

process.on('unhandledRejection', (reason) => {
  console.error('❌ Unhandled Rejection:', reason);
  shutdown('unhandledRejection');
});

/* ===========================
   BOOTSTRAP
=========================== */
if (require.main === module) {
  startServer();
}
