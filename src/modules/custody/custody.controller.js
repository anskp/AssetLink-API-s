import * as custodyService from './custody.service.js';
import { ValidationError } from '../../errors/ValidationError.js';

/**
 * Custody Controller
 * HTTP request handlers for custody endpoints
 */

/**
 * Link asset to custody
 * POST /v1/custody/link
 */
export const linkAsset = async (req, res, next) => {
    try {
        const { assetId } = req.body;

        if (!assetId) {
            throw new ValidationError('Asset ID is required', [
                { field: 'assetId', message: 'Required field' }
            ]);
        }

        const custodyRecord = await custodyService.linkAsset(
            assetId,
            req.auth?.publicKey || 'unknown',
            {
                ipAddress: req.ip,
                userAgent: req.get('user-agent')
            }
        );

        res.status(201).json(custodyRecord);
    } catch (error) {
        next(error);
    }
};

/**
 * Get custody status by asset ID
 * GET /v1/custody/:assetId
 */
export const getCustodyStatus = async (req, res, next) => {
    try {
        const { assetId } = req.params;

        const custodyRecord = await custodyService.getCustodyStatus(assetId);

        res.json(custodyRecord);
    } catch (error) {
        next(error);
    }
};

/**
 * List custody records
 * GET /v1/custody
 */
export const listCustodyRecords = async (req, res, next) => {
    try {
        const { status, limit, offset } = req.query;

        const result = await custodyService.listCustodyRecords({
            status,
            limit: limit ? parseInt(limit) : undefined,
            offset: offset ? parseInt(offset) : undefined
        });

        res.json(result);
    } catch (error) {
        next(error);
    }
};

/**
 * Get custody statistics
 * GET /v1/custody/stats
 */
export const getStatistics = async (req, res, next) => {
    try {
        const stats = await custodyService.getStatistics();
        res.json(stats);
    } catch (error) {
        next(error);
    }
};

export default {
    linkAsset,
    getCustodyStatus,
    listCustodyRecords,
    getStatistics
};
