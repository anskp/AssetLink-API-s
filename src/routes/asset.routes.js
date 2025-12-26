import express from 'express';
import * as assetController from '../modules/asset-linking/asset.controller.js';
import { authenticate, requirePermission } from '../modules/auth/auth.middleware.js';

/**
 * Asset Routes
 * Enhanced asset linking and metadata management endpoints
 */

const router = express.Router();

// Publicly available within authenticated session
router.get('/types', assetController.getAssetTypes);
router.get('/stats/types', assetController.getAssetStatsByType);

// Search and list (Read permission)
router.get('/search', requirePermission('read'), assetController.searchAssets);
router.get('/types/:type', requirePermission('read'), assetController.getAssetsByType);

// Record management (Write/Admin permission)
router.post('/', requirePermission('write'), assetController.createAsset);
router.get('/:assetId', requirePermission('read'), assetController.getAssetDetails);
router.patch('/:assetId', requirePermission('write'), assetController.updateAsset);
router.post('/:assetId/verify', requirePermission('admin'), assetController.verifyAsset);

export default router;
