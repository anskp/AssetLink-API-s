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

        // Two-level isolation: tenantId (platform) + createdBy (end user)
        const tenantId = req.auth?.tenantId;
        const createdBy = req.auth?.endUserId; // End user from X-USER-ID header

        if (!tenantId) {
            throw new ValidationError('Tenant ID not found in authentication context');
        }

        if (!createdBy) {
            throw new ValidationError('X-USER-ID header is required to identify the end user');
        }

        const custodyRecord = await custodyService.linkAsset(
            assetId,
            tenantId,
            createdBy,
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

        const tenantId = req.auth?.tenantId;
        const endUserId = req.auth?.endUserId;

        if (!tenantId) {
            throw new ValidationError('Tenant ID not found in authentication context');
        }

        const custodyRecord = await custodyService.getCustodyStatus(assetId, tenantId, endUserId);

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

        const tenantId = req.auth?.tenantId;
        const endUserId = req.auth?.endUserId;

        if (!tenantId) {
            throw new ValidationError('Tenant ID not found in authentication context');
        }

        const result = await custodyService.listCustodyRecords({
            tenantId,
            endUserId, // If provided, filter by end user; otherwise show all for platform owner
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
