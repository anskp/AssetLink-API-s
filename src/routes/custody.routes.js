import express from 'express';
import * as custodyController from '../modules/custody/custody.controller.js';
import { requirePermission } from '../modules/auth/auth.middleware.js';

/**
 * Custody Routes
 * Asset linking and custody management endpoints
 */

const router = express.Router();

// Link asset to custody (requires write permission)
router.post('/link', requirePermission('write'), custodyController.linkAsset);

// Get custody statistics (requires read permission)
router.get('/stats', requirePermission('read'), custodyController.getStatistics);

// List custody records (requires read permission)
router.get('/', requirePermission('read'), custodyController.listCustodyRecords);

// Get custody status by asset ID (requires read permission)
router.get('/:assetId', requirePermission('read'), custodyController.getCustodyStatus);

export default router;
