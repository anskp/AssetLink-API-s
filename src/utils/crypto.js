import crypto from 'crypto';
import bcrypt from 'bcrypt';

/**
 * Cryptographic Utilities
 * For API key generation, secret hashing, and secure random generation
 */

const SALT_ROUNDS = 10;

/**
 * Hash a secret using bcrypt
 */
export const hashSecret = async (secret) => {
    return await bcrypt.hash(secret, SALT_ROUNDS);
};

/**
 * Compare a secret against a hash
 */
export const compareSecret = async (secret, hash) => {
    return await bcrypt.compare(secret, hash);
};

/**
 * Generate a secure random key
 */
export const generateRandomKey = (length = 32) => {
    return crypto.randomBytes(length).toString('hex');
};

/**
 * Generate API key pair
 */
export const generateApiKeyPair = () => {
    const publicKey = `ak_${generateRandomKey(16)}`;
    const secretKey = `sk_${generateRandomKey(24)}`;

    return { publicKey, secretKey };
};

/**
 * Generate a UUID v4
 */
export const generateUUID = () => {
    return crypto.randomUUID();
};

export default {
    hashSecret,
    compareSecret,
    generateRandomKey,
    generateApiKeyPair,
    generateUUID
};
