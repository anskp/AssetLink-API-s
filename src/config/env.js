import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../../.env') });

/**
 * Environment Configuration
 * Validates and exports all environment variables
 */

const requiredEnvVars = [
    'NODE_ENV',
    'PORT',
    'DATABASE_URL'
];

// Validate required environment variables
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
}

export const config = {
    // Application
    nodeEnv: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT, 10) || 3000,

    // Database
    databaseUrl: process.env.DATABASE_URL,

    // Security
    apiKeySecret: process.env.API_KEY_SECRET || 'default-secret-change-in-production',
    hmacSecret: process.env.HMAC_SECRET || 'default-hmac-secret-change-in-production',

    // Fireblocks
    fireblocks: {
        apiKey: process.env.FIREBLOCKS_API_KEY || '',
        secretKeyPath: process.env.FIREBLOCKS_SECRET_KEY_PATH || '', // Changed from privateKeyPath
        baseUrl: process.env.FIREBLOCKS_BASE_URL || 'https://sandbox-api.fireblocks.io/v1',
        contractTemplateId: process.env.FIREBLOCKS_CONTRACT_TEMPLATE_ID || ''
    },

    // Rate Limiting
    rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000, // 15 minutes
        maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100
    },

    // CORS
    corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173', 'http://localhost:5174'],

    // Logging
    logLevel: process.env.LOG_LEVEL || 'info'
};

export const isDevelopment = config.nodeEnv === 'development';
export const isProduction = config.nodeEnv === 'production';
export const isTest = config.nodeEnv === 'test';
