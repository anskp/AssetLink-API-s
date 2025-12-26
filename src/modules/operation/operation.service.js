import * as operationRepository from './operation.repository.js';
import * as auditService from '../audit/audit.service.js';
import * as custodyService from '../custody/custody.service.js';
import * as fireblocksService from '../vault/fireblocks.service.js';
import * as assetService from '../asset-linking/asset.service.js';
import * as assetRepository from '../asset-linking/asset.repository.js';
import { OperationStatus, canTransitionTo } from '../../enums/operationStatus.js';
import { OperationType } from '../../enums/operationType.js';
import { CustodyStatus } from '../../enums/custodyStatus.js';
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
    const custodyRecord = await custodyService.getCustodyRecordById(custodyRecordId);

    // Check for existing pending operations to prevent concurrent conflicts
    const pending = await operationRepository.findPendingByCustodyRecord(custodyRecordId);
    if (pending.length > 0) {
        throw BadRequestError(`Custody record ${custodyRecordId} already has pending operations`);
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
        throw NotFoundError(`Operation ${operationId} not found`);
    }

    // Basic Maker-Checker segregation
    if (operation.initiatedBy === actor) {
        throw ForbiddenError('Maker cannot approve their own operation');
    }

    // Check state transition
    if (!canTransitionTo(operation.status, OperationStatus.APPROVED)) {
        throw BadRequestError(`Cannot approve operation in status ${operation.status}`);
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
        throw NotFoundError(`Operation ${operationId} not found`);
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
 * Briges the approval workflow to real Fireblocks execution
 */
export const executeOperation = async (operationId, actor, context = {}) => {
    const operation = await operationRepository.findById(operationId);
    if (!operation) throw NotFoundError('Operation not found');

    try {
        let fireblocksTaskId = null;
        let txHash = null;

        // Perform real Fireblocks execution
        if (operation.operationType === OperationType.MINT) {
            const { name, symbol, decimals, totalSupply, blockchainId } = operation.payload;
            const result = await fireblocksService.issueToken(operation.vaultWalletId || 'default', {
                name: name || 'AssetToken',
                symbol: symbol || 'ATKN',
                decimals: decimals || 18,
                totalSupply: totalSupply || '1',
                blockchainId: blockchainId || 'ETH_TEST5'
            });
            fireblocksTaskId = result.tokenLinkId;
        } else if (operation.operationType === OperationType.TRANSFER) {
            const { fromVaultId, toVaultId, assetId, amount } = operation.payload;
            fireblocksTaskId = await fireblocksService.transferTokens(
                fromVaultId || operation.vaultWalletId,
                toVaultId,
                assetId,
                amount
            );
        } else if (operation.operationType === OperationType.LINK_ASSET) {
            const { assetId, ...metadata } = operation.payload;

            // 1. Update custody status from PENDING to LINKED
            await custodyService.updateCustodyStatus(
                operation.custodyRecordId,
                CustodyStatus.LINKED,
                { linkedAt: new Date() },
                'SYSTEM_GOVERNANCE',
                { operationId }
            );

            // 2. Create actual AssetMetadata
            await assetRepository.createAssetMetadata(
                operation.custodyRecordId,
                metadata
            );

            // Mark as EXECUTED immediately since no on-chain task exists for linking
            return await operationRepository.updateStatus(operationId, OperationStatus.EXECUTED, {
                executedAt: new Date()
            });
        }

        // Update status to EXECUTED (or SUBMITTED/PENDING if we want to monitor)
        // For now, we'll mark as EXECUTED once the task is created, but in production,
        // we should wait for COMPLETED via webhook or polling.
        const updated = await operationRepository.updateStatus(operationId, OperationStatus.EXECUTED, {
            fireblocksTaskId,
            executedAt: new Date()
        });

        // Start asynchronous monitoring (Fire-and-forget for demo, or use a proper worker)
        monitorExecution(operationId, fireblocksTaskId, operation.operationType);

        // Log audit event
        await auditService.logOperationExecuted(operationId, 'PENDING_ON_CHAIN', context);

        logger.info('Operation submitted to Fireblocks', { operationId, fireblocksTaskId });

        return updated;
    } catch (error) {
        logger.error('Fireblocks execution failed', { operationId, error: error.message });
        const errorMessage = error.message.includes('ENOENT') ? 'Fireblocks Secret Key Missing' : error.message;
        await auditService.logOperationFailed(operationId, { message: errorMessage }, context);
        await operationRepository.updateStatus(operationId, OperationStatus.FAILED, {
            failureReason: errorMessage
        });
        throw error;
    }
};

/**
 * Monitor Fireblocks execution status (Simple Polling Implementation)
 */
const monitorExecution = async (operationId, taskId, type) => {
    logger.info('Starting status monitoring', { operationId, taskId });

    let attempts = 0;
    const maxAttempts = 30;
    const delay = 10000; // 10 seconds

    const poll = async () => {
        try {
            const statusType = type === OperationType.MINT ? 'TOKENIZATION' : 'TRANSACTION';
            const data = await fireblocksService.monitorStatus(taskId, statusType);

            const currentStatus = type === OperationType.MINT ? data.status : data.status;
            const txHash = type === OperationType.MINT ? data.txHash : data.txHash;

            // Log granular progress for the live terminal
            if (attempts === 2) await auditService.logEvent('ON_CHAIN_SUBMISSION', { taskId }, { operationId });
            if (attempts === 5) await auditService.logEvent('BLOCK_PROPAGATION', { taskId }, { operationId });
            if (attempts === 10) await auditService.logEvent('FINALIZING_SETTLEMENT', { taskId }, { operationId });

            if (currentStatus === 'COMPLETED') {
                logger.info('Fireblocks transaction completed', { operationId, txHash });

                const operation = await operationRepository.findById(operationId);

                // Finalize Custody Record status
                if (type === OperationType.MINT) {
                    await custodyService.updateCustodyStatus(
                        operation.custodyRecordId,
                        CustodyStatus.MINTED,
                        {
                            blockchain: 'ETH_TEST5',
                            tokenId: data.tokenMetadata?.contractAddress || 'ISSUED',
                            txHash
                        },
                        'SYSTEM'
                    );
                } else if (type === OperationType.BURN) {
                    await custodyService.updateCustodyStatus(
                        operation.custodyRecordId,
                        CustodyStatus.BURNED,
                        { txHash },
                        'SYSTEM'
                    );
                }

                await operationRepository.updateStatus(operationId, OperationStatus.EXECUTED, { txHash });
                return;
            }

            if (['FAILED', 'REJECTED', 'CANCELLED'].includes(currentStatus)) {
                logger.warn('Fireblocks transaction failed', { operationId, status: currentStatus });
                const failureMsg = `Fireblocks status: ${currentStatus}`;
                await auditService.logOperationFailed(operationId, { message: failureMsg });
                await operationRepository.updateStatus(operationId, OperationStatus.FAILED, {
                    failureReason: failureMsg
                });
                return;
            }

            if (attempts < maxAttempts) {
                attempts++;
                setTimeout(poll, delay);
            } else {
                logger.error('Monitoring timeout', { operationId });
            }
        } catch (error) {
            logger.error('Polling error', { operationId, error: error.message });
        }
    };

    setTimeout(poll, delay);
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
        throw NotFoundError(`Operation ${id} not found`);
    }
    return operation;
};

export default {
    initiateOperation,
    approveOperation,
    rejectOperation,
    executeOperation,
    listOperations,
    getOperationDetails
};
