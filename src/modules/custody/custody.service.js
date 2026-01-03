import * as custodyRepository from './custody.repository.js';
import * as auditService from '../audit/audit.service.js';
import { CustodyStatus, canTransitionTo } from '../../enums/custodyStatus.js';
import { ConflictError, NotFoundError, BadRequestError } from '../../errors/ApiError.js';
import logger from '../../utils/logger.js';

/**
 * Custody Service
 * Business logic for custody operations
 */

/**
 * Link asset to custody with two-level isolation
 * @param {string} assetId - Asset identifier
 * @param {string} tenantId - Platform owner (from API key)
 * @param {string} createdBy - End user who created the asset (from X-USER-ID header)
 * @param {string} actor - API key used
 * @param {object} context - Additional context
 */
export const linkAsset = async (assetId, tenantId, createdBy, actor, context = {}) => {
    // Check if asset already exists
    const existing = await custodyRepository.findByAssetId(assetId);
    if (existing) {
        throw ConflictError(`Asset ${assetId} is already in custody`);
    }

    // Create custody record with two-level isolation (PENDING status - awaiting approval)
    const custodyRecord = await custodyRepository.createCustodyRecord(
        assetId, 
        tenantId, 
        createdBy, 
        CustodyStatus.PENDING
    );

    // Log audit event
    await auditService.logAssetLinked(
        custodyRecord.id,
        assetId,
        actor,
        { ...context, tenantId, createdBy }
    );

    logger.info('Asset linked to custody', { 
        assetId, 
        tenantId, 
        createdBy, 
        custodyRecordId: custodyRecord.id 
    });

    return custodyRecord;
};

/**
 * Get custody status with two-level isolation
 * @param {string} assetId - Asset identifier
 * @param {string} tenantId - Platform owner (required)
 * @param {string} endUserId - End user (optional, if provided filters to their assets only)
 */
export const getCustodyStatus = async (assetId, tenantId, endUserId = null) => {
    const custodyRecord = await custodyRepository.findByAssetId(assetId);
    if (!custodyRecord) {
        throw NotFoundError(`Asset ${assetId} not found in custody`);
    }

    // Two-level isolation check
    if (custodyRecord.tenantId !== tenantId) {
        throw NotFoundError(`Asset ${assetId} not found in custody`);
    }

    // If endUserId is provided, verify it matches (end user can only see their own)
    if (endUserId && custodyRecord.createdBy !== endUserId) {
        throw NotFoundError(`Asset ${assetId} not found in custody`);
    }

    return enrichCustodyRecord(custodyRecord);
};

/**
 * Get custody record by ID
 */
export const getCustodyRecordById = async (id) => {
    const custodyRecord = await custodyRepository.findById(id);
    if (!custodyRecord) {
        throw NotFoundError('Custody record not found');
    }

    return enrichCustodyRecord(custodyRecord);
};

/**
 * Validate state transition
 */
export const validateStateTransition = (currentStatus, newStatus) => {
    if (!canTransitionTo(currentStatus, newStatus)) {
        throw BadRequestError(
            `Invalid state transition from ${currentStatus} to ${newStatus}`
        );
    }
    return true;
};

/**
 * Approve custody link (PENDING -> LINKED)
 * @param {string} id - Custody record ID
 * @param {string} tenantId - Platform owner (for authorization)
 * @param {string} actor - User/API key approving
 * @param {object} context - Additional context
 */
export const approveCustodyLink = async (id, tenantId, actor, context = {}) => {
    const custodyRecord = await custodyRepository.findById(id);
    if (!custodyRecord) {
        throw NotFoundError('Custody record not found');
    }

    // Verify tenant ownership
    if (custodyRecord.tenantId !== tenantId) {
        throw NotFoundError('Custody record not found');
    }

    // Verify status is PENDING
    if (custodyRecord.status !== CustodyStatus.PENDING) {
        throw BadRequestError(`Cannot approve custody record with status ${custodyRecord.status}`);
    }

    // Import required services
    const fireblocksService = await import('../vault/fireblocks.service.js');
    const prisma = (await import('../../config/db.js')).default;

    // Create a new Fireblocks vault for this asset
    const vaultName = `${custodyRecord.assetId.replace(/[^a-zA-Z0-9]/g, '_')}_VAULT_${Date.now()}`;
    const vaultResult = await fireblocksService.createUserVault(vaultName, id);
    const fireblocksVaultId = vaultResult.vaultId;

    // Get wallet address for ETH_TEST5
    const walletAddress = await fireblocksService.getWalletAddress(fireblocksVaultId, 'ETH_TEST5');

    // Create a VaultWallet record in the database to track this vault with address
    const vaultWalletRecord = await prisma.vaultWallet.create({
        data: {
            fireblocksId: fireblocksVaultId,
            blockchain: 'ETH_TEST5', // Default blockchain
            address: walletAddress, // Store the wallet address
            vaultType: 'CUSTODY',
            isActive: true
        }
    });

    // Update to LINKED status with vault information
    const updated = await custodyRepository.updateStatus(id, CustodyStatus.LINKED, {
        linkedAt: new Date(),
        vaultWalletId: vaultWalletRecord.id
    });

    // Log audit event
    await auditService.logEvent('CUSTODY_APPROVED', {
        assetId: custodyRecord.assetId,
        vaultId: fireblocksVaultId,
        walletAddress: walletAddress
    }, {
        custodyRecordId: id,
        actor,
        ...context
    });

    logger.info('Custody link approved with Fireblocks vault', { 
        custodyRecordId: id, 
        assetId: custodyRecord.assetId,
        tenantId,
        actor,
        vaultId: fireblocksVaultId,
        walletAddress
    });

    return enrichCustodyRecord(updated);
};

/**
 * Reject custody link (PENDING -> UNLINKED)
 * @param {string} id - Custody record ID
 * @param {string} tenantId - Platform owner (for authorization)
 * @param {string} reason - Rejection reason
 * @param {string} actor - User/API key rejecting
 * @param {object} context - Additional context
 */
export const rejectCustodyLink = async (id, tenantId, reason, actor, context = {}) => {
    const custodyRecord = await custodyRepository.findById(id);
    if (!custodyRecord) {
        throw NotFoundError('Custody record not found');
    }

    // Verify tenant ownership
    if (custodyRecord.tenantId !== tenantId) {
        throw NotFoundError('Custody record not found');
    }

    // Verify status is PENDING
    if (custodyRecord.status !== CustodyStatus.PENDING) {
        throw BadRequestError(`Cannot reject custody record with status ${custodyRecord.status}`);
    }

    // Update to UNLINKED status (or delete the record)
    const updated = await custodyRepository.updateStatus(id, CustodyStatus.UNLINKED, {
        rejectionReason: reason
    });

    // Log audit event
    await auditService.logEvent('CUSTODY_REJECTED', {
        assetId: custodyRecord.assetId,
        reason
    }, {
        custodyRecordId: id,
        actor,
        ...context
    });

    logger.info('Custody link rejected', { 
        custodyRecordId: id, 
        assetId: custodyRecord.assetId,
        tenantId,
        actor,
        reason
    });

    return enrichCustodyRecord(updated);
};

/**
 * Update custody status
 */
export const updateCustodyStatus = async (id, newStatus, metadata, actor, context = {}) => {
    const custodyRecord = await custodyRepository.findById(id);
    if (!custodyRecord) {
        throw NotFoundError('Custody record not found');
    }

    // Validate transition
    validateStateTransition(custodyRecord.status, newStatus);

    // Update status
    const updated = await custodyRepository.updateStatus(id, newStatus, metadata);

    // Log appropriate audit event
    if (newStatus === CustodyStatus.MINTED) {
        await auditService.logTokenMinted(id, metadata, actor, context);
    } else if (newStatus === CustodyStatus.WITHDRAWN) {
        await auditService.logTokenTransferred(id, metadata, actor, context);
    } else if (newStatus === CustodyStatus.BURNED) {
        await auditService.logTokenBurned(id, metadata, actor, context);
    }

    return enrichCustodyRecord(updated);
};

/**
 * List custody records with two-level isolation
 * @param {object} filters - Filter options
 * @param {string} filters.tenantId - Platform owner (required)
 * @param {string} filters.endUserId - End user (optional, filters to their assets only)
 */
export const listCustodyRecords = async (filters = {}) => {
    const { tenantId, endUserId, ...otherFilters } = filters;

    // Build filter object with two-level isolation
    const queryFilters = { tenantId, ...otherFilters };

    // If endUserId is provided, filter by it (end user sees only their own)
    if (endUserId) {
        queryFilters.createdBy = endUserId;
    }
    // Otherwise, platform owner sees all records for their tenant

    const { records, total } = await custodyRepository.listCustodyRecords(queryFilters);

    return {
        records: records.map(enrichCustodyRecord),
        total,
        limit: filters.limit || 50,
        offset: filters.offset || 0
    };
};

/**
 * Get custody statistics
 */
export const getStatistics = async () => {
    return await custodyRepository.getStatistics();
};

/**
 * Enrich custody record with computed fields
 */
export const enrichCustodyRecord = (record) => {
    if (!record) return null;

    return {
        ...record,
        isActive: [CustodyStatus.LINKED, CustodyStatus.MINTED].includes(record.status),
        hasToken: record.tokenAddress && record.tokenId,
        daysInCustody: record.linkedAt
            ? Math.floor((Date.now() - new Date(record.linkedAt).getTime()) / (1000 * 60 * 60 * 24))
            : 0
    };
};

export default {
    linkAsset,
    getCustodyStatus,
    getCustodyRecordById,
    validateStateTransition,
    approveCustodyLink,
    rejectCustodyLink,
    updateCustodyStatus,
    listCustodyRecords,
    getStatistics,
    enrichCustodyRecord
};
