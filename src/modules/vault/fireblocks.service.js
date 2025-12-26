import https from 'https';
import crypto from 'crypto';
import fs from 'fs';
import { getFireblocksClient } from '../../config/fireblocks.js';
import { config } from '../../config/env.js';
import logger from '../../utils/logger.js';

/**
 * Fireblocks Service
 * Wrapper for Fireblocks SDK operations (Vaults, Tokens, Transactions)
 */

const shouldSimulate = () => {
    const isProd = config.nodeEnv === 'production';
    if (isProd) return false;

    const client = getFireblocksClient();
    if (!client) {
        return true;
    }

    return true; // Default to simulation in non-prod for smooth UI testing
};

/**
 * Generate JWT for Fireblocks API
 */
function generateJWT(path, bodyJson) {
    try {
        const { apiKey, secretKeyPath } = config.fireblocks;
        const privateKey = fs.readFileSync(secretKeyPath, 'utf8');

        const token = {
            uri: path,
            nonce: crypto.randomBytes(16).toString('hex'),
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + 55,
            sub: apiKey,
            bodyHash: crypto.createHash('sha256').update(bodyJson).digest('hex')
        };

        const header = {
            alg: 'RS256',
            typ: 'JWT'
        };

        const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
        const encodedPayload = Buffer.from(JSON.stringify(token)).toString('base64url');
        const signature = crypto.sign('RSA-SHA256', Buffer.from(`${encodedHeader}.${encodedPayload}`), {
            key: privateKey,
            padding: crypto.constants.RSA_PKCS1_PADDING
        }).toString('base64url');

        return `${encodedHeader}.${encodedPayload}.${signature}`;
    } catch (error) {
        logger.error('Error generating JWT', { error: error.message });
        throw error;
    }
}

/**
 * Manual HTTPS request to Fireblocks
 */
async function fireblocksRequest(path, method, payload) {
    const data = JSON.stringify(payload);
    const jwt = generateJWT(path, data);
    const baseUrl = new URL(config.fireblocks.baseUrl).hostname;

    const options = {
        hostname: baseUrl,
        path: path,
        method: method,
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': data.length,
            'X-API-Key': config.fireblocks.apiKey,
            'Authorization': `Bearer ${jwt}`
        }
    };

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

        req.write(data);
        req.end();
    });
}

/**
 * Create a new user vault vault account
 */
export const createUserVault = async (userName, userId) => {
    if (shouldSimulate()) {
        logger.warn('SIMULATION: Creating mock vault account');
        return { vaultId: `mock_vault_${userId}`, vaultName: `MOCK_${userName}` };
    }

    const fireblocks = getFireblocksClient();
    if (!fireblocks) throw new Error('Fireblocks SDK not initialized');

    const vaultName = `USER_${userName}_${userId}_${Date.now()}`;

    try {
        const response = await fireblocks.vaults.createVaultAccount({
            createVaultAccountRequest: {
                name: vaultName,
                hiddenOnUI: false,
                autoFuel: true,
                customerRefId: String(userId)
            }
        });

        logger.info('Vault account created', { vaultId: response.data.id, vaultName: response.data.name });

        return {
            vaultId: response.data.id,
            vaultName: response.data.name
        };
    } catch (error) {
        logger.error('Failed to create vault account', { error: error.message });
        throw error;
    }
};

/**
 * Get wallet address for an asset in a vault
 * Creates the asset if it doesn't exist
 */
export const getWalletAddress = async (vaultId, assetId = 'ETH_TEST5') => {
    if (shouldSimulate()) {
        logger.warn('SIMULATION: Generating mock wallet address');
        return `mock_addr_${assetId}_${vaultId}`;
    }

    const fireblocks = getFireblocksClient();
    if (!fireblocks) throw new Error('Fireblocks SDK not initialized');

    try {
        // Try to get existing address
        const addresses = await fireblocks.vaults.getVaultAccountAssetAddressesPaginated({
            vaultAccountId: vaultId,
            assetId: assetId
        });

        if (addresses.data.addresses?.length > 0) {
            return addresses.data.addresses[0].address;
        }
    } catch (e) {
        // Address doesn't exist, proceed to create asset
        logger.info('Asset not found in vault, creating...', { vaultId, assetId });
    }

    // Create asset in vault
    try {
        await fireblocks.vaults.createVaultAccountAsset({
            vaultAccountId: vaultId,
            assetId: assetId
        });
    } catch (e) {
        // Asset might already exist
    }

    // Create deposit address
    const addr = await fireblocks.vaults.createVaultAccountDepositAddress({
        vaultAccountId: vaultId,
        assetId: assetId,
        createDepositAddressRequest: {
            description: 'Primary address'
        }
    });

    const address = addr.data.address || addr.data.legacyAddress;
    logger.info('Wallet address generated', { vaultId, assetId, address });

    return address;
};

/**
 * Issue a new token (Minting)
 */
export const issueToken = async (vaultId, tokenConfig) => {
    if (shouldSimulate()) {
        logger.warn('SIMULATION: Issuing mock token');
        return {
            tokenLinkId: `mock_link_${Date.now()}`,
            status: 'PENDING_APPROVAL'
        };
    }

    const { name, symbol, decimals, totalSupply, blockchainId, assetId, contractId } = tokenConfig;

    // Convert total supply to wei
    const decimalsInt = parseInt(decimals) || 18;
    const totalSupplyWei = (BigInt(totalSupply) * BigInt(10 ** decimalsInt)).toString();

    const payload = {
        blockchainId: blockchainId || 'ETH_TEST5',
        assetId: assetId || 'ETH_TEST5',
        vaultAccountId: vaultId,
        createParams: {
            contractId: contractId || config.fireblocks.contractTemplateId,
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

    try {
        logger.info('Creating token on Fireblocks (Manual API)...', { symbol, vaultId });
        const result = await fireblocksRequest('/v1/tokenization/tokens', 'POST', payload);

        logger.info('Token issuance initiated', { tokenLinkId: result.data.id });

        return {
            tokenLinkId: result.data.id,
            status: result.data.status
        };
    } catch (error) {
        logger.error('Failed to issue token (Manual API)', { error: error.message });
        throw error;
    }
};

/**
 * Transfer tokens between vaults
 */
export const transferTokens = async (fromVaultId, toVaultId, assetId, amount) => {
    if (shouldSimulate()) {
        logger.warn('SIMULATION: Transferring mock tokens');
        return `mock_tx_${Date.now()}`;
    }

    const fireblocks = getFireblocksClient();
    if (!fireblocks) throw new Error('Fireblocks SDK not initialized');

    const transferRequest = {
        assetId: assetId,
        source: {
            type: 'VAULT_ACCOUNT',
            id: fromVaultId
        },
        destination: {
            type: 'VAULT_ACCOUNT',
            id: toVaultId
        },
        amount: String(amount),
        note: 'Custody Transfer',
        feeLevel: 'MEDIUM'
    };

    try {
        const result = await fireblocks.transactions.createTransaction({
            transactionRequest: transferRequest
        });

        logger.info('Transfer initiated', { txId: result.data.id });
        return result.data.id;
    } catch (error) {
        logger.error('Transfer failed', { error: error.message });
        throw error;
    }
};

/**
 * Monitor a transaction or tokenization task status
 */
export const monitorStatus = async (id, type = 'TRANSACTION') => {
    if (shouldSimulate()) {
        logger.warn('SIMULATION: Monitoring mock status');
        return {
            status: 'COMPLETED',
            txHash: `0x_mock_hash_${id}`,
            tokenMetadata: { contractAddress: `0x_mock_contract_${id}` }
        };
    }

    const fireblocks = getFireblocksClient();
    if (!fireblocks) throw new Error('Fireblocks SDK not initialized');

    try {
        if (type === 'TOKENIZATION') {
            const link = await fireblocks.tokenization.getLinkedToken({ id });
            return link.data;
        } else {
            const tx = await fireblocks.transactions.getTransaction({ txId: id });
            return tx.data;
        }
    } catch (error) {
        logger.error('Monitoring failed', { id, type, error: error.message });
        throw error;
    }
};

export default {
    createUserVault,
    getWalletAddress,
    issueToken,
    transferTokens,
    monitorStatus
};
