import express from 'express';
import * as operationController from '../modules/operation/operation.controller.js';
import { authenticate, requirePermission, authenticateJwt } from '../modules/auth/auth.middleware.js';

/**
 * Operation Routes
 * Maker-Checker approval workflow endpoints
 */

const router = express.Router();

// ============================================
// DASHBOARD ENDPOINTS (JWT Authentication)
// MUST BE DEFINED FIRST
// ============================================

// Initiate mint operation from dashboard
router.post('/dashboard/mint', authenticateJwt, operationController.initiateMintOperationDashboard);

// Approve operation from dashboard
router.post('/dashboard/:id/approve', authenticateJwt, operationController.approveOperationDashboard);

// Reject operation from dashboard
router.post('/dashboard/:id/reject', authenticateJwt, operationController.rejectOperationDashboard);

// List operations from dashboard
router.get('/dashboard', authenticateJwt, operationController.listOperationsDashboard);

// ============================================
// API ENDPOINTS (HMAC Authentication)
// ============================================

// List and view (Read permission)
router.get('/', requirePermission('read'), operationController.listOperations);
router.get('/:id', requirePermission('read'), operationController.getOperationDetails);

// Initiate (Write permission - Maker role)
router.post('/', requirePermission('write'), operationController.initiateOperation);
router.post('/mint', requirePermission('write'), operationController.initiateMintOperation);

// Approve/Reject (Admin permission - Checker role)
router.post('/:id/approve', requirePermission('admin'), operationController.approveOperation);
router.post('/:id/reject', requirePermission('admin'), operationController.rejectOperation);

export default router;
