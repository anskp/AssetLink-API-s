/**
 * Vault Routes
 * API endpoints for vault and wallet management
 */

import express from 'express';
import * as vaultController from '../modules/vault/vault.controller.js';

const router = express.Router();

/**
 * POST /v1/vaults
 * Create a new vault with wallets for all supported blockchains
 * 
 * Body:
 * - vaultName: string (required)
 * - customerRefId: string (optional)
 * - vaultType: string (optional, default: 'CUSTODY')
 */
router.post('/', vaultController.createVault);

/**
 * GET /v1/vaults/:vaultId
 * Get vault details including all wallets and balances
 */
router.get('/:vaultId', vaultController.getVaultDetails);

/**
 * GET /v1/vaults/:vaultId/wallets
 * List all wallets for a vault
 */
router.get('/:vaultId/wallets', vaultController.listWallets);

/**
 * GET /v1/vaults/:vaultId/wallets/:blockchain
 * Get a specific wallet by blockchain
 */
router.get('/:vaultId/wallets/:blockchain', vaultController.getWallet);

export default router;
