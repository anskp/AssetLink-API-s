import express from 'express';
import * as operationController from '../modules/operation/operation.controller.js';
import { authenticate, requirePermission } from '../modules/auth/auth.middleware.js';

/**
 * Operation Routes
 * Maker-Checker approval workflow endpoints
 */

const router = express.Router();

// List and view (Read permission)
router.get('/', authenticate, requirePermission('read'), operationController.listOperations);
router.get('/:id', authenticate, requirePermission('read'), operationController.getOperationDetails);

// Initiate (Write permission - Maker role)
router.post('/', authenticate, requirePermission('write'), operationController.initiateOperation);

// Approve/Reject (Admin permission - Checker role)
router.post('/:id/approve', authenticate, requirePermission('admin'), operationController.approveOperation);
router.post('/:id/reject', authenticate, requirePermission('admin'), operationController.rejectOperation);

export default router;
