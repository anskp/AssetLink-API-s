import express from 'express';
import * as custodyController from '../modules/custody/custody.controller.js';
import { requirePermission, authenticateJwt } from '../modules/auth/auth.middleware.js';

/**
 * Custody Routes
 * Asset linking and custody management endpoints
 */

const router = express.Router();

// ============================================
// DASHBOARD ENDPOINTS (JWT Authentication)
// For use by dashboard UI only
// MUST BE DEFINED FIRST to avoid route conflicts
// ============================================

// Link asset from dashboard (JWT auth)
router.post('/dashboard/link', authenticateJwt, custodyController.linkAssetDashboard);

// Approve custody link from dashboard (JWT auth)
router.post('/dashboard/:id/approve', authenticateJwt, custodyController.approveCustodyLinkDashboard);

// Reject custody link from dashboard (JWT auth)
router.post('/dashboard/:id/reject', authenticateJwt, custodyController.rejectCustodyLinkDashboard);

// List custody records from dashboard (JWT auth)
router.get('/dashboard', authenticateJwt, custodyController.listCustodyRecordsDashboard);

// ============================================
// API ENDPOINTS (HMAC Authentication)
// For programmatic/external integrations
// ============================================

// Link asset to custody (requires write permission)
router.post('/link', requirePermission('write'), custodyController.linkAsset);

// Approve custody link (requires admin permission - CHECKER role)
router.post('/:id/approve', requirePermission('admin'), custodyController.approveCustodyLink);

// Reject custody link (requires admin permission - CHECKER role)
router.post('/:id/reject', requirePermission('admin'), custodyController.rejectCustodyLink);

// Get custody statistics (requires read permission)
router.get('/stats', requirePermission('read'), custodyController.getStatistics);

// List custody records (requires read permission)
router.get('/', requirePermission('read'), custodyController.listCustodyRecords);

// Get custody status by asset ID (requires read permission)
router.get('/:assetId', requirePermission('read'), custodyController.getCustodyStatus);

export default router;
