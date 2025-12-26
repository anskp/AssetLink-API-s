import { PrismaClient } from '@prisma/client';
import { config } from './env.js';
import logger from '../utils/logger.js';

/**
 * Prisma Database Client
 * Singleton instance with connection pooling
 */

const prismaClientSingleton = () => {
    return new PrismaClient({
        log: config.nodeEnv === 'development'
            ? ['query', 'info', 'warn', 'error']
            : ['warn', 'error'],
        errorFormat: 'pretty'
    });
};

// Singleton pattern for Prisma client
const globalForPrisma = globalThis;
export const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

if (config.nodeEnv !== 'production') {
    globalForPrisma.prisma = prisma;
}

/**
 * Test database connection
 */
export const testConnection = async () => {
    try {
        await prisma.$connect();
        logger.info('Database connection established successfully');
        return true;
    } catch (error) {
        logger.error('Failed to connect to database:', error);
        throw error;
    }
};

/**
 * Graceful shutdown
 */
export const disconnect = async () => {
    try {
        await prisma.$disconnect();
        logger.info('Database connection closed');
    } catch (error) {
        logger.error('Error disconnecting from database:', error);
        throw error;
    }
};

export default prisma;
