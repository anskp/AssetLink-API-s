import * as auditRepository from './audit.repository.js';
import logger from '../../utils/logger.js';

/**
 * Audit Service
 * Centralized audit logging for all custody actions
 */

/**
 * Log a generic event
 */
export const logEvent = async (eventType, metadata, context = {}) => {
    try {
        const auditLog = await auditRepository.createAuditLog({
            eventType,
            actor: context.actor || 'system',
            metadata,
            custodyRecordId: context.custodyRecordId || null,
            operationId: context.operationId || null,
            ipAddress: context.ipAddress || null,
            userAgent: context.userAgent || null
        });

        logger.info(`Audit log created: ${eventType}`, { auditLogId: auditLog.id });
        return auditLog;
    } catch (error) {
        logger.error('Failed to create audit log', { eventType, error });
        throw error;
    }
};

/**
 * Log asset linked event
 */
export const logAssetLinked = async (custodyRecordId, assetId, actor, context = {}) => {
    return await logEvent('ASSET_LINKED', {
        assetId,
        action: 'Asset registered in custody'
    }, {
        custodyRecordId,
        actor,
        ...context
    });
};

/**
 * Log token minted event
 */
export const logTokenMinted = async (custodyRecordId, tokenDetails, actor, context = {}) => {
    return await logEvent('TOKEN_MINTED', {
        ...tokenDetails,
        action: 'Token minted on-chain'
    }, {
        custodyRecordId,
        actor,
        ...context
    });
};

/**
 * Log token transferred event
 */
export const logTokenTransferred = async (custodyRecordId, transferDetails, actor, context = {}) => {
    return await logEvent('TOKEN_TRANSFERRED', {
        ...transferDetails,
        action: 'Token transferred to external wallet'
    }, {
        custodyRecordId,
        actor,
        ...context
    });
};

/**
 * Log token burned event
 */
export const logTokenBurned = async (custodyRecordId, burnDetails, actor, context = {}) => {
    return await logEvent('TOKEN_BURNED', {
        ...burnDetails,
        action: 'Token burned (physical redemption)'
    }, {
        custodyRecordId,
        actor,
        ...context
    });
};

/**
 * Log operation created event
 */
export const logOperationCreated = async (operationId, operationType, payload, actor, context = {}) => {
    return await logEvent('OPERATION_CREATED', {
        operationType,
        payload,
        action: 'Operation initiated'
    }, {
        operationId,
        actor,
        ...context
    });
};

/**
 * Log operation submitted event
 */
export const logOperationSubmitted = async (operationId, maker, context = {}) => {
    return await logEvent('OPERATION_SUBMITTED', {
        maker,
        action: 'Operation submitted for approval'
    }, {
        operationId,
        actor: maker,
        ...context
    });
};

/**
 * Log operation approved event
 */
export const logOperationApproved = async (operationId, checker, context = {}) => {
    return await logEvent('OPERATION_APPROVED', {
        checker,
        action: 'Operation approved by checker'
    }, {
        operationId,
        actor: checker,
        ...context
    });
};

/**
 * Log operation rejected event
 */
export const logOperationRejected = async (operationId, checker, reason, context = {}) => {
    return await logEvent('OPERATION_REJECTED', {
        checker,
        reason,
        action: 'Operation rejected by checker'
    }, {
        operationId,
        actor: checker,
        ...context
    });
};

/**
 * Log operation executed event
 */
export const logOperationExecuted = async (operationId, txHash, context = {}) => {
    return await logEvent('OPERATION_EXECUTED', {
        txHash,
        action: 'Operation executed on-chain'
    }, {
        operationId,
        actor: 'system',
        ...context
    });
};

/**
 * Log operation failed event
 */
export const logOperationFailed = async (operationId, error, context = {}) => {
    return await logEvent('OPERATION_FAILED', {
        error: error.message,
        action: 'Operation execution failed'
    }, {
        operationId,
        actor: 'system',
        ...context
    });
};

export default {
    logEvent,
    logAssetLinked,
    logTokenMinted,
    logTokenTransferred,
    logTokenBurned,
    logOperationCreated,
    logOperationSubmitted,
    logOperationApproved,
    logOperationRejected,
    logOperationExecuted,
    logOperationFailed
};
