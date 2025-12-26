import prisma from '../../config/db.js';
import { hashSecret, generateApiKeyPair } from '../../utils/crypto.js';

/**
 * API Key Repository
 * Database operations for API key management
 */

/**
 * Create a new API key
 */
export const createApiKey = async (data) => {
    const { tenantId, permissions = ['read'], ipWhitelist = null } = data;

    // Generate key pair
    const { publicKey, secretKey } = generateApiKeyPair();

    // Hash the secret
    const secretKeyHash = await hashSecret(secretKey);

    // Store in database
    const apiKey = await prisma.apiKey.create({
        data: {
            publicKey,
            secretKeyHash,
            tenantId,
            permissions,
            ipWhitelist,
            isActive: true
        }
    });

    // Return with plain secret (only time it's exposed)
    return {
        ...apiKey,
        secretKey // Include plain secret for client
    };
};

/**
 * Find API key by public key
 */
export const findByPublicKey = async (publicKey) => {
    return await prisma.apiKey.findUnique({
        where: { publicKey }
    });
};

/**
 * Find API key by ID
 */
export const findById = async (id) => {
    return await prisma.apiKey.findUnique({
        where: { id }
    });
};

/**
 * List all API keys (with optional filters)
 */
export const listApiKeys = async (filters = {}) => {
    const { tenantId, isActive } = filters;

    const where = {};
    if (tenantId) where.tenantId = tenantId;
    if (isActive !== undefined) where.isActive = isActive;

    return await prisma.apiKey.findMany({
        where,
        select: {
            id: true,
            publicKey: true,
            tenantId: true,
            permissions: true,
            ipWhitelist: true,
            isActive: true,
            createdAt: true,
            updatedAt: true
            // Exclude secretKeyHash
        },
        orderBy: {
            createdAt: 'desc'
        }
    });
};

/**
 * Update API key
 */
export const updateApiKey = async (id, data) => {
    const { permissions, ipWhitelist } = data;

    const updateData = {};
    if (permissions) updateData.permissions = permissions;
    if (ipWhitelist !== undefined) updateData.ipWhitelist = ipWhitelist;

    return await prisma.apiKey.update({
        where: { id },
        data: updateData,
        select: {
            id: true,
            publicKey: true,
            tenantId: true,
            permissions: true,
            ipWhitelist: true,
            isActive: true,
            createdAt: true,
            updatedAt: true
        }
    });
};

/**
 * Revoke (deactivate) API key
 */
export const revokeApiKey = async (id) => {
    return await prisma.apiKey.update({
        where: { id },
        data: { isActive: false }
    });
};

/**
 * Delete API key permanently
 */
export const deleteApiKey = async (id) => {
    return await prisma.apiKey.delete({
        where: { id }
    });
};

export default {
    createApiKey,
    findByPublicKey,
    findById,
    listApiKeys,
    updateApiKey,
    revokeApiKey,
    deleteApiKey
};
