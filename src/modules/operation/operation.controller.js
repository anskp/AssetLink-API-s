import * as operationService from './operation.service.js';
import { ValidationError } from '../../errors/ValidationError.js';

/**
 * Operation Controller
 * Handles HTTP requests for operation lifecycle
 */

/**
 * Initiate operation
 * POST /v1/operations
 */
export const initiateOperation = async (req, res, next) => {
    try {
        const { custodyRecordId, operationType, payload } = req.body;

        if (!custodyRecordId || !operationType) {
            throw new ValidationError('Custody Record ID and Operation Type are required');
        }

        const operation = await operationService.initiateOperation(
            { custodyRecordId, operationType, payload },
            req.auth?.publicKey || 'anonymous',
            { ipAddress: req.ip, userAgent: req.get('user-agent') }
        );

        res.status(201).json(operation);
    } catch (error) {
        next(error);
    }
};

/**
 * Approve operation
 * POST /v1/operations/:id/approve
 */
export const approveOperation = async (req, res, next) => {
    try {
        const { id } = req.params;

        const result = await operationService.approveOperation(
            id,
            req.auth?.publicKey || 'anonymous',
            { ipAddress: req.ip, userAgent: req.get('user-agent') }
        );

        res.json(result);
    } catch (error) {
        next(error);
    }
};

/**
 * Reject operation
 * POST /v1/operations/:id/reject
 */
export const rejectOperation = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        const result = await operationService.rejectOperation(
            id,
            req.auth?.publicKey || 'anonymous',
            reason,
            { ipAddress: req.ip, userAgent: req.get('user-agent') }
        );

        res.json(result);
    } catch (error) {
        next(error);
    }
};

/**
 * List operations
 * GET /v1/operations
 */
export const listOperations = async (req, res, next) => {
    try {
        const { status, operationType, custodyRecordId, limit, offset } = req.query;

        const result = await operationService.listOperations({
            status,
            operationType,
            custodyRecordId,
            limit: limit ? parseInt(limit) : 50,
            offset: offset ? parseInt(offset) : 0
        });

        res.json(result);
    } catch (error) {
        next(error);
    }
};

/**
 * Get operation details
 * GET /v1/operations/:id
 */
export const getOperationDetails = async (req, res, next) => {
    try {
        const { id } = req.params;
        const operation = await operationService.getOperationDetails(id); // Need to implement in service
        res.json(operation);
    } catch (error) {
        next(error);
    }
};

export default {
    initiateOperation,
    approveOperation,
    rejectOperation,
    listOperations,
    getOperationDetails
};
