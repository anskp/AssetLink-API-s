import express from 'express';
import * as auditRepository from '../modules/audit/audit.repository.js';
import { requirePermission } from '../modules/auth/auth.middleware.js';

/**
 * Audit Routes
 * Audit trail and compliance endpoints
 */

const router = express.Router();

/**
 * Get recent audit logs
 * GET /v1/audit/recent
 */
router.get('/recent', async (req, res, next) => {
    try {
        const { limit } = req.query;
        const logs = await auditRepository.getRecentLogs(
            limit ? parseInt(limit) : undefined
        );
        res.json({ logs, total: logs.length });
    } catch (error) {
        next(error);
    }
});

/**
 * Get audit trail for custody record
 * GET /v1/audit/custody/:id
 */
router.get('/custody/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const logs = await auditRepository.findByCustodyRecord(id);
        res.json({ logs, total: logs.length });
    } catch (error) {
        next(error);
    }
});

/**
 * Get audit trail for operation
 * GET /v1/audit/operation/:id
 */
router.get('/operation/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const logs = await auditRepository.findByOperation(id);
        res.json({ logs, total: logs.length });
    } catch (error) {
        next(error);
    }
});

/**
 * Get audit logs by event type
 * GET /v1/audit/events/:eventType
 */
router.get('/events/:eventType', async (req, res, next) => {
    try {
        const { eventType } = req.params;
        const { limit, offset } = req.query;

        const logs = await auditRepository.findByEventType(eventType, {
            limit: limit ? parseInt(limit) : undefined,
            offset: offset ? parseInt(offset) : undefined
        });

        res.json({ logs, total: logs.length });
    } catch (error) {
        next(error);
    }
});

export default router;
