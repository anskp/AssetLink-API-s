import express from 'express';
import authRoutes from './auth.routes.js';
import custodyRoutes from './custody.routes.js';
import auditRoutes from './audit.routes.js';
import assetRoutes from './asset.routes.js';
import operationRoutes from './operation.routes.js';
import vaultRoutes from './vault.routes.js';
import marketplaceRoutes from './marketplace.routes.js';
import adminRoutes from './admin.routes.js';
import docsRoutes from './docs.routes.js';
import { authenticate } from '../modules/auth/auth.middleware.js';

/**
 * API Routes Index
 * Central routing for AssetLink Custody API v1
 */

const router = express.Router();

// Import route modules (will be implemented in future sprints)
// import ledgerRoutes from './ledger.routes.js';
// import marketplaceRoutes from './marketplace.routes.js';

// API info endpoint
router.get('/', (req, res) => {
    res.json({
        service: 'AssetLink Custody API',
        version: '1.0.0',
        description: 'Secure Custody Infrastructure for Tokenized Real-World Assets',
        endpoints: {
            health: '/health',
            auth: '/v1/auth',
            assets: '/v1/assets',
            tokens: '/v1/tokens',
            vaults: '/v1/vaults',
            operations: '/v1/operations',
            transfers: '/v1/transfers',
            audit: '/v1/audit'
        },
        documentation: '/openapi.yaml'
    });
});


// Mount auth routes (contains both public and protected endpoints)
router.use('/auth', authRoutes);

// Mount admin routes (admin authentication and management)
router.use('/admin', adminRoutes);

// Mount docs routes (public API documentation)
router.use('/docs', docsRoutes);

// Mount custody routes
router.use('/custody', authenticate, custodyRoutes);

// Mount asset metadata routes
router.use('/assets', authenticate, assetRoutes);

// Mount operation routes
router.use('/operations', authenticate, operationRoutes);

// Mount vault routes
router.use('/vaults', authenticate, vaultRoutes);

// Mount audit routes
router.use('/audit', authenticate, auditRoutes);

// Mount marketplace routes
router.use('/marketplace', authenticate, marketplaceRoutes);

// Mount other route modules (placeholder for future sprints)
// router.use('/ledger', authenticate, ledgerRoutes);

export default router;
