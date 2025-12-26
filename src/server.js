import app from './app.js';
import { config } from './config/env.js';
import { testConnection, disconnect } from './config/db.js';
import logger from './utils/logger.js';

/**
 * Server Initialization
 * AssetLink Custody Backend
 */

let server;

const startServer = async () => {
    try {
        // Test database connection
        await testConnection();

        // Start HTTP server
        server = app.listen(config.port, () => {
            logger.info(`🚀 AssetLink Custody server running on port ${config.port}`);
            logger.info(`Environment: ${config.nodeEnv}`);
            logger.info(`Health check: http://localhost:${config.port}/health`);
        });

    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
};

// Graceful shutdown
const gracefulShutdown = async (signal) => {
    logger.info(`${signal} received, shutting down gracefully...`);

    if (server) {
        server.close(async () => {
            logger.info('HTTP server closed');

            try {
                await disconnect();
                logger.info('Database connection closed');
                process.exit(0);
            } catch (error) {
                logger.error('Error during shutdown:', error);
                process.exit(1);
            }
        });
    }

    // Force shutdown after 10 seconds
    setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
    }, 10000);
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    gracefulShutdown('UNHANDLED_REJECTION');
});

// Start the server
startServer();
