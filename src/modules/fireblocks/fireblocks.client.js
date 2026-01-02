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
    // Use manual HTTPS request to avoid authentication issues with SDK
    const vaultResponse = await withRetry(async () => {
      return await fireblocksRequest(`/v1/vault/accounts/${vaultId}`, 'GET', null);
    });

    const vault = vaultResponse.data;
    const wallets = [];

    // Get all assets in the vault
    if (vault.assets && vault.assets.length > 0) {
      for (const asset of vault.assets) {
        try {
          const addressesResponse = await fireblocksRequest(`/v1/vault/accounts/${vaultId}/assets/${asset.id}/addresses`, 'GET', null);

          if (addressesResponse.data.addresses?.length > 0) {
            wallets.push({
              blockchain: asset.id,
              address: addressesResponse.data.addresses[0].address,
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
 * Manual HTTPS request to Fireblocks
 */
async function fireblocksRequest(path, method, payload) {
  const fs = await import('fs');
  const crypto = await import('crypto');

  const { apiKey, secretKeyPath, baseUrl } = config.fireblocks;
  const secretKey = fs.readFileSync(secretKeyPath, 'utf8');

  // For GET requests, payload is null, so we use an empty string for bodyHash
  const data = payload ? JSON.stringify(payload) : '';
  const token = {
    uri: path,
    nonce: crypto.randomBytes(16).toString('hex'),
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 55,
    sub: apiKey,
    bodyHash: payload ? crypto.createHash('sha256').update(data).digest('hex') : crypto.createHash('sha256').update('').digest('hex')
  };

  const header = { alg: 'RS256', typ: 'JWT' };
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encodedPayload = Buffer.from(JSON.stringify(token)).toString('base64url');
  const signature = crypto.sign('RSA-SHA256', Buffer.from(`${encodedHeader}.${encodedPayload}`), {
    key: secretKey,
    padding: crypto.constants.RSA_PKCS1_PADDING
  }).toString('base64url');

  const jwt = `${encodedHeader}.${encodedPayload}.${signature}`;
  const url = new URL(baseUrl);
  const hostname = url.hostname;

  const https = await import('https');

  const options = {
    hostname,
    path,
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey,
      'Authorization': `Bearer ${jwt}`
    }
  };

  // Only add Content-Length and body for non-GET methods
  if (method !== 'GET') {
    options.headers['Content-Length'] = data.length;
  }

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => { responseData += chunk; });
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(responseData);
          if (res.statusCode >= 400) {
            reject(new Error(parsedData.message || `Fireblocks API Error: ${res.statusCode}`));
          } else {
            resolve({ data: parsedData, statusCode: res.statusCode });
          }
        } catch (e) {
          resolve({ data: responseData, statusCode: res.statusCode });
        }
      });
    });

    req.on('error', (error) => {
      logger.error('HTTPS Request Error', { error: error.message });
      reject(error);
    });

    // Only write body for non-GET methods
    if (method !== 'GET') {
      req.write(data);
    }
    req.end();
  });
}

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

  const { name, symbol, decimals, totalSupply, blockchainId, contractId } = tokenConfig;

  try {
    // Convert total supply to wei (smallest unit)
    const decimalsInt = parseInt(decimals) || 18;
    const totalSupplyWei = (BigInt(totalSupply) * BigInt(10 ** decimalsInt)).toString();

    // Use manual HTTPS request like in the working copym-mono project
    const payload = {
      blockchainId: blockchainId,
      assetId: blockchainId,
      vaultAccountId: vaultId.toString(), // Ensure it's a string
      createParams: {
        contractId: contractId || config.fireblocks.contractTemplateId || process.env.FIREBLOCKS_CONTRACT_TEMPLATE_ID || 'd39ba6d0-f738-4fab-ae00-874213375b5c',
        deployFunctionParams: [
          { name: 'name', type: 'string', value: name },
          { name: 'symbol', type: 'string', value: symbol },
          { name: 'decimals', type: 'uint8', value: String(decimalsInt) },
          { name: 'totalSupply', type: 'uint256', value: totalSupplyWei }
        ]
      },
      displayName: name,
      useGasless: false,
      feeLevel: 'MEDIUM'
    };

    logger.info('Creating token on Fireblocks (Manual API)...', { symbol, vaultId });

    // Use manual HTTPS request like in the copym-mono project
    const result = await makeFireblocksRequest('/v1/tokenization/tokens', 'POST', payload);

    // Log actual Fireblocks response to console for external API users
    console.log('\n🔥 FIREBLOCKS RESPONSE:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(JSON.stringify(result, null, 2));
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    logger.info('Token issuance initiated', { tokenLinkId: result.id, symbol, vaultId });

    return {
      tokenLinkId: result.id,
      status: result.status
    };
  } catch (error) {
    logger.error('Failed to issue token (Manual API)', {
      vaultId,
      symbol,
      error: error.message
    });
    throw new Error(`Token issuance failed: ${error.message}`);
  }
};

/**
 * Make manual Fireblocks API request
 */
const makeFireblocksRequest = async (path, method, payload) => {
  const fs = await import('fs');
  const crypto = await import('crypto');

  const { apiKey, secretKeyPath, baseUrl } = config.fireblocks;
  const secretKey = fs.readFileSync(secretKeyPath, 'utf8');

  // For GET requests, payload is null, so we use an empty string for bodyHash
  const data = payload ? JSON.stringify(payload) : '';
  const token = {
    uri: path,
    nonce: crypto.randomBytes(16).toString('hex'),
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 55,
    sub: apiKey,
    bodyHash: payload ? crypto.createHash('sha256').update(data).digest('hex') : crypto.createHash('sha256').update('').digest('hex')
  };

  const header = { alg: 'RS256', typ: 'JWT' };
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encodedPayload = Buffer.from(JSON.stringify(token)).toString('base64url');
  const signature = crypto.sign('RSA-SHA256', Buffer.from(`${encodedHeader}.${encodedPayload}`), {
    key: secretKey,
    padding: crypto.constants.RSA_PKCS1_PADDING
  }).toString('base64url');

  const jwt = `${encodedHeader}.${encodedPayload}.${signature}`;
  const url = new URL(baseUrl);
  const hostname = url.hostname;

  const https = await import('https');

  const options = {
    hostname,
    path,
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey,
      'Authorization': `Bearer ${jwt}`
    }
  };

  // Only add Content-Length and body for non-GET methods
  if (method !== 'GET') {
    options.headers['Content-Length'] = data.length;
  }

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => { responseData += chunk; });
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(responseData);
          if (res.statusCode >= 400) {
            reject(new Error(parsedData.message || `Fireblocks API Error: ${res.statusCode}`));
          } else {
            resolve(parsedData);
          }
        } catch (e) {
          resolve(responseData);
        }
      });
    });

    req.on('error', (error) => {
      logger.error('HTTPS Request Error', { error: error.message });
      reject(error);
    });

    // Only write body for non-GET methods
    if (method !== 'GET') {
      req.write(data);
    }
    req.end();
  });
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
    // Use manual HTTPS request for getting tokenization status
    const result = await makeFireblocksRequest(`/v1/tokenization/tokens/${tokenLinkId}`, 'GET', null);
    return result;
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
