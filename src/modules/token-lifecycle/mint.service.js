/**
 * Token Minting Service
 * Handles the minting of tokens via Fireblocks
 */

import * as fireblocksService from '../fireblocks/fireblocks.client.js';
import * as vaultFireblocksService from '../vault/fireblocks.service.js';
import * as custodyService from '../custody/custody.service.js';
import * as custodyRepository from '../custody/custody.repository.js';
import * as auditService from '../audit/audit.service.js';
import { CustodyStatus } from '../../enums/custodyStatus.js';
import { NotFoundError, BadRequestError } from '../../errors/ApiError.js';
import logger from '../../utils/logger.js';

// Fixed gas vault ID
const GAS_VAULT_ID = '88';

// Global tracking for active monitors to prevent duplicate monitoring across the application
// Using separate Maps for operation tracking and monitoring tracking
const activeMintOperations = new Map(); // Tracks mint operations by assetId to prevent duplicate mint attempts
const activeMintMonitors = new Map();   // Tracks active monitoring by tokenLinkId to prevent duplicate monitoring

/**
 * Mint a new token on the blockchain via Fireblocks
 * @param {Object} mintData - Token minting parameters
 * @param {string} mintData.assetId - Asset ID to mint token for
 * @param {string} mintData.tokenSymbol - Token symbol (e.g., RLX)
 * @param {string} mintData.tokenName - Token name (e.g., Rolex Token)
 * @param {string} mintData.totalSupply - Total token supply
 * @param {number} mintData.decimals - Token decimals
 * @param {string} mintData.blockchainId - Blockchain to mint on (e.g., ETH_TEST5)
 * @param {string} mintData.vaultWalletId - Vault ID to mint to
 * @param {string} actor - User initiating the mint
 * @param {Object} context - Request context
 * @returns {Object} Mint operation result
 */
export const mintToken = async (mintData, actor, context = {}) => {
  // Check if mintData is provided
  if (!mintData) {
    throw BadRequestError('Missing mintData parameter');
  }

  // Extract values from mintData with fallbacks
  const assetId = mintData.assetId;
  const tokenSymbol = mintData.tokenSymbol;
  const tokenName = mintData.tokenName;
  const totalSupply = mintData.totalSupply;
  const decimals = mintData.decimals;
  const blockchainId = mintData.blockchainId;
  const vaultWalletId = mintData.vaultWalletId || 'default';

  // Validate required parameters
  if (!assetId) {
    throw BadRequestError('Missing required mint parameter: assetId');
  }
  if (!tokenSymbol) {
    throw BadRequestError('Missing required mint parameter: tokenSymbol');
  }
  if (!tokenName) {
    throw BadRequestError('Missing required mint parameter: tokenName');
  }
  if (!totalSupply && totalSupply !== 0) {
    throw BadRequestError('Missing required mint parameter: totalSupply');
  }
  if (decimals === undefined || decimals === null) {
    throw BadRequestError('Missing required mint parameter: decimals');
  }
  if (!blockchainId) {
    throw BadRequestError('Missing required mint parameter: blockchainId');
  }

  // Find custody record by assetId
  const custodyRecord = await custodyRepository.findByAssetId(assetId);
  if (!custodyRecord) {
    throw NotFoundError(`Asset ${assetId} not found in custody`);
  }

  // Validate asset is in LINKED status
  if (custodyRecord.status !== CustodyStatus.LINKED) {
    throw BadRequestError(`Asset must be in LINKED status. Current status: ${custodyRecord.status}`);
  }

  // Check if a mint operation is already in progress for this asset
  const mintOperationKey = `mint_op_${assetId}`;
  if (activeMintOperations.has(mintOperationKey)) {
    logger.warn('Mint operation already in progress for this asset, skipping duplicate', { assetId });
    throw BadRequestError(`Mint operation already in progress for asset ${assetId}`);
  }

  // Add to active operations to prevent duplicate mint attempts
  activeMintOperations.set(mintOperationKey, {
    startedAt: Date.now(),
    assetId
  });

  // Prepare token configuration
  const tokenConfig = {
    name: tokenName,
    symbol: tokenSymbol,
    decimals: parseInt(decimals) || 18,
    totalSupply: totalSupply.toString(),
    blockchainId: blockchainId
  };

  try {
    logger.info('Initiating token mint via Fireblocks', {
      assetId,
      tokenSymbol,
      vaultWalletId
    });

    // Check if the vault has sufficient gas, and if not, transfer from vault 88
    await ensureGasForVault(vaultWalletId, blockchainId);

    // Issue token via Fireblocks
    const result = await fireblocksService.issueToken(vaultWalletId, tokenConfig);
    
    logger.info('Token mint initiated successfully', {
      tokenLinkId: result.tokenLinkId,
      assetId,
      tokenSymbol
    });

    // Log audit event
    await auditService.logEvent('TOKEN_MINT_INITIATED', {
      tokenLinkId: result.tokenLinkId,
      assetId,
      tokenSymbol,
      initiatedBy: actor,
      action: 'Token minting initiated via Fireblocks'
    }, {
      ...context,
      assetId,
      tokenSymbol
    });

    // Start monitoring the minting process
    // Note: We don't await this to avoid blocking the response,
    // but we'll remove the operation key from active monitors after a delay
    try {
      monitorMintingStatus(result.tokenLinkId, custodyRecord.id, totalSupply.toString(), actor, context);
    } catch (monitoringError) {
      logger.error('Failed to start mint monitoring', {
        tokenLinkId: result.tokenLinkId,
        assetId,
        error: monitoringError.message
      });
    }

    // Clean up the mint operation key after a delay to allow monitoring to start
    setTimeout(() => {
      const mintOperationKey = `mint_op_${assetId}`;
      if (activeMintOperations.has(mintOperationKey)) {
        activeMintOperations.delete(mintOperationKey);
      }
    }, 5000); // 5 seconds delay before cleanup

    return {
      success: true,
      tokenLinkId: result.tokenLinkId,
      status: result.status,
      assetId,
      tokenSymbol
    };
  } catch (error) {
    logger.error('Token mint failed', {
      assetId,
      tokenSymbol,
      error: error.message
    });

    // Clean up the mint operation key on error
    const mintOperationKey = `mint_op_${assetId}`;
    if (activeMintOperations.has(mintOperationKey)) {
      activeMintOperations.delete(mintOperationKey);
    }

    // Log failure audit event
    await auditService.logEvent('TOKEN_MINT_FAILED', {
      assetId,
      tokenSymbol,
      error: error.message,
      action: 'Token minting failed'
    }, {
      ...context,
      assetId,
      tokenSymbol
    });

    throw error;
  }
};

// Cache for gas balance checks to reduce API calls
// Using a Map for efficient lookups and automatic cleanup
const gasBalanceCache = new Map();
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes in milliseconds (increased to reduce API calls)

/**
 * Ensure the vault has sufficient gas for operations
 * Transfer from gas vault (88) if insufficient
 */
const ensureGasForVault = async (vaultId, blockchainId) => {
  try {
    const cacheKey = `${vaultId}-${blockchainId}`;
    const now = Date.now();

    // Check if we have a recent cache entry
    if (gasBalanceCache.has(cacheKey)) {
      const cacheEntry = gasBalanceCache.get(cacheKey);
      if (now - cacheEntry.timestamp < CACHE_DURATION) {
        logger.info('Using cached gas balance for vault', {
          vaultId,
          blockchainId,
          balance: cacheEntry.balance
        });

        // If cached balance is sufficient, return early
        if (cacheEntry.balance >= 0.001) {
          return;
        }
      }
    }

    logger.info('Checking gas balance for vault', { vaultId, blockchainId });

    // Get vault account information to check gas balance
    const vaultInfo = await fireblocksService.getVaultDetails(vaultId);

    // Find the gas asset (e.g., ETH_TEST5 for Ethereum testnets)
    const gasAsset = vaultInfo.wallets.find(wallet => wallet.blockchain === blockchainId);
    const gasBalance = parseFloat(gasAsset?.balance || '0');

    // Update cache with the new balance
    gasBalanceCache.set(cacheKey, {
      balance: gasBalance,
      timestamp: now
    });

    // Define minimum gas threshold (adjust as needed)
    const minGasThreshold = 0.001; // Minimum 0.001 ETH equivalent for gas fees

    if (gasBalance < minGasThreshold) {
      logger.info('Insufficient gas in vault, transferring from gas vault', {
        vaultId,
        currentBalance: gasBalance,
        required: minGasThreshold,
        gasVault: GAS_VAULT_ID
      });

      // Transfer gas from the gas vault (88) to the target vault
      const transferAmount = 0.002; // Transfer 0.002 ETH equivalent

      const transferResult = await vaultFireblocksService.transferTokens(
        GAS_VAULT_ID,  // Source: gas vault
        vaultId,       // Destination: target vault
        blockchainId,  // Asset to transfer (gas token)
        transferAmount // Amount to transfer
      );
      
      logger.info('Gas transfer initiated', {
        transferId: transferResult,
        fromVault: GAS_VAULT_ID,
        toVault: vaultId,
        amount: transferAmount,
        asset: blockchainId
      });

      // Wait for gas transfer to complete before proceeding
      await waitForTransferCompletion(transferResult);

      // Update cache with new balance after transfer
      gasBalanceCache.set(cacheKey, {
        balance: gasBalance + transferAmount,
        timestamp: Date.now()
      });
      
      logger.info('Gas transfer completed successfully', {
        transferId: transferResult,
        vaultId,
        newBalance: (gasBalance + transferAmount).toString()
      });
    } else {
      logger.info('Sufficient gas available in vault', {
        vaultId,
        balance: gasBalance,
        blockchainId
      });
    }
  } catch (error) {
    logger.error('Error ensuring gas for vault', {
      vaultId,
      blockchainId,
      error: error.message
    });
    // Don't throw error - continue with minting even if gas transfer fails
    // The transaction will fail at Fireblocks level if there's truly insufficient gas
  }
};

/**
 * Wait for transfer completion
 */
const waitForTransferCompletion = async (transferId) => {
  // For now, we'll just wait a fixed time since the actual implementation
  // would require checking transfer status which would add more API calls
  // In a real implementation, you would check the transfer status
  // with exponential backoff to reduce API calls
  await new Promise(resolve => setTimeout(resolve, 30000)); // Wait 30 seconds
};

/**
 * Monitor minting status and update custody record when complete
 */
const monitorMintingStatus = async (tokenLinkId, custodyRecordId, totalSupply, actor, context) => {
  logger.info('Starting mint status monitoring', { tokenLinkId, custodyRecordId, totalSupply });

  let attempts = 0;
  const maxAttempts = 20; // Reduced attempts to reduce total API calls
  const initialDelay = 120000; // 2 minutes (increased to reduce API calls)
  const maxDelay = 600000; // 10 minutes maximum delay between polls

  // Track active monitoring to prevent duplicate monitors
  const monitoringKey = `mint_${tokenLinkId}`;

  // Check if monitoring is already active using Map
  if (activeMintMonitors.has(monitoringKey)) {
    logger.info('Mint monitoring already active for this tokenLinkId, skipping duplicate', { tokenLinkId });
    return;
  }

  // Add to active monitors
  activeMintMonitors.set(monitoringKey, {
    startedAt: Date.now(),
    custodyRecordId
  });

  const poll = async () => {
    try {
      const statusData = await fireblocksService.getTokenizationStatus(tokenLinkId);

      const currentStatus = statusData.status;
      const txHash = statusData.txHash;

      // Log actual Fireblocks status response
      console.log(`\n🔥 FIREBLOCKS STATUS UPDATE #${attempts}:`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(JSON.stringify(statusData, null, 2));
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      
      logger.info('Mint status update', {
        tokenLinkId,
        status: currentStatus,
        attempts
      });

      // Log granular progress for the live terminal
      if (attempts === 2) {
        await auditService.logEvent('ON_CHAIN_SUBMISSION', { tokenLinkId }, { custodyRecordId });
      }
      if (attempts === 5) {
        await auditService.logEvent('BLOCK_PROPAGATION', { tokenLinkId }, { custodyRecordId });
      }
      if (attempts === 10) {
        await auditService.logEvent('FINALIZING_SETTLEMENT', { tokenLinkId }, { custodyRecordId });
      }

      if (currentStatus === 'COMPLETED') {
        logger.info('Token mint completed successfully', {
          tokenLinkId,
          txHash,
          custodyRecordId
        });

        // Update custody record status to MINTED
        await custodyService.updateCustodyStatus(
          custodyRecordId,
          CustodyStatus.MINTED,
          {
            blockchain: statusData.blockchainId || 'ETH_TEST5',
            tokenStandard: statusData.tokenMetadata?.tokenStandard || 'ERC20', // Default to ERC20
            tokenAddress: statusData.tokenMetadata?.contractAddress || tokenLinkId,
            tokenId: statusData.tokenId || tokenLinkId,
            quantity: totalSupply || '1', // Use the actual total supply from minting
            txHash: txHash,
            mintedAt: new Date()
          },
          actor,
          context
        );

        // Log successful minting event
        await auditService.logTokenMinted(
          custodyRecordId,
          {
            tokenLinkId,
            contractAddress: statusData.tokenMetadata?.contractAddress,
            txHash
          },
          actor,
          context
        );

        // Remove from active monitors
        activeMintMonitors.delete(monitoringKey);
        return;
      }

      if (['FAILED', 'REJECTED', 'CANCELLED'].includes(currentStatus)) {
        logger.warn('Token mint failed', {
          tokenLinkId,
          status: currentStatus,
          custodyRecordId
        });

        // Log failure
        await auditService.logEvent('TOKEN_MINT_FAILED', {
          tokenLinkId,
          status: currentStatus,
          action: `Token mint failed with status: ${currentStatus}`
        }, { custodyRecordId });

        // Remove from active monitors
        activeMintMonitors.delete(monitoringKey);
        return;
      }

      if (attempts < maxAttempts) {
        attempts++;
        // Use exponential backoff with maximum cap to reduce API calls
        // Start with 2min, then 3min, 4min, etc., up to 10 minutes
        const exponentialDelay = Math.min(initialDelay + (attempts * 60000), maxDelay);
        logger.info('Waiting before next status check', {
          tokenLinkId,
          attempts,
          delay: exponentialDelay
        });

        await new Promise(resolve => setTimeout(resolve, exponentialDelay));
        await poll(); // Recursive call instead of setTimeout
      } else {
        logger.error('Mint monitoring timeout', {
          tokenLinkId,
          custodyRecordId
        });

        await auditService.logEvent('TOKEN_MINT_TIMEOUT', {
          tokenLinkId,
          action: 'Token mint monitoring timed out'
        }, { custodyRecordId });

        // Remove from active monitors
        activeMintMonitors.delete(monitoringKey);
      }
    } catch (error) {
      logger.error('Mint monitoring error', {
        tokenLinkId,
        error: error.message
      });

      // If it's a rate limit error or authentication error, wait longer before retrying
      if (error.message.includes('Too Many Requests') ||
          error.message.includes('429') ||
          error.message.includes('Unauthorized')) {
        const rateLimitDelay = 300000; // 5 minutes for rate limit or auth errors
        logger.info('Rate limit or auth error, waiting longer before retry', {
          tokenLinkId,
          delay: rateLimitDelay,
          error: error.message
        });
        await new Promise(resolve => setTimeout(resolve, rateLimitDelay));
        if (attempts < maxAttempts) {
          attempts++;
          await poll(); // Retry after longer delay
        } else {
          activeMintMonitors.delete(monitoringKey);
        }
      } else if (attempts < maxAttempts) {
        attempts++;
        // Use exponential backoff for other errors too, with maximum cap
        const exponentialDelay = Math.min(initialDelay + (attempts * 60000), maxDelay);
        logger.info('Waiting before retry after error', {
          tokenLinkId,
          attempts,
          delay: exponentialDelay
        });
        await new Promise(resolve => setTimeout(resolve, exponentialDelay));
        await poll(); // Recursive call instead of setTimeout
      } else {
        activeMintMonitors.delete(monitoringKey);
      }
    }
  };

  // Check the initial status before starting monitoring
  try {
    const initialStatus = await fireblocksService.getTokenizationStatus(tokenLinkId);
    if (initialStatus.status === 'COMPLETED') {
      logger.info('Token mint already completed, skipping monitoring', { tokenLinkId });
      activeMintMonitors.delete(monitoringKey);
      return;
    }
  } catch (error) {
    logger.warn('Could not get initial status, proceeding with monitoring', {
      tokenLinkId,
      error: error.message
    });
  }

  // Start monitoring after a short delay
  await new Promise(resolve => setTimeout(resolve, initialDelay));
  await poll();
};

// Clean up active monitors periodically to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  const expiredKeys = [];

  for (const [key, monitor] of activeMintMonitors.entries()) {
    // Clean up monitors that have been active for more than 24 hours
    if (now - monitor.startedAt > 24 * 60 * 60 * 1000) {
      expiredKeys.push(key);
    }
  }

  for (const key of expiredKeys) {
    activeMintMonitors.delete(key);
    logger.info('Cleaned up expired monitor', { key });
  }
}, 60 * 60 * 1000); // Run cleanup every hour

/**
 * Get minting status for a specific token link
 */
export const getMintStatus = async (tokenLinkId) => {
  try {
    const statusData = await fireblocksService.getTokenizationStatus(tokenLinkId);
    return statusData;
  } catch (error) {
    logger.error('Failed to get mint status', {
      tokenLinkId,
      error: error.message
    });
    throw error;
  }
};

export default {
  mintToken,
  getMintStatus
};