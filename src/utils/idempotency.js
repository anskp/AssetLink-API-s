import crypto from 'crypto';

/**
 * Idempotency Utilities
 * Ensures operations are executed exactly once
 */

/**
 * Generate idempotency key from request data
 */
export const generateIdempotencyKey = (operationType, payload) => {
    const data = JSON.stringify({ operationType, payload });
    return crypto.createHash('sha256').update(data).digest('hex');
};

/**
 * Validate idempotency key format
 */
export const isValidIdempotencyKey = (key) => {
    return typeof key === 'string' && /^[a-f0-9]{64}$/.test(key);
};

/**
 * Create idempotency key from custom string
 */
export const createCustomIdempotencyKey = (customString) => {
    return crypto.createHash('sha256').update(customString).digest('hex');
};

export default {
    generateIdempotencyKey,
    isValidIdempotencyKey,
    createCustomIdempotencyKey
};
