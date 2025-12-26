import prisma from '../../config/db.js';
import { CustodyStatus } from '../../enums/custodyStatus.js';

/**
 * Custody Repository
 * Database operations for custody records
 */

/**
 * Create new custody record
 */
export const createCustodyRecord = async (assetId, status = CustodyStatus.LINKED) => {
    return await prisma.custodyRecord.create({
        data: {
            assetId,
            status,
            linkedAt: status === CustodyStatus.LINKED ? new Date() : null
        }
    });
};

/**
 * Find custody record by asset ID
 */
export const findByAssetId = async (assetId) => {
    return await prisma.custodyRecord.findUnique({
        where: { assetId },
        include: {
            vaultWallet: true
        }
    });
};

/**
 * Find custody record by ID
 */
export const findById = async (id) => {
    return await prisma.custodyRecord.findUnique({
        where: { id },
        include: {
            vaultWallet: true,
            operations: {
                orderBy: { createdAt: 'desc' },
                take: 10
            }
        }
    });
};

/**
 * Update custody status
 */
export const updateStatus = async (id, newStatus, metadata = {}) => {
    const updateData = { status: newStatus };

    // Set timestamp based on status
    if (newStatus === CustodyStatus.MINTED) {
        updateData.mintedAt = new Date();
        if (metadata.blockchain) updateData.blockchain = metadata.blockchain;
        if (metadata.tokenStandard) updateData.tokenStandard = metadata.tokenStandard;
        if (metadata.tokenAddress) updateData.tokenAddress = metadata.tokenAddress;
        if (metadata.tokenId) updateData.tokenId = metadata.tokenId;
        if (metadata.quantity) updateData.quantity = metadata.quantity;
        if (metadata.vaultWalletId) updateData.vaultWalletId = metadata.vaultWalletId;
    } else if (newStatus === CustodyStatus.WITHDRAWN) {
        updateData.withdrawnAt = new Date();
    } else if (newStatus === CustodyStatus.BURNED) {
        updateData.burnedAt = new Date();
    }

    return await prisma.custodyRecord.update({
        where: { id },
        data: updateData
    });
};

/**
 * List custody records with pagination
 */
export const listCustodyRecords = async (filters = {}) => {
    const { status, limit = 50, offset = 0 } = filters;

    const where = {};
    if (status) where.status = status;

    const [records, total] = await Promise.all([
        prisma.custodyRecord.findMany({
            where,
            include: {
                vaultWallet: {
                    select: {
                        fireblocksId: true,
                        blockchain: true
                    }
                },
                operations: {
                    orderBy: { createdAt: 'desc' },
                    take: 5
                }
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: offset
        }),
        prisma.custodyRecord.count({ where })
    ]);

    return { records, total };
};

/**
 * Get custody statistics
 */
export const getStatistics = async () => {
    const [total, linked, minted, withdrawn, burned] = await Promise.all([
        prisma.custodyRecord.count(),
        prisma.custodyRecord.count({ where: { status: CustodyStatus.LINKED } }),
        prisma.custodyRecord.count({ where: { status: CustodyStatus.MINTED } }),
        prisma.custodyRecord.count({ where: { status: CustodyStatus.WITHDRAWN } }),
        prisma.custodyRecord.count({ where: { status: CustodyStatus.BURNED } })
    ]);

    return { total, linked, minted, withdrawn, burned };
};

export default {
    createCustodyRecord,
    findByAssetId,
    findById,
    updateStatus,
    listCustodyRecords,
    getStatistics
};
