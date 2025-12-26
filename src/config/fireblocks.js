/**
 * Fireblocks Configuration
 * Placeholder for Fireblocks integration (Sprint 5)
 */

import { config } from './env.js';

export const fireblocksConfig = {
    apiKey: config.fireblocks.apiKey,
    privateKeyPath: config.fireblocks.privateKeyPath,
    baseUrl: config.fireblocks.baseUrl
};

// Fireblocks client will be initialized in Sprint 5
export const initializeFireblocks = () => {
    // TODO: Initialize Fireblocks SDK in Sprint 5
    return null;
};

export default fireblocksConfig;
