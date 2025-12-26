import prisma from '../../config/db.js';
import { AssetType } from '../../enums/assetType.js';

/**
 * Asset Repository
 * Database operations for asset metadata
 */

/**
 * Create asset metadata
 */
export const createAssetMetadata = async (custodyRecordId, data) => {
    const {
        assetType,
        assetName,
        description,
        manufacturer,
        model,
        serialNumber,
        yearManufactured,
        estimatedValue,
        currency = 'USD',
        valuationDate,
        valuationMethod,
        documents = [],
        images = [],
        customFields
    } = data;

    return await prisma.assetMetadata.create({
        data: {
            custodyRecordId,
            assetType,
            assetName,
            description,
            manufacturer,
            model,
            serialNumber,
            yearManufactured,
            estimatedValue,
            currency,
            valuationDate: valuationDate ? new Date(valuationDate) : null,
            valuationMethod,
            documents,
            images,
            customFields
        }
    });
};

/**
 * Find asset metadata by custody record ID
 */
export const findByCustodyRecordId = async (custodyRecordId) => {
    return await prisma.assetMetadata.findUnique({
        where: { custodyRecordId },
        include: {
            custodyRecord: true
        }
    });
};

/**
 * Find asset metadata by asset ID
 */
export const findByAssetId = async (assetId) => {
    const custodyRecord = await prisma.custodyRecord.findUnique({
        where: { assetId },
        include: {
            assetMetadata: true,
            vaultWallet: true
        }
    });

    return custodyRecord;
};

/**
 * Update asset metadata
 */
export const updateAssetMetadata = async (custodyRecordId, data) => {
    const updateData = {};

    if (data.assetName) updateData.assetName = data.assetName;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.manufacturer !== undefined) updateData.manufacturer = data.manufacturer;
    if (data.model !== undefined) updateData.model = data.model;
    if (data.serialNumber !== undefined) updateData.serialNumber = data.serialNumber;
    if (data.yearManufactured !== undefined) updateData.yearManufactured = data.yearManufactured;
    if (data.estimatedValue) updateData.estimatedValue = data.estimatedValue;
    if (data.currency) updateData.currency = data.currency;
    if (data.valuationDate !== undefined) {
        updateData.valuationDate = data.valuationDate ? new Date(data.valuationDate) : null;
    }
    if (data.valuationMethod !== undefined) updateData.valuationMethod = data.valuationMethod;
    if (data.documents !== undefined) updateData.documents = data.documents;
    if (data.images !== undefined) updateData.images = data.images;
    if (data.customFields !== undefined) updateData.customFields = data.customFields;

    return await prisma.assetMetadata.update({
        where: { custodyRecordId },
        data: updateData
    });
};

/**
 * Verify asset
 */
export const verifyAsset = async (custodyRecordId, verifier, notes) => {
    return await prisma.assetMetadata.update({
        where: { custodyRecordId },
        data: {
            verifiedBy: verifier,
            verificationDate: new Date(),
            verificationNotes: notes
        }
    });
};

/**
 * Search assets by criteria
 */
export const searchAssets = async (criteria = {}) => {
    const {
        assetType,
        minValue,
        maxValue,
        verified,
        limit = 50,
        offset = 0
    } = criteria;

    const where = {};

    if (assetType) where.assetType = assetType;
    if (verified !== undefined) {
        where.verifiedBy = verified ? { not: null } : null;
    }

    const [assets, total] = await Promise.all([
        prisma.assetMetadata.findMany({
            where,
            include: {
                custodyRecord: {
                    select: {
                        assetId: true,
                        status: true,
                        blockchain: true,
                        tokenId: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: offset
        }),
        prisma.assetMetadata.count({ where })
    ]);

    return { assets, total };
};

/**
 * Get assets by type
 */
export const getAssetsByType = async (assetType, options = {}) => {
    const { limit = 50, offset = 0 } = options;

    return await prisma.assetMetadata.findMany({
        where: { assetType },
        include: {
            custodyRecord: {
                select: {
                    assetId: true,
                    status: true
                }
            }
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset
    });
};

/**
 * Get asset statistics by type
 */
export const getAssetStatsByType = async () => {
    const stats = await prisma.assetMetadata.groupBy({
        by: ['assetType'],
        _count: true
    });

    return stats.reduce((acc, stat) => {
        acc[stat.assetType] = stat._count;
        return acc;
    }, {});
};

export default {
    createAssetMetadata,
    findByCustodyRecordId,
    findByAssetId,
    updateAssetMetadata,
    verifyAsset,
    searchAssets,
    getAssetsByType,
    getAssetStatsByType
};
