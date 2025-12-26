import * as operationRepository from './operation.repository.js';
import * as auditService from '../audit/audit.service.js';
import * as custodyService from '../custody/custody.service.js';
import { OperationStatus, canTransitionTo } from '../../enums/operationStatus.js';
import { OperationType } from '../../enums/operationType.js';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../errors/ApiError.js';
import logger from '../../utils/logger.js';

/**
 * Operation Service
 * Manages operation lifecycle, maker-checker logic, and execution
 */

/**
 * Initiate a new operation (MAKER role)
 */
export const initiateOperation = async (data, actor, context = {}) => {
    const { custodyRecordId, operationType, payload } = data;

    // Check if custody record exists
    const custodyRecord = await custodyService.getCustodyStatus(custodyRecordId); // This might need ID or assetId, assuming ID for now

    // Check for existing pending operations to prevent concurrent conflicts
    const pending = await operationRepository.findPendingByCustodyRecord(custodyRecordId);
    if (pending.length > 0) {
        throw new BadRequestError(`Custody record ${custodyRecordId} already has pending operations`);
    }

    // Create operation in PENDING_CHECKER state
    const operation = await operationRepository.createOperation({
        operationType,
        custodyRecordId,
        payload,
        initiatedBy: actor,
        status: OperationStatus.PENDING_CHECKER
    });

    // Log audit event
    await auditService.logEvent('OPERATION_CREATED', {
        operationId: operation.id,
        operationType,
        initiatedBy: actor
    }, {
        custodyRecordId,
        operationId: operation.id,
        actor,
        ...context
    });

    logger.info('Operation initiated', { operationId: operation.id, initiatedBy: actor });

    return operation;
};

/**
 * Approve an operation (CHECKER role)
 */
export const approveOperation = async (operationId, actor, context = {}) => {
    const operation = await operationRepository.findById(operationId);
    if (!operation) {
        throw new NotFoundError(`Operation ${operationId} not found`);
    }

    // Basic Maker-Checker segregation
    if (operation.initiatedBy === actor) {
        throw new ForbiddenError('Maker cannot approve their own operation');
    }

    // Check state transition
    if (!canTransitionTo(operation.status, OperationStatus.APPROVED)) {
        throw new BadRequestError(`Cannot approve operation in status ${operation.status}`);
    }

    // Update status to APPROVED
    const updated = await operationRepository.updateStatus(operationId, OperationStatus.APPROVED, {
        approvedBy: actor
    });

    // Log audit event
    await auditService.logEvent('OPERATION_APPROVED', {
        operationId,
        approvedBy: actor
    }, {
        custodyRecordId: operation.custodyRecordId,
        operationId,
        actor,
        ...context
    });

    logger.info('Operation approved', { operationId, approvedBy: actor });

    // For Sprint 4 (Mocking), we auto-execute approved operations
    return await executeOperation(operationId, actor, context);
};

/**
 * Reject an operation (CHECKER role)
 */
export const rejectOperation = async (operationId, actor, reason, context = {}) => {
    const operation = await operationRepository.findById(operationId);
    if (!operation) {
        throw new NotFoundError(`Operation ${operationId} not found`);
    }

    if (!canTransitionTo(operation.status, OperationStatus.REJECTED)) {
        throw new BadRequestError(`Cannot reject operation in status ${operation.status}`);
    }

    const updated = await operationRepository.updateStatus(operationId, OperationStatus.REJECTED, {
        rejectedBy: actor,
        rejectionReason: reason
    });

    // Log audit event
    await auditService.logEvent('OPERATION_REJECTED', {
        operationId,
        rejectedBy: actor,
        reason
    }, {
        custodyRecordId: operation.custodyRecordId,
        operationId,
        actor,
        ...context
    });

    logger.info('Operation rejected', { operationId, rejectedBy: actor });

    return updated;
};

/**
 * Execute an operation (Internal/System)
 */
export const executeOperation = async (operationId, actor, context = {}) => {
    const operation = await operationRepository.findById(operationId);

    // Update status to EXECUTED (Mock execution)
    const txHash = `0xmock${Math.random().toString(16).slice(2)}`;

    const updated = await operationRepository.updateStatus(operationId, OperationStatus.EXECUTED, {
        txHash,
        executedAt: new Date()
    });

    // Update Custody Record status based on operation type
    if (operation.operationType === OperationType.MINT) {
        await custodyService.updateCustodyStatus(
            operation.custodyRecordId,
            'MINTED',
            {
                blockchain: operation.payload.blockchain || 'ETH',
                tokenId: operation.payload.tokenId || 'MOCK-' + Date.now(),
                txHash
            },
            'SYSTEM'
        );
    } else if (operation.operationType === OperationType.BURN) {
        await custodyService.updateCustodyStatus(
            operation.custodyRecordId,
            'BURNED',
            { txHash },
            'SYSTEM'
        );
    }

    // Log audit event
    await auditService.logEvent('OPERATION_EXECUTED', {
        operationId,
        txHash
    }, {
        custodyRecordId: operation.custodyRecordId,
        operationId,
        actor: 'SYSTEM',
        ...context
    });

    logger.info('Operation executed', { operationId, txHash });

    return updated;
};

/**
 * List operations
 */
export const listOperations = async (filters) => {
    return await operationRepository.listOperations(filters);
};

/**
 * Get operation details
 */
export const getOperationDetails = async (id) => {
    const operation = await operationRepository.findById(id);
    if (!operation) {
        throw new NotFoundError(`Operation ${id} not found`);
    }
    return operation;
};

export default {
    initiateOperation,
    approveOperation,
    rejectOperation,
    executeOperation,
    listOperations
};
