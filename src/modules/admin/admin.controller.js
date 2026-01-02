import prisma from '../../config/db.js';
import { BadRequestError, NotFoundError } from '../../errors/ApiError.js';

/**
 * Admin Controllers
 * Admin-only operations for user and system management
 */

/**
 * Get dashboard statistics
 */
export const getStats = async (req, res, next) => {
    try {
        const [
            totalUsers,
            activeUsers,
            totalApiKeys,
            activeApiKeys,
            totalAssets,
            totalOperations
        ] = await Promise.all([
            prisma.user.count(),
            prisma.user.count({ where: { status: 'ACTIVE' } }),
            prisma.apiKey.count(),
            prisma.apiKey.count({ where: { isActive: true } }),
            prisma.custodyRecord.count(),
            prisma.custodyOperation.count()
        ]);

        res.json({
            users: {
                total: totalUsers,
                active: activeUsers,
                suspended: totalUsers - activeUsers
            },
            apiKeys: {
                total: totalApiKeys,
                active: activeApiKeys,
                revoked: totalApiKeys - activeApiKeys
            },
            assets: {
                total: totalAssets
            },
            operations: {
                total: totalOperations
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * List all users
 */
export const listUsers = async (req, res, next) => {
    try {
        const { status, role, page = 1, limit = 50 } = req.query;

        const where = {};
        if (status) where.status = status;
        if (role) where.role = role;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [users, total] = await Promise.all([
            prisma.user.findMany({
                where,
                select: {
                    id: true,
                    email: true,
                    role: true,
                    status: true,
                    createdAt: true,
                    updatedAt: true,
                    _count: {
                        select: { apiKeys: true }
                    }
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: parseInt(limit)
            }),
            prisma.user.count({ where })
        ]);

        res.json({
            users,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get user details
 */
export const getUser = async (req, res, next) => {
    try {
        const { id } = req.params;

        const user = await prisma.user.findUnique({
            where: { id },
            include: {
                apiKeys: {
                    select: {
                        id: true,
                        publicKey: true,
                        isActive: true,
                        createdAt: true
                    }
                }
            }
        });

        if (!user) {
            throw NotFoundError('User not found');
        }

        // Don't send password hash
        const { passwordHash, ...userWithoutPassword } = user;

        res.json(userWithoutPassword);
    } catch (error) {
        next(error);
    }
};

/**
 * Update user status
 */
export const updateUserStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!['ACTIVE', 'SUSPENDED'].includes(status)) {
            throw new BadRequestError('Invalid status. Must be ACTIVE or SUSPENDED');
        }

        const user = await prisma.user.update({
            where: { id },
            data: { status },
            select: {
                id: true,
                email: true,
                role: true,
                status: true,
                updatedAt: true
            }
        });

        res.json(user);
    } catch (error) {
        next(error);
    }
};

/**
 * List all API keys (across all users)
 */
export const listAllApiKeys = async (req, res, next) => {
    try {
        const { isActive, page = 1, limit = 50 } = req.query;

        const where = {};
        if (isActive !== undefined) where.isActive = isActive === 'true';

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [keys, total] = await Promise.all([
            prisma.apiKey.findMany({
                where,
                select: {
                    id: true,
                    publicKey: true,
                    userId: true,
                    user: {
                        select: {
                            email: true,
                            role: true
                        }
                    },
                    permissions: true,
                    isActive: true,
                    createdAt: true
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: parseInt(limit)
            }),
            prisma.apiKey.count({ where })
        ]);

        res.json({
            keys,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get audit logs
 */
export const getAuditLogs = async (req, res, next) => {
    try {
        const { eventType, page = 1, limit = 100 } = req.query;

        const where = {};
        if (eventType) where.eventType = eventType;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [logs, total] = await Promise.all([
            prisma.auditLog.findMany({
                where,
                orderBy: { timestamp: 'desc' },
                skip,
                take: parseInt(limit)
            }),
            prisma.auditLog.count({ where })
        ]);

        res.json({
            logs,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get all assets (admin view)
 */
export const listAllAssets = async (req, res, next) => {
    try {
        const { status, page = 1, limit = 50 } = req.query;

        const where = {};
        if (status) where.status = status;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [assets, total] = await Promise.all([
            prisma.custodyRecord.findMany({
                where,
                include: {
                    assetMetadata: true,
                    vaultWallet: {
                        select: {
                            fireblocksId: true,
                            blockchain: true,
                            address: true
                        }
                    }
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: parseInt(limit)
            }),
            prisma.custodyRecord.count({ where })
        ]);

        res.json({
            assets,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        next(error);
    }
};
