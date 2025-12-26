import express from 'express';
import * as assetController from '../modules/asset-linking/asset.controller.js';
import { authenticate, requirePermission } from '../modules/auth/auth.middleware.js';

/**
 * Asset Routes
 * Enhanced asset linking and metadata management endpoints
 */

const router = express.Router();

// Publicly available within authenticated session
router.get('/types', authenticate, assetController.getAssetTypes);
router.get('/stats/types', authenticate, assetController.getAssetStatsByType);

// Search and list (Read permission)
router.get('/search', authenticate, requirePermission('read'), assetController.searchAssets);
router.get('/types/:type', authenticate, requirePermission('read'), assetController.getAssetsByType);

// Record management (Write/Admin permission)
router.post('/', authenticate, requirePermission('write'), assetController.createAsset);
router.get('/:assetId', authenticate, requirePermission('read'), assetController.getAssetDetails);
router.patch('/:assetId', authenticate, requirePermission('write'), assetController.updateAsset);
router.post('/:assetId/verify', authenticate, requirePermission('admin'), assetController.verifyAsset);

export default router;
