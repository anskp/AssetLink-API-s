import * as assetService from './asset.service.js';
import { ValidationError } from '../../errors/ValidationError.js';
import { getAllAssetTypes } from '../../enums/assetType.js';

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

        if (!assetId) {
            throw new ValidationError('Asset ID is required', [
                { field: 'assetId', message: 'Required field' }
            ]);
        }

        if (!metadata.assetType) {
            throw new ValidationError('Asset type is required', [
                { field: 'assetType', message: 'Required field' }
            ]);
        }

        if (!metadata.assetName) {
            throw new ValidationError('Asset name is required', [
                { field: 'assetName', message: 'Required field' }
            ]);
        }

        if (!metadata.estimatedValue) {
            throw new ValidationError('Estimated value is required', [
                { field: 'estimatedValue', message: 'Required field' }
            ]);
        }

        const result = await assetService.linkAssetWithMetadata(
            assetId,
            metadata,
            req.auth?.publicKey || 'unknown',
            {
                ipAddress: req.ip,
                userAgent: req.get('user-agent')
            }
        );

        res.status(201).json(result);
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
