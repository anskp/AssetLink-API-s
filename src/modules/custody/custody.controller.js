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

/**
 * Approve custody link
 * POST /v1/custody/:id/approve
 */
export const approveCustodyLink = async (req, res, next) => {
    try {
        const { id } = req.params;
        const tenantId = req.auth?.tenantId;

        if (!tenantId) {
            throw new ValidationError('Tenant ID not found in authentication context');
        }

        const custodyRecord = await custodyService.approveCustodyLink(
            id,
            tenantId,
            req.auth?.publicKey || 'unknown',
            {
                ipAddress: req.ip,
                userAgent: req.get('user-agent')
            }
        );

        res.json(custodyRecord);
    } catch (error) {
        next(error);
    }
};

/**
 * Reject custody link
 * POST /v1/custody/:id/reject
 */
export const rejectCustodyLink = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        const tenantId = req.auth?.tenantId;

        if (!tenantId) {
            throw new ValidationError('Tenant ID not found in authentication context');
        }

        const custodyRecord = await custodyService.rejectCustodyLink(
            id,
            tenantId,
            reason || 'No reason provided',
            req.auth?.publicKey || 'unknown',
            {
                ipAddress: req.ip,
                userAgent: req.get('user-agent')
            }
        );

        res.json(custodyRecord);
    } catch (error) {
        next(error);
    }
};

/**
 * DASHBOARD ENDPOINTS (JWT Authentication)
 * These endpoints are for dashboard UI use only
 */

/**
 * Link asset from dashboard
 * POST /v1/custody/dashboard/link
 */
export const linkAssetDashboard = async (req, res, next) => {
    try {
        const { assetId } = req.body;

        if (!assetId) {
            throw new ValidationError('Asset ID is required', [
                { field: 'assetId', message: 'Required field' }
            ]);
        }

        // For dashboard: user ID is both tenant and creator
        const userId = req.user.sub;

        const custodyRecord = await custodyService.linkAsset(
            assetId,
            userId, // tenantId = user's ID
            userId, // createdBy = user's ID
            `dashboard_user_${userId}`,
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
 * List custody records from dashboard
 * GET /v1/custody/dashboard
 */
export const listCustodyRecordsDashboard = async (req, res, next) => {
    try {
        const { status, limit, offset } = req.query;
        const userId = req.user.sub;

        const result = await custodyService.listCustodyRecords({
            tenantId: userId,
            endUserId: userId, // Show only user's own records
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
 * Approve custody link from dashboard
 * POST /v1/custody/dashboard/:id/approve
 */
export const approveCustodyLinkDashboard = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user.sub;

        const custodyRecord = await custodyService.approveCustodyLink(
            id,
            userId, // tenantId
            `dashboard_user_${userId}`,
            {
                ipAddress: req.ip,
                userAgent: req.get('user-agent')
            }
        );

        res.json(custodyRecord);
    } catch (error) {
        next(error);
    }
};

/**
 * Reject custody link from dashboard
 * POST /v1/custody/dashboard/:id/reject
 */
export const rejectCustodyLinkDashboard = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        const userId = req.user.sub;

        const custodyRecord = await custodyService.rejectCustodyLink(
            id,
            userId, // tenantId
            reason || 'No reason provided',
            `dashboard_user_${userId}`,
            {
                ipAddress: req.ip,
                userAgent: req.get('user-agent')
            }
        );

        res.json(custodyRecord);
    } catch (error) {
        next(error);
    }
};

export default {
    linkAsset,
    getCustodyStatus,
    listCustodyRecords,
    getStatistics,
    approveCustodyLink,
    rejectCustodyLink,
    linkAssetDashboard,
    listCustodyRecordsDashboard,
    approveCustodyLinkDashboard,
    rejectCustodyLinkDashboard
};
