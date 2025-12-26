/**
 * Vault Service
 * Manages vault and wallet creation, storage, and retrieval
 * Integrates Fireblocks with database persistence
 */

import * as fireblocksClient from '../fireblocks/fireblocks.client.js';
import * as auditService from '../audit/audit.service.js';
import prisma from '../../config/db.js';
import logger from '../../utils/logger.js';

/**
 * Supported blockchains for wallet generation
 */
const SUPPORTED_BLOCKCHAINS = [
  'ETH_TEST5',      // Ethereum Sepolia testnet
  'MATIC_MUMBAI',   // Polygon Mumbai testnet
  'ETH',            // Ethereum mainnet
  'MATIC'           // Polygon mainnet
];

/**
 * Create a new vault with wallets for all supported blockchains
 */
export const createVault = async (vaultName, customerRefId, vaultType = 'CUSTODY') => {
  try {
    // Create vault in Fireblocks
    const fireblocksVault = await fireblocksClient.createVault(vaultName, customerRefId);
    
    logger.info('Fireblocks vault created, generating wallets', {
      fireblocksVaultId: fireblocksVault.id,
      vaultName: fireblocksVault.name
    });
    
    // Generate wallets for all supported blockchains
    const wallets = [];
    const errors = [];
    
    for (const blockchain of SUPPORTED_BLOCKCHAINS) {
      try {
        const wallet = await fireblocksClient.createWallet(fireblocksVault.id, blockchain);
        wallets.push({
          blockchain: wallet.blockchain,
          address: wallet.address
        });
        
        logger.info('Wallet generated', {
          blockchain: wallet.blockchain,
          address: wallet.address
        });
      } catch (error) {
        logger.error('Failed to generate wallet', {
          blockchain,
          error: error.message
        });
        errors.push({
          blockchain,
          error: error.message
        });
      }
    }
    
    // Store vault and wallets in database
    const vaultWallets = [];
    
    for (const wallet of wallets) {
      const vaultWallet = await prisma.vaultWallet.create({
        data: {
          fireblocksId: fireblocksVault.id,
          blockchain: wallet.blockchain,
          address: wallet.address,
          vaultType: vaultType,
          isActive: true
        }
      });
      
      vaultWallets.push({
        id: vaultWallet.id,
        fireblocksId: vaultWallet.fireblocksId,
        blockchain: vaultWallet.blockchain,
        address: vaultWallet.address,
        vaultType: vaultWallet.vaultType,
        isActive: vaultWallet.isActive,
        createdAt: vaultWallet.createdAt
      });
    }
    
    logger.info('Vault and wallets stored in database', {
      vaultId: fireblocksVault.id,
      walletsCreated: vaultWallets.length,
      errors: errors.length
    });
    
    return {
      vaultId: fireblocksVault.id,
      vaultName: fireblocksVault.name,
      wallets: vaultWallets,
      errors: errors.length > 0 ? errors : undefined
    };
  } catch (error) {
    logger.error('Failed to create vault', {
      vaultName,
      error: error.message
    });
    
    // Log vault creation error to audit system
    try {
      await auditService.logEvent('VAULT_CREATION_FAILED', {
        vaultName,
        customerRefId,
        error: error.message,
        action: 'Vault creation failed'
      }, {
        actor: 'system'
      });
    } catch (auditError) {
      logger.error('Failed to log vault creation error to audit', {
        error: auditError.message
      });
    }
    
    throw error;
  }
};

/**
 * Get vault details including all wallets
 */
export const getVaultDetails = async (vaultId) => {
  try {
    // Get vault wallets from database
    const vaultWallets = await prisma.vaultWallet.findMany({
      where: {
        fireblocksId: vaultId,
        isActive: true
      },
      orderBy: {
        blockchain: 'asc'
      }
    });
    
    if (vaultWallets.length === 0) {
      throw new Error('Vault not found');
    }
    
    // Get live data from Fireblocks
    const fireblocksVault = await fireblocksClient.getVaultDetails(vaultId);
    
    // Merge database records with Fireblocks data
    const wallets = vaultWallets.map(dbWallet => {
      const fbWallet = fireblocksVault.wallets.find(
        w => w.blockchain === dbWallet.blockchain
      );
      
      return {
        id: dbWallet.id,
        blockchain: dbWallet.blockchain,
        address: dbWallet.address || fbWallet?.address || null,
        balance: fbWallet?.balance || '0',
        vaultType: dbWallet.vaultType,
        isActive: dbWallet.isActive,
        createdAt: dbWallet.createdAt
      };
    });
    
    return {
      vaultId: fireblocksVault.id,
      vaultName: fireblocksVault.name,
      wallets
    };
  } catch (error) {
    logger.error('Failed to get vault details', {
      vaultId,
      error: error.message
    });
    throw error;
  }
};

/**
 * List all wallets for a vault
 */
export const listWallets = async (vaultId) => {
  try {
    const vaultWallets = await prisma.vaultWallet.findMany({
      where: {
        fireblocksId: vaultId,
        isActive: true
      },
      orderBy: {
        blockchain: 'asc'
      }
    });
    
    if (vaultWallets.length === 0) {
      throw new Error('Vault not found');
    }
    
    // Get live balances from Fireblocks
    const fireblocksVault = await fireblocksClient.getVaultDetails(vaultId);
    
    const wallets = vaultWallets.map(dbWallet => {
      const fbWallet = fireblocksVault.wallets.find(
        w => w.blockchain === dbWallet.blockchain
      );
      
      return {
        blockchain: dbWallet.blockchain,
        address: dbWallet.address || fbWallet?.address || null,
        balance: fbWallet?.balance || '0'
      };
    });
    
    return { wallets };
  } catch (error) {
    logger.error('Failed to list wallets', {
      vaultId,
      error: error.message
    });
    throw error;
  }
};

/**
 * Get a specific wallet by vault ID and blockchain
 */
export const getWallet = async (vaultId, blockchain) => {
  try {
    const vaultWallet = await prisma.vaultWallet.findFirst({
      where: {
        fireblocksId: vaultId,
        blockchain: blockchain,
        isActive: true
      }
    });
    
    if (!vaultWallet) {
      throw new Error('Wallet not found');
    }
    
    // Get live data from Fireblocks
    const fireblocksVault = await fireblocksClient.getVaultDetails(vaultId);
    const fbWallet = fireblocksVault.wallets.find(w => w.blockchain === blockchain);
    
    return {
      id: vaultWallet.id,
      blockchain: vaultWallet.blockchain,
      address: vaultWallet.address || fbWallet?.address || null,
      balance: fbWallet?.balance || '0',
      vaultType: vaultWallet.vaultType,
      isActive: vaultWallet.isActive,
      createdAt: vaultWallet.createdAt
    };
  } catch (error) {
    logger.error('Failed to get wallet', {
      vaultId,
      blockchain,
      error: error.message
    });
    throw error;
  }
};

export default {
  createVault,
  getVaultDetails,
  listWallets,
  getWallet,
  SUPPORTED_BLOCKCHAINS
};
