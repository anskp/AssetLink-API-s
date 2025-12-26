/**
 * Fireblocks Configuration
 * Initializes the @fireblocks/ts-sdk client
 */

import { Fireblocks, BasePath } from '@fireblocks/ts-sdk';
import { readFileSync } from 'fs';
import { config } from './env.js';
import logger from '../utils/logger.js';

let fireblocksClient = null;

/**
 * Initialize Fireblocks SDK
 */
export const initializeFireblocks = () => {
    if (fireblocksClient) return fireblocksClient;

    try {
        const { apiKey, secretKeyPath, baseUrl } = config.fireblocks;

        if (!apiKey || !secretKeyPath) {
            logger.warn('Fireblocks API Key or Secret Key Path missing. SDK not initialized.');
            return null;
        }

        const secretKey = readFileSync(secretKeyPath, 'utf8');

        // Determine BasePath from baseUrl
        let basePath = BasePath.Sandbox;
        if (baseUrl.includes('api.fireblocks.io')) {
            basePath = BasePath.US; // Or determine based on actual URL
        }

        fireblocksClient = new Fireblocks({
            apiKey,
            secretKey,
            basePath
        });

        logger.info('Fireblocks SDK initialized successfully');
        return fireblocksClient;
    } catch (error) {
        logger.error('Failed to initialize Fireblocks SDK', { error: error.message });
        return null;
    }
};

/**
 * Get Fireblocks client instance
 */
export const getFireblocksClient = () => {
    if (!fireblocksClient) {
        return initializeFireblocks();
    }
    return fireblocksClient;
};

export default {
    initializeFireblocks,
    getFireblocksClient
};
