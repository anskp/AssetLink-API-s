import express from 'express';
import * as adminController from '../modules/admin/admin.controller.js';
import * as authController from '../modules/auth/admin.controller.js';
import { authenticateJwt, requireAdmin } from '../modules/auth/auth.middleware.js';

/**
 * Admin Routes
 * Protected routes for admin users only
 */

const router = express.Router();

// Admin login (separate from regular user login)
router.post('/login', authController.adminLogin);

// All routes below require admin authentication
router.use(authenticateJwt, requireAdmin);

// Dashboard stats
router.get('/stats', adminController.getStats);

// User management
router.get('/users', adminController.listUsers);
router.get('/users/:id', adminController.getUser);
router.patch('/users/:id/status', adminController.updateUserStatus);

// API keys (all users)
router.get('/api-keys', adminController.listAllApiKeys);

// Assets (all users)
router.get('/assets', adminController.listAllAssets);

// Audit logs
router.get('/audit-logs', adminController.getAuditLogs);

export default router;
