import * as operationRepository from './operation.repository.js';
import * as custodyRepository from '../custody/custody.repository.js';
import * as auditService from '../audit/audit.service.js';
import * as custodyService from '../custody/custody.service.js';
import * as fireblocksService from '../vault/fireblocks.service.js';
import * as mintService from '../token-lifecycle/mint.service.js';
import * as assetService from '../asset-linking/asset.service.js';
import * as assetRepository from '../asset-linking/asset.repository.js';
import { OperationStatus, canTransitionTo } from '../../enums/operationStatus.js';
import { OperationType } from '../../enums/operationType.js';
import { CustodyStatus } from '../../enums/custodyStatus.js';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../errors/ApiError.js';
import logger from '../../utils/logger.js';
import prisma from '../../config/db.js';

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
 * Initiate a mint operation with validation (MAKER role)
 */
export const initiateMintOperation = async (data, actor, context = {}) => {
    const { assetId, tokenSymbol, tokenName, totalSupply, decimals, blockchainId, vaultWalletId } = data;

    // Validate required parameters
    const missingFields = [];
    if (!assetId) missingFields.push('assetId');
    if (!tokenSymbol) missingFields.push('tokenSymbol');
    if (!tokenName) missingFields.push('tokenName');
    if (totalSupply === undefined || totalSupply === null) missingFields.push('totalSupply');
    if (decimals === undefined || decimals === null) missingFields.push('decimals');
    if (!blockchainId) missingFields.push('blockchainId');

    if (missingFields.length > 0) {
        throw BadRequestError(`Missing required parameters: ${missingFields.join(', ')}`);
    }

    // Find custody record by assetId
    const custodyRecord = await custodyRepository.findByAssetId(assetId);
    if (!custodyRecord) {
        throw NotFoundError(`Asset ${assetId} not found in custody`);
    }

    // Validate asset is in LINKED status
    if (custodyRecord.status !== CustodyStatus.LINKED) {
        throw BadRequestError(`Asset must be in LINKED status. Current status: ${custodyRecord.status}`);
    }

    // Check for existing pending operations to prevent concurrent conflicts
    const pending = await operationRepository.findPendingByCustodyRecord(custodyRecord.id);
    if (pending.length > 0) {
        throw BadRequestError(`Asset ${assetId} already has pending operations`);
    }

    // Create operation in PENDING_CHECKER state
    const operation = await operationRepository.createOperation({
        operationType: OperationType.MINT,
        custodyRecordId: custodyRecord.id,
        vaultWalletId,
        payload: {
            assetId,
            tokenSymbol,
            tokenName,
            totalSupply,
            decimals,
            blockchainId
        },
        initiatedBy: actor,
        status: OperationStatus.PENDING_CHECKER
    });

    // Log audit event
    await auditService.logEvent('OPERATION_CREATED', {
        operationId: operation.id,
        operationType: OperationType.MINT,
        assetId,
        tokenSymbol,
        initiatedBy: actor
    }, {
        custodyRecordId: custodyRecord.id,
        operationId: operation.id,
        actor,
        ...context
    });

    logger.info('Mint operation initiated', { 
        operationId: operation.id, 
        assetId, 
        tokenSymbol,
        initiatedBy: actor 
    });

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

    // Log audit event with checker identity
    await auditService.logEvent('OPERATION_APPROVED', {
        operationId,
        approvedBy: actor,
        checkerIdentity: actor,
        action: 'Operation approved by checker'
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
            // Get the custody record to get the assetId
            const custodyRecord = await custodyService.getCustodyRecordById(operation.custodyRecordId);

            // Map the vault ID to a numeric ID for Fireblocks (in sandbox mode)
            // In a real system, this would be a proper mapping from UUID to Fireblocks numeric ID
            const vaultWalletId = operation.vaultWalletId || operation.payload.vaultWalletId || '88';
            // If it's a UUID format, default to '88' for sandbox (standard gas vault)
            const numericVaultId = /^[0-9]+$/.test(vaultWalletId) ? vaultWalletId : '88';

            const mintData = {
                assetId: operation.payload.assetId || custodyRecord?.assetId,
                tokenSymbol: operation.payload.tokenSymbol || operation.payload.symbol,
                tokenName: operation.payload.tokenName || operation.payload.name,
                totalSupply: operation.payload.totalSupply,
                decimals: operation.payload.decimals,
                blockchainId: operation.payload.blockchainId,
                vaultWalletId: numericVaultId
            };

            console.log('DEBUG: About to call mint service with:', mintData);

            const result = await mintService.mintToken(mintData, 'SYSTEM', {
                operationId: operationId,
                custodyRecordId: operation.custodyRecordId
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

            // Create a new vault for this specific asset during asset link approval
            const vaultName = `${assetId.replace(/[^a-zA-Z0-9]/g, '_')}_VAULT_${Date.now()}`;
            const vaultResult = await fireblocksService.createUserVault(vaultName, operation.custodyRecordId);
            const fireblocksVaultId = vaultResult.vaultId;

            // Create a VaultWallet record in the database to track this vault
            const vaultWalletRecord = await prisma.vaultWallet.create({
                data: {
                    fireblocksId: fireblocksVaultId,
                    blockchain: 'ETH_TEST5', // Default blockchain, could be configurable
                    vaultType: 'CUSTODY',
                    isActive: true
                }
            });

            // 1. Update custody status from PENDING to LINKED
            await custodyService.updateCustodyStatus(
                operation.custodyRecordId,
                CustodyStatus.LINKED,
                {
                    linkedAt: new Date(),
                    vaultWalletId: vaultWalletRecord.id  // Store the database vault wallet ID, not the Fireblocks ID
                },
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
                    // The mint service handles updating custody status, so we just update operation status
                    await operationRepository.updateStatus(operationId, OperationStatus.EXECUTED, {
                        txHash,
                        completedAt: new Date()
                    });
                } else if (type === OperationType.BURN) {
                    await custodyService.updateCustodyStatus(
                        operation.custodyRecordId,
                        CustodyStatus.BURNED,
                        { txHash },
                        'SYSTEM'
                    );
                    await operationRepository.updateStatus(operationId, OperationStatus.EXECUTED, { txHash });
                } else {
                    await operationRepository.updateStatus(operationId, OperationStatus.EXECUTED, { txHash });
                }
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
    initiateMintOperation,
    approveOperation,
    rejectOperation,
    executeOperation,
    listOperations,
    getOperationDetails
};
