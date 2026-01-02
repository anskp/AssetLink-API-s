import app from './app.js';
import { config } from './config/env.js';
import { testConnection, disconnect } from './config/db.js';
import { verifyAuditTrailIntegrity } from './modules/audit/audit.service.js';
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
        
        // Verify audit trail integrity
        logger.info('Verifying audit trail integrity...');
        await verifyAuditTrailIntegrity();
        logger.info('✓ Audit trail integrity verified');

        // Start HTTP server
        server = app.listen(config.port, () => {
            console.log('\n' + '='.repeat(60));
            console.log('🚀 AssetLink Custody Backend Server Started!');
            console.log('='.repeat(60));
            console.log(`📍 Server URL:     http://localhost:${config.port}`);
            console.log(`🏥 Health Check:   http://localhost:${config.port}/health`);
            console.log(`📚 API Docs:       http://localhost:${config.port}/openapi.yaml`);
            console.log(`🌍 Environment:    ${config.nodeEnv}`);
            console.log('='.repeat(60) + '\n');
            
            logger.info(`AssetLink Custody server running on port ${config.port}`);
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
