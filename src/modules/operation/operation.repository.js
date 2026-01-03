import prisma from '../../config/db.js';
import { OperationStatus } from '../../enums/operationStatus.js';

/**
 * Operation Repository
 * Handles database operations for CustodyOperation model
 */

/**
 * Create a new operation
 */
export const createOperation = async (data) => {
    return await prisma.custodyOperation.create({
        data: {
            operationType: data.operationType,
            status: data.status || OperationStatus.PENDING_CHECKER,
            custodyRecordId: data.custodyRecordId,
            vaultWalletId: data.vaultWalletId,
            payload: data.payload || {},
            initiatedBy: data.initiatedBy,
            idempotencyKey: data.idempotencyKey
        },
        include: {
            custodyRecord: true,
            vaultWallet: true
        }
    });
};

/**
 * Find operation by ID
 */
export const findById = async (id) => {
    return await prisma.custodyOperation.findUnique({
        where: { id },
        include: {
            custodyRecord: true,
            vaultWallet: true
        }
    });
};

/**
 * Update operation status and tracking info
 */
export const updateStatus = async (id, status, updates = {}) => {
    const {
        approvedBy,
        rejectedBy,
        rejectionReason,
        fireblocksTaskId,
        txHash,
        executedAt,
        failureReason
    } = updates;

    return await prisma.custodyOperation.update({
        where: { id },
        data: {
            status,
            approvedBy,
            rejectedBy,
            rejectionReason,
            fireblocksTaskId,
            txHash,
            executedAt,
            failureReason
        }
    });
};

/**
 * List operations with filters
 */
export const listOperations = async (filters = {}) => {
    const { status, operationType, custodyRecordId, tenantId, limit = 50, offset = 0 } = filters;

    const where = {};
    if (status) where.status = status;
    if (operationType) where.operationType = operationType;
    if (custodyRecordId) where.custodyRecordId = custodyRecordId;
    
    // Filter by tenantId through custodyRecord relation
    if (tenantId) {
        where.custodyRecord = {
            tenantId: tenantId
        };
    }

    const [operations, total] = await Promise.all([
        prisma.custodyOperation.findMany({
            where,
            include: {
                custodyRecord: {
                    select: {
                        assetId: true,
                        status: true,
                        tenantId: true,
                        createdBy: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: offset
        }),
        prisma.custodyOperation.count({ where })
    ]);

    return { operations, total };
};

/**
 * Find pending operations for a specific custody record
 */
export const findPendingByCustodyRecord = async (custodyRecordId) => {
    return await prisma.custodyOperation.findMany({
        where: {
            custodyRecordId,
            status: {
                in: [OperationStatus.PENDING_MAKER, OperationStatus.PENDING_CHECKER, OperationStatus.APPROVED]
            }
        }
    });
};

export default {
    createOperation,
    findById,
    updateStatus,
    listOperations,
    findPendingByCustodyRecord
};
