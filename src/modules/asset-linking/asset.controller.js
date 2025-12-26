import * as assetService from './asset.service.js';
import * as operationService from '../operation/operation.service.js';
import * as custodyService from '../custody/custody.service.js';
import { ValidationError } from '../../errors/ValidationError.js';
import { getAllAssetTypes } from '../../enums/assetType.js';
import { CustodyStatus } from '../../enums/custodyStatus.js';

/**
 * Asset Controller
 * HTTP request handlers for asset endpoints
 */

/**
 * Create asset with metadata
 * POST /v1/assets
 */
export const createAsset = async (req, res, next) => {
    try {
        const { assetId, ...metadata } = req.body;

        // 1. Create a PENDING custody record first to satisfy DB constraints
        const custodyRecord = await custodyService.linkAsset(
            assetId,
            req.auth?.publicKey || 'unknown',
            {},
            CustodyStatus.PENDING
        );

        // 2. Initiate the LINK_ASSET operation pointing to this record
        const result = await operationService.initiateOperation(
            {
                operationType: 'LINK_ASSET',
                custodyRecordId: custodyRecord.id,
                payload: { assetId, ...metadata }
            },
            req.auth?.publicKey || 'unknown',
            {
                ipAddress: req.ip,
                userAgent: req.get('user-agent')
            }
        );

        res.status(202).json({
            message: 'Asset linking operation initiated',
            operationId: result.id,
            custodyRecordId: custodyRecord.id,
            status: 'PENDING_APPROVAL'
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get asset details
 * GET /v1/assets/:assetId
 */
export const getAssetDetails = async (req, res, next) => {
    try {
        const { assetId } = req.params;

        const asset = await assetService.getAssetDetails(assetId);

        res.json(asset);
    } catch (error) {
        next(error);
    }
};

/**
 * Update asset metadata
 * PATCH /v1/assets/:assetId
 */
export const updateAsset = async (req, res, next) => {
    try {
        const { assetId } = req.params;
        const updates = req.body;

        const updated = await assetService.updateAssetInfo(
            assetId,
            updates,
            req.auth?.publicKey || 'unknown',
            {
                ipAddress: req.ip,
                userAgent: req.get('user-agent')
            }
        );

        res.json(updated);
    } catch (error) {
        next(error);
    }
};

/**
 * Verify asset
 * POST /v1/assets/:assetId/verify
 */
export const verifyAsset = async (req, res, next) => {
    try {
        const { assetId } = req.params;
        const { notes } = req.body;

        const verified = await assetService.verifyAsset(
            assetId,
            req.auth?.publicKey || 'unknown',
            notes,
            {
                ipAddress: req.ip,
                userAgent: req.get('user-agent')
            }
        );

        res.json(verified);
    } catch (error) {
        next(error);
    }
};

/**
 * Search assets
 * GET /v1/assets/search
 */
export const searchAssets = async (req, res, next) => {
    try {
        const { assetType, minValue, maxValue, verified, limit, offset } = req.query;

        const criteria = {
            assetType,
            minValue,
            maxValue,
            verified: verified === 'true' ? true : verified === 'false' ? false : undefined,
            limit: limit ? parseInt(limit) : undefined,
            offset: offset ? parseInt(offset) : undefined
        };

        const result = await assetService.searchAssets(criteria);

        res.json(result);
    } catch (error) {
        next(error);
    }
};

/**
 * Get assets by type
 * GET /v1/assets/types/:type
 */
export const getAssetsByType = async (req, res, next) => {
    try {
        const { type } = req.params;
        const { limit, offset } = req.query;

        const assets = await assetService.getAssetsByType(type, {
            limit: limit ? parseInt(limit) : undefined,
            offset: offset ? parseInt(offset) : undefined
        });

        res.json({ assets, total: assets.length });
    } catch (error) {
        next(error);
    }
};

/**
 * Get asset statistics by type
 * GET /v1/assets/stats/types
 */
export const getAssetStatsByType = async (req, res, next) => {
    try {
        const stats = await assetService.getAssetStatsByType();
        res.json(stats);
    } catch (error) {
        next(error);
    }
};

/**
 * Get available asset types
 * GET /v1/assets/types
 */
export const getAssetTypes = async (req, res, next) => {
    try {
        const types = getAllAssetTypes();
        res.json({ types });
    } catch (error) {
        next(error);
    }
};

export default {
    createAsset,
    getAssetDetails,
    updateAsset,
    verifyAsset,
    searchAssets,
    getAssetsByType,
    getAssetStatsByType,
    getAssetTypes
};
