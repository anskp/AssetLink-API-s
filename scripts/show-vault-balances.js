#!/usr/bin/env node

/**
 * Show Token Balances from Fireblocks Vault
 * 
 * This standalone script fetches and displays token balances from a Fireblocks vault
 * using the Fireblocks API directly.
 * 
 * Usage:
 *   node scripts/show-vault-balances.js [vaultId]
 * 
 * If no vaultId is provided, it will list all vaults and their balances.
 */

import dotenv from 'dotenv';
import fs from 'fs';
import crypto from 'crypto';
import https from 'https';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });

// Configuration
const FIREBLOCKS_API_KEY = process.env.FIREBLOCKS_API_KEY;
const FIREBLOCKS_SECRET_KEY_PATH = process.env.FIREBLOCKS_SECRET_KEY_PATH || './fireblocks_secret.key';
const FIREBLOCKS_BASE_URL = process.env.FIREBLOCKS_BASE_URL || 'https://sandbox-api.fireblocks.io';

/**
 * Make authenticated request to Fireblocks API
 */
async function fireblocksRequest(path, method = 'GET', payload = null) {
  if (!FIREBLOCKS_API_KEY) {
    throw new Error('FIREBLOCKS_API_KEY not set in environment');
  }

  if (!fs.existsSync(FIREBLOCKS_SECRET_KEY_PATH)) {
    throw new Error(`Secret key file not found at: ${FIREBLOCKS_SECRET_KEY_PATH}`);
  }

  const secretKey = fs.readFileSync(FIREBLOCKS_SECRET_KEY_PATH, 'utf8');
  const data = payload ? JSON.stringify(payload) : '';
  
  // Create JWT token for authentication
  const token = {
    uri: path,
    nonce: crypto.randomBytes(16).toString('hex'),
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 55,
    sub: FIREBLOCKS_API_KEY,
    bodyHash: crypto.createHash('sha256').update(data).digest('hex')
  };

  const header = { alg: 'RS256', typ: 'JWT' };
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encodedPayload = Buffer.from(JSON.stringify(token)).toString('base64url');
  const signature = crypto.sign('RSA-SHA256', Buffer.from(`${encodedHeader}.${encodedPayload}`), {
    key: secretKey,
    padding: crypto.constants.RSA_PKCS1_PADDING
  }).toString('base64url');

  const jwt = `${encodedHeader}.${encodedPayload}.${signature}`;
  const url = new URL(FIREBLOCKS_BASE_URL);
  
  const options = {
    hostname: url.hostname,
    path,
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': FIREBLOCKS_API_KEY,
      'Authorization': `Bearer ${jwt}`
    }
  };

  if (method !== 'GET' && data) {
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
          if (res.statusCode >= 400) {
            reject(new Error(`API Error ${res.statusCode}: ${responseData}`));
          } else {
            resolve(responseData);
          }
        }
      });
    });

    req.on('error', reject);
    
    if (method !== 'GET' && data) {
      req.write(data);
    }
    req.end();
  });
}

/**
 * Get all vault accounts (paginated)
 */
async function getAllVaults() {
  const vaults = [];
  let hasMore = true;
  let after = null;
  
  while (hasMore) {
    const path = after 
      ? `/v1/vault/accounts_paged?limit=100&after=${after}`
      : '/v1/vault/accounts_paged?limit=100';
    
    const response = await fireblocksRequest(path);
    
    if (response.accounts && response.accounts.length > 0) {
      vaults.push(...response.accounts);
    }
    
    hasMore = response.paging?.after ? true : false;
    after = response.paging?.after;
  }
  
  return vaults;
}

/**
 * Get specific vault account details
 */
async function getVaultById(vaultId) {
  return await fireblocksRequest(`/v1/vault/accounts/${vaultId}`);
}

/**
 * Get all tokenization links (minted RWA tokens)
 */
async function getTokenizationLinks() {
  try {
    const response = await fireblocksRequest('/v1/tokenization/tokens');
    const tokens = response.data || response || [];
    return Array.isArray(tokens) ? tokens : [];
  } catch (error) {
    console.warn('Could not fetch tokenization links:', error.message);
    return [];
  }
}

/**
 * Get token details by asset ID
 */
async function getTokenDetails(assetId) {
  try {
    return await fireblocksRequest(`/v1/tokenization/tokens/${assetId}`);
  } catch (error) {
    return null;
  }
}

/**
 * Format balance for display
 */
function formatBalance(balance, decimals = 18) {
  if (!balance || balance === '0') return '0';
  
  // If balance is already a decimal string (e.g., "0.001290350993613159")
  if (typeof balance === 'string' && balance.includes('.')) {
    const num = parseFloat(balance);
    if (num === 0) return '0';
    // Format with up to 8 decimal places, removing trailing zeros
    return num.toFixed(8).replace(/\.?0+$/, '');
  }
  
  // If balance is in wei format (integer string)
  try {
    const balanceBigInt = BigInt(balance);
    const divisor = BigInt(10 ** decimals);
    const wholePart = balanceBigInt / divisor;
    const fractionalPart = balanceBigInt % divisor;
    
    if (fractionalPart === 0n) {
      return wholePart.toString();
    }
    
    const fractionalStr = fractionalPart.toString().padStart(decimals, '0');
    const trimmedFractional = fractionalStr.replace(/0+$/, '');
    
    return `${wholePart}.${trimmedFractional}`;
  } catch (e) {
    // If BigInt conversion fails, return as-is
    return balance.toString();
  }
}

/**
 * Display vault balances in a formatted table
 */
async function displayVaultBalances(vault, tokenLinks = []) {
  console.log('\n' + '='.repeat(100));
  console.log(`Vault ID: ${vault.id}`);
  console.log(`Vault Name: ${vault.name}`);
  console.log('='.repeat(100));
  
  if (!vault.assets || vault.assets.length === 0) {
    console.log('No assets found in this vault.');
    return;
  }
  
  // Create a map of asset IDs to token metadata
  const tokenMetadata = {};
  for (const link of tokenLinks) {
    if (link.tokenMetadata?.assetId) {
      tokenMetadata[link.tokenMetadata.assetId] = link;
    }
  }
  
  console.log('\nAsset Balances:');
  console.log('-'.repeat(100));
  
  for (const asset of vault.assets) {
    const total = formatBalance(asset.total || '0');
    const assetId = asset.id;
    
    // Check if this is a custom RWA token
    const tokenInfo = tokenMetadata[assetId];
    
    if (tokenInfo) {
      // This is an RWA token - show detailed info
      console.log(`\n🪙 RWA TOKEN: ${assetId}`);
      console.log(`   Name: ${tokenInfo.tokenMetadata?.name || 'N/A'}`);
      console.log(`   Symbol: ${tokenInfo.tokenMetadata?.symbol || 'N/A'}`);
      console.log(`   Balance: ${total}`);
      console.log(`   Total Supply: ${formatBalance(tokenInfo.tokenMetadata?.totalSupply || '0')}`);
      console.log(`   Contract: ${tokenInfo.tokenMetadata?.contractAddress || 'N/A'}`);
      console.log(`   Blockchain: ${tokenInfo.tokenMetadata?.blockchain || 'N/A'}`);
      console.log(`   Status: ${tokenInfo.status || 'N/A'}`);
    } else {
      // Standard crypto asset
      console.log(`\n💰 ${assetId}: ${total}`);
    }
  }
  
  console.log('\n' + '-'.repeat(100));
}

/**
 * Main function
 */
async function main() {
  try {
    const vaultId = process.argv[2];
    
    console.log('Connecting to Fireblocks API...');
    console.log(`Base URL: ${FIREBLOCKS_BASE_URL}`);
    
    // Fetch tokenization links to get RWA token metadata
    console.log('Fetching tokenization links...');
    const tokenLinks = await getTokenizationLinks();
    console.log(`Found ${tokenLinks.length} tokenized assets`);
    
    if (vaultId) {
      // Show specific vault
      console.log(`Fetching vault ${vaultId}...`);
      const vault = await getVaultById(vaultId);
      await displayVaultBalances(vault, tokenLinks);
    } else {
      // Show all vaults
      console.log('Fetching all vaults...');
      const vaults = await getAllVaults();
      
      if (!vaults || vaults.length === 0) {
        console.log('\nNo vaults found.');
        return;
      }
      
      console.log(`\nFound ${vaults.length} vault(s):\n`);
      
      for (const vault of vaults) {
        await displayVaultBalances(vault, tokenLinks);
      }
    }
    
    console.log('\n✓ Done!\n');
  } catch (error) {
    console.error('\n✗ Error:', error.message);
    console.error('\nPlease ensure:');
    console.error('  1. FIREBLOCKS_API_KEY is set in .env');
    console.error('  2. FIREBLOCKS_SECRET_KEY_PATH points to your private key file');
    console.error('  3. Your Fireblocks credentials are valid');
    process.exit(1);
  }
}

// Run the script
main();
