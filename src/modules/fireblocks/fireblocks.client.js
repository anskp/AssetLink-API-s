/**
 * Fireblocks Client Wrapper
 * Provides a clean interface for Fireblocks SDK operations
 * Handles configuration, error handling, and retry logic
 */

import { getFireblocksClient } from '../../config/fireblocks.js';
import { config } from '../../config/env.js';
import logger from '../../utils/logger.js';

/**
 * Check if Fireblocks is properly configured
 */
export const isConfigured = () => {
  const { apiKey, secretKeyPath } = config.fireblocks;
  return !!(apiKey && secretKeyPath);
};

/**
 * Retry wrapper for Fireblocks API calls
 * Implements exponential backoff for network timeouts
 */
const withRetry = async (operation, maxAttempts = 3) => {
  let lastError;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      // Check if error is retryable (network timeout, rate limit)
      const isRetryable = 
        error.code === 'ETIMEDOUT' ||
        error.code === 'ECONNRESET' ||
        error.message?.includes('timeout') ||
        error.message?.includes('rate limit');
      
      if (!isRetryable || attempt === maxAttempts) {
        throw error;
      }
      
      // Exponential backoff: 1s, 2s, 4s
      const delay = Math.pow(2, attempt - 1) * 1000;
      logger.warn(`Fireblocks API call failed, retrying in ${delay}ms`, {
        attempt,
        maxAttempts,
        error: error.message
      });
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
};

/**
 * Create a new vault account in Fireblocks
 */
export const createVault = async (vaultName, customerRefId) => {
  // Check if we should simulate (no credentials or development mode)
  if (!isConfigured()) {
    logger.warn('SIMULATION: Creating mock vault (Fireblocks not configured)');
    const mockVaultId = `mock_vault_${Date.now()}`;
    return {
      id: mockVaultId,
      name: vaultName
    };
  }
  
  const fireblocks = getFireblocksClient();
  if (!fireblocks) {
    logger.warn('SIMULATION: Creating mock vault (Fireblocks SDK not initialized)');
    const mockVaultId = `mock_vault_${Date.now()}`;
    return {
      id: mockVaultId,
      name: vaultName
    };
  }
  
  try {
    const response = await withRetry(async () => {
      return await fireblocks.vaults.createVaultAccount({
        createVaultAccountRequest: {
          name: vaultName,
          hiddenOnUI: false,
          autoFuel: true,
          customerRefId: customerRefId || undefined
        }
      });
    });
    
    logger.info('Vault created successfully', {
      vaultId: response.data.id,
      vaultName: response.data.name
    });
    
    return {
      id: response.data.id,
      name: response.data.name
    };
  } catch (error) {
    logger.error('Failed to create vault', {
      vaultName,
      error: error.message
    });
    throw new Error(`Fireblocks vault creation failed: ${error.message}`);
  }
};

/**
 * Create a wallet (asset) in a vault for a specific blockchain
 */
export const createWallet = async (vaultId, blockchain) => {
  // Check if we should simulate
  if (!isConfigured()) {
    logger.warn('SIMULATION: Creating mock wallet (Fireblocks not configured)');
    return {
      blockchain,
      address: `0xmock_${blockchain}_${vaultId.slice(-8)}`
    };
  }
  
  const fireblocks = getFireblocksClient();
  if (!fireblocks) {
    logger.warn('SIMULATION: Creating mock wallet (Fireblocks SDK not initialized)');
    return {
      blockchain,
      address: `0xmock_${blockchain}_${vaultId.slice(-8)}`
    };
  }
  
  try {
    // Create the asset in the vault
    await withRetry(async () => {
      return await fireblocks.vaults.createVaultAccountAsset({
        vaultAccountId: vaultId,
        assetId: blockchain
      });
    });
    
    // Create a deposit address for the asset
    const addressResponse = await withRetry(async () => {
      return await fireblocks.vaults.createVaultAccountAssetAddress({
        vaultAccountId: vaultId,
        assetId: blockchain,
        createAddressRequest: {
          description: `Primary ${blockchain} address`
        }
      });
    });
    
    const address = addressResponse.data.address || addressResponse.data.legacyAddress;
    
    logger.info('Wallet created successfully', {
      vaultId,
      blockchain,
      address
    });
    
    return {
      blockchain,
      address
    };
  } catch (error) {
    // If asset already exists, try to get the existing address
    if (error.message?.includes('already exists') || error.message?.includes('ASSET_ALREADY_EXISTS')) {
      try {
        const addresses = await fireblocks.vaults.getVaultAccountAssetAddressesPaginated({
          vaultAccountId: vaultId,
          assetId: blockchain
        });
        
        if (addresses.data.addresses?.length > 0) {
          const address = addresses.data.addresses[0].address;
          logger.info('Wallet already exists, returning existing address', {
            vaultId,
            blockchain,
            address
          });
          
          return {
            blockchain,
            address
          };
        }
      } catch (getError) {
        logger.error('Failed to retrieve existing wallet address', {
          vaultId,
          blockchain,
          error: getError.message
        });
      }
    }
    
    logger.error('Failed to create wallet', {
      vaultId,
      blockchain,
      error: error.message
    });
    throw new Error(`Fireblocks wallet creation failed: ${error.message}`);
  }
};

/**
 * Get vault details including all wallets
 */
export const getVaultDetails = async (vaultId) => {
  // Check if we should simulate
  if (!isConfigured()) {
    logger.warn('SIMULATION: Returning mock vault details (Fireblocks not configured)');
    return {
      id: vaultId,
      name: `Mock Vault ${vaultId}`,
      wallets: []
    };
  }
  
  const fireblocks = getFireblocksClient();
  if (!fireblocks) {
    logger.warn('SIMULATION: Returning mock vault details (Fireblocks SDK not initialized)');
    return {
      id: vaultId,
      name: `Mock Vault ${vaultId}`,
      wallets: []
    };
  }
  
  try {
    const vaultResponse = await withRetry(async () => {
      return await fireblocks.vaults.getVaultAccountById({
        vaultAccountId: vaultId
      });
    });
    
    const vault = vaultResponse.data;
    const wallets = [];
    
    // Get all assets in the vault
    if (vault.assets && vault.assets.length > 0) {
      for (const asset of vault.assets) {
        try {
          const addresses = await fireblocks.vaults.getVaultAccountAssetAddressesPaginated({
            vaultAccountId: vaultId,
            assetId: asset.id
          });
          
          if (addresses.data.addresses?.length > 0) {
            wallets.push({
              blockchain: asset.id,
              address: addresses.data.addresses[0].address,
              balance: asset.total || '0'
            });
          }
        } catch (error) {
          logger.warn('Failed to get addresses for asset', {
            vaultId,
            assetId: asset.id,
            error: error.message
          });
        }
      }
    }
    
    return {
      id: vault.id,
      name: vault.name,
      wallets
    };
  } catch (error) {
    logger.error('Failed to get vault details', {
      vaultId,
      error: error.message
    });
    throw new Error(`Failed to retrieve vault details: ${error.message}`);
  }
};

/**
 * Issue a new token (mint)
 */
export const issueToken = async (vaultId, tokenConfig) => {
  // Check if we should simulate
  if (!isConfigured()) {
    logger.warn('SIMULATION: Issuing mock token (Fireblocks not configured)');
    return {
      tokenLinkId: `mock_token_${Date.now()}`,
      status: 'COMPLETED'
    };
  }
  
  const fireblocks = getFireblocksClient();
  if (!fireblocks) {
    logger.warn('SIMULATION: Issuing mock token (Fireblocks SDK not initialized)');
    return {
      tokenLinkId: `mock_token_${Date.now()}`,
      status: 'COMPLETED'
    };
  }
  
  const { name, symbol, decimals, totalSupply, blockchainId } = tokenConfig;
  
  try {
    // Convert total supply to wei (smallest unit)
    const decimalsInt = parseInt(decimals) || 18;
    const totalSupplyWei = (BigInt(totalSupply) * BigInt(10 ** decimalsInt)).toString();
    
    const response = await withRetry(async () => {
      return await fireblocks.tokenization.createNewToken({
        createTokenRequest: {
          blockchainId: blockchainId,
          vaultAccountId: vaultId,
          createParams: {
            name,
            symbol,
            decimals: decimalsInt,
            totalSupply: totalSupplyWei
          }
        }
      });
    });
    
    logger.info('Token issuance initiated', {
      tokenLinkId: response.data.id,
      symbol,
      vaultId
    });
    
    return {
      tokenLinkId: response.data.id,
      status: response.data.status
    };
  } catch (error) {
    logger.error('Failed to issue token', {
      vaultId,
      symbol,
      error: error.message
    });
    throw new Error(`Token issuance failed: ${error.message}`);
  }
};

/**
 * Get tokenization status
 */
export const getTokenizationStatus = async (tokenLinkId) => {
  // Check if we should simulate
  if (!isConfigured()) {
    logger.warn('SIMULATION: Returning mock tokenization status (Fireblocks not configured)');
    return {
      id: tokenLinkId,
      status: 'COMPLETED',
      txHash: `0xmock_tx_${tokenLinkId.slice(-8)}`,
      tokenMetadata: {
        contractAddress: `0xmock_contract_${tokenLinkId.slice(-8)}`
      }
    };
  }
  
  const fireblocks = getFireblocksClient();
  if (!fireblocks) {
    logger.warn('SIMULATION: Returning mock tokenization status (Fireblocks SDK not initialized)');
    return {
      id: tokenLinkId,
      status: 'COMPLETED',
      txHash: `0xmock_tx_${tokenLinkId.slice(-8)}`,
      tokenMetadata: {
        contractAddress: `0xmock_contract_${tokenLinkId.slice(-8)}`
      }
    };
  }
  
  try {
    const response = await withRetry(async () => {
      return await fireblocks.tokenization.getLinkedToken({
        id: tokenLinkId
      });
    });
    
    return response.data;
  } catch (error) {
    logger.error('Failed to get tokenization status', {
      tokenLinkId,
      error: error.message
    });
    throw new Error(`Failed to get tokenization status: ${error.message}`);
  }
};

export default {
  isConfigured,
  createVault,
  createWallet,
  getVaultDetails,
  issueToken,
  getTokenizationStatus
};
