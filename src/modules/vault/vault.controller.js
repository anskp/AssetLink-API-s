/**
 * Vault Controller
 * Handles HTTP requests for vault management
 */

import * as vaultService from './vault.service.js';
import { ApiError } from '../../errors/ApiError.js';
import logger from '../../utils/logger.js';

/**
 * POST /v1/vaults
 * Create a new vault with wallets for all supported blockchains
 */
export const createVault = async (req, res, next) => {
  try {
    const { vaultName, customerRefId, vaultType } = req.body;
    
    // Validate required fields
    if (!vaultName) {
      throw new ApiError(400, 'vaultName is required');
    }
    
    logger.info('Creating vault', {
      vaultName,
      customerRefId,
      vaultType
    });
    
    const result = await vaultService.createVault(
      vaultName,
      customerRefId,
      vaultType || 'CUSTODY'
    );
    
    res.status(201).json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Vault creation failed', {
      error: error.message
    });
    
    if (error.message?.includes('configuration missing')) {
      next(new ApiError(500, 'Fireblocks configuration missing'));
    } else if (error.message?.includes('not initialized')) {
      next(new ApiError(500, 'Fireblocks SDK not initialized'));
    } else {
      next(error);
    }
  }
};

/**
 * GET /v1/vaults/:vaultId
 * Get vault details including all wallets and balances
 */
export const getVaultDetails = async (req, res, next) => {
  try {
    const { vaultId } = req.params;
    
    if (!vaultId) {
      throw new ApiError(400, 'vaultId is required');
    }
    
    logger.info('Getting vault details', { vaultId });
    
    const result = await vaultService.getVaultDetails(vaultId);
    
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Failed to get vault details', {
      vaultId: req.params.vaultId,
      error: error.message
    });
    
    if (error.message?.includes('not found')) {
      next(new ApiError(404, 'Vault not found'));
    } else {
      next(error);
    }
  }
};

/**
 * GET /v1/vaults/:vaultId/wallets
 * List all wallets for a vault
 */
export const listWallets = async (req, res, next) => {
  try {
    const { vaultId } = req.params;
    
    if (!vaultId) {
      throw new ApiError(400, 'vaultId is required');
    }
    
    logger.info('Listing wallets', { vaultId });
    
    const result = await vaultService.listWallets(vaultId);
    
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Failed to list wallets', {
      vaultId: req.params.vaultId,
      error: error.message
    });
    
    if (error.message?.includes('not found')) {
      next(new ApiError(404, 'Vault not found'));
    } else {
      next(error);
    }
  }
};

/**
 * GET /v1/vaults/:vaultId/wallets/:blockchain
 * Get a specific wallet by blockchain
 */
export const getWallet = async (req, res, next) => {
  try {
    const { vaultId, blockchain } = req.params;
    
    if (!vaultId || !blockchain) {
      throw new ApiError(400, 'vaultId and blockchain are required');
    }
    
    logger.info('Getting wallet', { vaultId, blockchain });
    
    const result = await vaultService.getWallet(vaultId, blockchain);
    
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Failed to get wallet', {
      vaultId: req.params.vaultId,
      blockchain: req.params.blockchain,
      error: error.message
    });
    
    if (error.message?.includes('not found')) {
      next(new ApiError(404, 'Wallet not found'));
    } else {
      next(error);
    }
  }
};

export default {
  createVault,
  getVaultDetails,
  listWallets,
  getWallet
};
