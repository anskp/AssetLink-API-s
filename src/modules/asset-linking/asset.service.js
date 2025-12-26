import * as assetRepository from './asset.repository.js';
import * as custodyService from '../custody/custody.service.js';
import * as auditService from '../audit/audit.service.js';
import { isValidAssetType } from '../../enums/assetType.js';
import { BadRequestError, NotFoundError } from '../../errors/ApiError.js';
import logger from '../../utils/logger.js';

/**
 * Asset Service
 * Business logic for asset linking with metadata
 */

/**
 * Link asset with metadata
 */
export const linkAssetWithMetadata = async (assetId, metadata, actor, context = {}) => {
    // Validate asset type
    if (!isValidAssetType(metadata.assetType)) {
        throw BadRequestError(`Invalid asset type: ${metadata.assetType}`);
    }

    // Link asset to custody first
    const custodyRecord = await custodyService.linkAsset(assetId, actor, context);

    // Create asset metadata
    const assetMetadata = await assetRepository.createAssetMetadata(
        custodyRecord.id,
        metadata
    );

    logger.info('Asset linked with metadata', {
        assetId,
        custodyRecordId: custodyRecord.id,
        assetType: metadata.assetType
    });

    return {
        custodyRecord,
        metadata: assetMetadata
    };
};

/**
 * Get full asset details
 */
export const getAssetDetails = async (assetId) => {
    const asset = await assetRepository.findByAssetId(assetId);

    if (!asset) {
        throw NotFoundError(`Asset ${assetId} not found`);
    }

    return {
        custodyRecord: {
            id: asset.id,
            assetId: asset.assetId,
            status: asset.status,
            blockchain: asset.blockchain,
            tokenStandard: asset.tokenStandard,
            tokenAddress: asset.tokenAddress,
            tokenId: asset.tokenId,
            linkedAt: asset.linkedAt,
            mintedAt: asset.mintedAt
        },
        metadata: asset.assetMetadata
    };
};

/**
 * Update asset metadata
 */
export const updateAssetInfo = async (assetId, updates, actor, context = {}) => {
    const asset = await assetRepository.findByAssetId(assetId);

    if (!asset || !asset.assetMetadata) {
        throw NotFoundError(`Asset ${assetId} not found or has no metadata`);
    }

    const updated = await assetRepository.updateAssetMetadata(
        asset.id,
        updates
    );

    // Log audit event
    await auditService.logEvent('ASSET_UPDATED', {
        assetId,
        updates,
        action: 'Asset metadata updated'
    }, {
        custodyRecordId: asset.id,
        actor,
        ...context
    });

    logger.info('Asset metadata updated', { assetId });

    return updated;
};

/**
 * Verify asset
 */
export const verifyAsset = async (assetId, verifier, notes, context = {}) => {
    const asset = await assetRepository.findByAssetId(assetId);

    if (!asset || !asset.assetMetadata) {
        throw NotFoundError(`Asset ${assetId} not found or has no metadata`);
    }

    const verified = await assetRepository.verifyAsset(
        asset.id,
        verifier,
        notes
    );

    // Log audit event
    await auditService.logEvent('ASSET_VERIFIED', {
        assetId,
        verifier,
        notes,
        action: 'Asset verified by expert'
    }, {
        custodyRecordId: asset.id,
        actor: verifier,
        ...context
    });

    logger.info('Asset verified', { assetId, verifier });

    return verified;
};

/**
 * Search assets
 */
export const searchAssets = async (criteria) => {
    return await assetRepository.searchAssets(criteria);
};

/**
 * Get assets by type
 */
export const getAssetsByType = async (assetType, options = {}) => {
    if (!isValidAssetType(assetType)) {
        throw BadRequestError(`Invalid asset type: ${assetType}`);
    }

    return await assetRepository.getAssetsByType(assetType, options);
};

/**
 * Get asset statistics by type
 */
export const getAssetStatsByType = async () => {
    return await assetRepository.getAssetStatsByType();
};

export default {
    linkAssetWithMetadata,
    getAssetDetails,
    updateAssetInfo,
    verifyAsset,
    searchAssets,
    getAssetsByType,
    getAssetStatsByType
};
