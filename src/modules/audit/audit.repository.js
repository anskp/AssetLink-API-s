import prisma from '../../config/db.js';
import logger from '../../utils/logger.js';

/**
 * Audit Repository
 * Database operations for audit logs (append-only)
 */

/**
 * Create new audit log entry
 */
export const createAuditLog = async (data) => {
    const {
        custodyRecordId,
        operationId,
        eventType,
        actor,
        metadata,
        ipAddress,
        userAgent
    } = data;

    return await prisma.auditLog.create({
        data: {
            custodyRecordId,
            operationId,
            eventType,
            actor,
            metadata: metadata || {},
            ipAddress,
            userAgent
        }
    });
};

/**
 * Find audit logs by custody record
 */
export const findByCustodyRecord = async (custodyRecordId, options = {}) => {
    const { limit = 100, offset = 0 } = options;

    return await prisma.auditLog.findMany({
        where: { custodyRecordId },
        orderBy: { timestamp: 'desc' },
        take: limit,
        skip: offset
    });
};

/**
 * Find audit logs by operation
 */
export const findByOperation = async (operationId, options = {}) => {
    const { limit = 100, offset = 0 } = options;

    return await prisma.auditLog.findMany({
        where: { operationId },
        orderBy: { timestamp: 'desc' },
        take: limit,
        skip: offset
    });
};

/**
 * Find audit logs by actor
 */
export const findByActor = async (actor, options = {}) => {
    const { limit = 100, offset = 0, eventType } = options;

    const where = { actor };
    if (eventType) where.eventType = eventType;

    return await prisma.auditLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: limit,
        skip: offset
    });
};

/**
 * Find audit logs by event type
 */
export const findByEventType = async (eventType, options = {}) => {
    const { limit = 100, offset = 0 } = options;

    return await prisma.auditLog.findMany({
        where: { eventType },
        orderBy: { timestamp: 'desc' },
        take: limit,
        skip: offset
    });
};

/**
 * Find audit logs by date range
 */
export const findByDateRange = async (startDate, endDate, options = {}) => {
    const { limit = 100, offset = 0 } = options;

    return await prisma.auditLog.findMany({
        where: {
            timestamp: {
                gte: new Date(startDate),
                lte: new Date(endDate)
            }
        },
        orderBy: { timestamp: 'desc' },
        take: limit,
        skip: offset
    });
};

/**
 * Get recent audit logs
 */
export const getRecentLogs = async (limit = 50) => {
    return await prisma.auditLog.findMany({
        orderBy: { timestamp: 'desc' },
        take: limit,
        include: {
            custodyRecord: {
                select: {
                    assetId: true,
                    status: true
                }
            },
            operation: {
                select: {
                    operationType: true,
                    status: true
                }
            }
        }
    });
};

export default {
    createAuditLog,
    findByCustodyRecord,
    findByOperation,
    findByActor,
    findByEventType,
    findByDateRange,
    getRecentLogs
};
