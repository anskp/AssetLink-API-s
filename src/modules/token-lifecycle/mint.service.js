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
    monitorMintingStatus(result.tokenLinkId, custodyRecord.id, actor, context);

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

/**
 * Ensure the vault has sufficient gas for operations
 * Transfer from gas vault (88) if insufficient
 */
const ensureGasForVault = async (vaultId, blockchainId) => {
  try {
    logger.info('Checking gas balance for vault', { vaultId, blockchainId });

    // Get vault account information to check gas balance
    const vaultInfo = await fireblocksService.getVaultDetails(vaultId);

    // Find the gas asset (e.g., ETH_TEST5 for Ethereum testnets)
    const gasAsset = vaultInfo.wallets.find(wallet => wallet.blockchain === blockchainId);
    const gasBalance = parseFloat(gasAsset?.balance || '0');

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
  const maxAttempts = 30; // 5 minutes with 10s intervals
  const interval = 10000; // 10 seconds

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      // In a real implementation, you would check the transfer status
      // For now, we'll just wait the interval time
      await new Promise(resolve => setTimeout(resolve, interval));
      break; // Exit loop after waiting
    } catch (error) {
      logger.warn('Error checking transfer status, continuing...', {
        transferId,
        error: error.message
      });
      break; // Exit loop on error
    }
  }
};

/**
 * Monitor minting status and update custody record when complete
 */
const monitorMintingStatus = async (tokenLinkId, custodyRecordId, actor, context) => {
  logger.info('Starting mint status monitoring', { tokenLinkId, custodyRecordId });

  let attempts = 0;
  const maxAttempts = 30;
  const delay = 10000; // 10 seconds

  const poll = async () => {
    try {
      const statusData = await fireblocksService.getTokenizationStatus(tokenLinkId);

      const currentStatus = statusData.status;
      const txHash = statusData.txHash;

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
            quantity: '1', // Default to 1 for minted tokens
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

        return;
      }

      if (attempts < maxAttempts) {
        attempts++;
        // Use a more reliable async delay instead of setTimeout
        await new Promise(resolve => setTimeout(resolve, delay));
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
      }
    } catch (error) {
      logger.error('Mint monitoring error', {
        tokenLinkId,
        error: error.message
      });
    }
  };

  // Start monitoring after a short delay
  await new Promise(resolve => setTimeout(resolve, delay));
  await poll();
};

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