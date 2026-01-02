import express from 'express';
import * as apiKeyRepository from '../modules/auth/apiKey.repository.js';
import * as authController from '../modules/auth/auth.controller.js';
import { requirePermission, authenticateJwt, authenticate } from '../modules/auth/auth.middleware.js';
import { BadRequestError, NotFoundError } from '../errors/ApiError.js';
import { ValidationError } from '../errors/ValidationError.js';

/**
 * Authentication Routes
 * API key management endpoints (admin only)
 */

const router = express.Router();

/**
 * Auth Endpoints
 */
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);
router.get('/me', authenticateJwt, authController.me);

/**
 * Client-Facing API Key Management
 */
router.get('/keys/my', authenticateJwt, async (req, res, next) => {
    try {
        const keys = await apiKeyRepository.listApiKeys({ userId: req.user.sub });
        res.json({ keys });
    } catch (error) {
        next(error);
    }
});

router.post('/keys/my', authenticateJwt, async (req, res, next) => {
    try {
        const { role } = req.body; // MAKER, CHECKER, or VIEWER
        
        // Map role to permissions
        let permissions;
        switch(role) {
            case 'MAKER':
                permissions = ['read', 'write']; // Can create operations
                break;
            case 'CHECKER':
                permissions = ['read', 'admin']; // Can approve operations
                break;
            case 'VIEWER':
                permissions = ['read']; // Read-only
                break;
            default:
                permissions = ['read', 'write']; // Default to MAKER
        }
        
        const apiKey = await apiKeyRepository.createApiKey({
            userId: req.user.sub,
            permissions,
            role: role || 'MAKER',
            tenantId: req.user.sub // For now, 1:1 user to tenant
        });
        res.status(201).json(apiKey);
    } catch (error) {
        next(error);
    }
});

router.delete('/keys/my/:id', authenticateJwt, async (req, res, next) => {
    try {
        const { id } = req.params;
        const key = await apiKeyRepository.findById(id);
        if (!key || key.userId !== req.user.sub) {
            throw NotFoundError('API key not found');
        }
        await apiKeyRepository.revokeApiKey(id);
        res.json({ message: 'API key revoked' });
    } catch (error) {
        next(error);
    }
});

/**
 * API key management endpoints (admin only)
 */
router.post('/keys', authenticate, requirePermission('admin'), async (req, res, next) => {
    try {
        const { tenantId, permissions, ipWhitelist } = req.body;

        // Validate permissions
        const validPermissions = ['read', 'write', 'admin'];
        if (permissions && !Array.isArray(permissions)) {
            throw new ValidationError('Permissions must be an array', [
                { field: 'permissions', message: 'Must be an array' }
            ]);
        }

        if (permissions) {
            const invalidPerms = permissions.filter(p => !validPermissions.includes(p));
            if (invalidPerms.length > 0) {
                throw new ValidationError('Invalid permissions', [
                    { field: 'permissions', message: `Invalid values: ${invalidPerms.join(', ')}` }
                ]);
            }
        }

        // Create API key
        const apiKey = await apiKeyRepository.createApiKey({
            tenantId,
            permissions: permissions || ['read'],
            ipWhitelist: ipWhitelist || null
        });

        res.status(201).json({
            id: apiKey.id,
            publicKey: apiKey.publicKey,
            secretKey: apiKey.secretKey, // Only returned on creation
            tenantId: apiKey.tenantId,
            permissions: apiKey.permissions,
            ipWhitelist: apiKey.ipWhitelist,
            isActive: apiKey.isActive,
            createdAt: apiKey.createdAt
        });
    } catch (error) {
        next(error);
    }
});

/**
 * List API keys
 * GET /v1/auth/keys
 */
router.get('/keys', authenticate, requirePermission('admin'), async (req, res, next) => {
    try {
        const { tenantId, isActive } = req.query;

        const filters = {};
        if (tenantId) filters.tenantId = tenantId;
        if (isActive !== undefined) filters.isActive = isActive === 'true';

        const keys = await apiKeyRepository.listApiKeys(filters);

        res.json({
            keys,
            total: keys.length
        });
    } catch (error) {
        next(error);
    }
});

/**
 * Get specific API key
 * GET /v1/auth/keys/:id
 */
router.get('/keys/:id', authenticate, requirePermission('admin'), async (req, res, next) => {
    try {
        const { id } = req.params;

        const apiKey = await apiKeyRepository.findById(id);
        if (!apiKey) {
            throw NotFoundError('API key not found');
        }

        res.json({
            id: apiKey.id,
            publicKey: apiKey.publicKey,
            tenantId: apiKey.tenantId,
            permissions: apiKey.permissions,
            ipWhitelist: apiKey.ipWhitelist,
            isActive: apiKey.isActive,
            createdAt: apiKey.createdAt,
            updatedAt: apiKey.updatedAt
        });
    } catch (error) {
        next(error);
    }
});

/**
 * Update API key
 * PATCH /v1/auth/keys/:id
 */
router.patch('/keys/:id', authenticate, requirePermission('admin'), async (req, res, next) => {
    try {
        const { id } = req.params;
        const { permissions, ipWhitelist } = req.body;

        // Check if key exists
        const existing = await apiKeyRepository.findById(id);
        if (!existing) {
            throw NotFoundError('API key not found');
        }

        // Validate permissions if provided
        if (permissions) {
            const validPermissions = ['read', 'write', 'admin'];
            const invalidPerms = permissions.filter(p => !validPermissions.includes(p));
            if (invalidPerms.length > 0) {
                throw new ValidationError('Invalid permissions', [
                    { field: 'permissions', message: `Invalid values: ${invalidPerms.join(', ')}` }
                ]);
            }
        }

        const updated = await apiKeyRepository.updateApiKey(id, {
            permissions,
            ipWhitelist
        });

        res.json(updated);
    } catch (error) {
        next(error);
    }
});

/**
 * Revoke API key
 * DELETE /v1/auth/keys/:id
 */
router.delete('/keys/:id', authenticate, requirePermission('admin'), async (req, res, next) => {
    try {
        const { id } = req.params;

        // Check if key exists
        const existing = await apiKeyRepository.findById(id);
        if (!existing) {
            throw NotFoundError('API key not found');
        }

        await apiKeyRepository.revokeApiKey(id);

        res.json({
            message: 'API key revoked successfully',
            id
        });
    } catch (error) {
        next(error);
    }
});

export default router;
