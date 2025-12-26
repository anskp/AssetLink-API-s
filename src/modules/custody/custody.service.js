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
 * Link asset to custody
 */
export const linkAsset = async (assetId, actor, context = {}) => {
    // Check if asset already exists
    const existing = await custodyRepository.findByAssetId(assetId);
    if (existing) {
        throw new ConflictError(`Asset ${assetId} is already in custody`);
    }

    // Create custody record
    const custodyRecord = await custodyRepository.createCustodyRecord(assetId);

    // Log audit event
    await auditService.logAssetLinked(
        custodyRecord.id,
        assetId,
        actor,
        context
    );

    logger.info('Asset linked to custody', { assetId, custodyRecordId: custodyRecord.id });

    return custodyRecord;
};

/**
 * Get custody status
 */
export const getCustodyStatus = async (assetId) => {
    const custodyRecord = await custodyRepository.findByAssetId(assetId);
    if (!custodyRecord) {
        throw new NotFoundError(`Asset ${assetId} not found in custody`);
    }

    return enrichCustodyRecord(custodyRecord);
};

/**
 * Get custody record by ID
 */
export const getCustodyRecordById = async (id) => {
    const custodyRecord = await custodyRepository.findById(id);
    if (!custodyRecord) {
        throw new NotFoundError('Custody record not found');
    }

    return enrichCustodyRecord(custodyRecord);
};

/**
 * Validate state transition
 */
export const validateStateTransition = (currentStatus, newStatus) => {
    if (!canTransitionTo(currentStatus, newStatus)) {
        throw new BadRequestError(
            `Invalid state transition from ${currentStatus} to ${newStatus}`
        );
    }
    return true;
};

/**
 * Update custody status
 */
export const updateCustodyStatus = async (id, newStatus, metadata, actor, context = {}) => {
    const custodyRecord = await custodyRepository.findById(id);
    if (!custodyRecord) {
        throw new NotFoundError('Custody record not found');
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
 * List custody records
 */
export const listCustodyRecords = async (filters = {}) => {
    const { records, total } = await custodyRepository.listCustodyRecords(filters);

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
    updateCustodyStatus,
    listCustodyRecords,
    getStatistics,
    enrichCustodyRecord
};
