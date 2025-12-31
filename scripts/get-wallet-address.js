#!/usr/bin/env node

/**
 * Get Wallet Address from Fireblocks Vault
 * 
 * This script retrieves the wallet address for a specific asset (like ETH_TEST5)
 * from a Fireblocks vault.
 * 
 * Usage:
 *   node scripts/get-wallet-address.js <vaultId> [assetId]
 * 
 * Examples:
 *   node scripts/get-wallet-address.js 88
 *   node scripts/get-wallet-address.js 88 ETH_TEST5
 *   node scripts/get-wallet-address.js 88 BTC_TEST
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
 * Get vault account details
 */
async function getVaultById(vaultId) {
  return await fireblocksRequest(`/v1/vault/accounts/${vaultId}`);
}

/**
 * Get deposit addresses for a specific asset in a vault
 */
async function getAssetAddresses(vaultId, assetId) {
  return await fireblocksRequest(`/v1/vault/accounts/${vaultId}/${assetId}/addresses`);
}

/**
 * Display wallet addresses
 */
function displayAddresses(vaultId, vaultName, assetId, addresses) {
  console.log('\n' + '='.repeat(80));
  console.log(`Vault ID: ${vaultId}`);
  console.log(`Vault Name: ${vaultName}`);
  console.log(`Asset: ${assetId}`);
  console.log('='.repeat(80));
  
  if (!addresses || addresses.length === 0) {
    console.log('\n⚠️  No addresses found for this asset.');
    console.log('   The asset may not be activated in this vault.');
    return;
  }
  
  console.log('\n📍 Wallet Addresses:\n');
  
  addresses.forEach((addr, index) => {
    console.log(`Address ${index + 1}:`);
    console.log(`  Address: ${addr.address || addr.legacyAddress || 'N/A'}`);
    if (addr.tag) {
      console.log(`  Tag: ${addr.tag}`);
    }
    if (addr.description) {
      console.log(`  Description: ${addr.description}`);
    }
    console.log(`  Type: ${addr.type || 'N/A'}`);
    console.log(`  Customer Ref ID: ${addr.customerRefId || 'N/A'}`);
    console.log();
  });
  
  console.log('-'.repeat(80));
}

/**
 * Main function
 */
async function main() {
  try {
    const vaultId = process.argv[2];
    const assetId = process.argv[3] || 'ETH_TEST5';
    
    if (!vaultId) {
      console.error('❌ Error: Vault ID is required');
      console.log('\nUsage:');
      console.log('  node scripts/get-wallet-address.js <vaultId> [assetId]');
      console.log('\nExamples:');
      console.log('  node scripts/get-wallet-address.js 88');
      console.log('  node scripts/get-wallet-address.js 88 ETH_TEST5');
      console.log('  node scripts/get-wallet-address.js 88 BTC_TEST');
      process.exit(1);
    }
    
    console.log('Connecting to Fireblocks API...');
    console.log(`Base URL: ${FIREBLOCKS_BASE_URL}`);
    
    // Get vault details
    console.log(`\nFetching vault ${vaultId}...`);
    const vault = await getVaultById(vaultId);
    
    // Check if asset exists in vault
    const hasAsset = vault.assets?.some(a => a.id === assetId);
    if (!hasAsset) {
      console.log(`\n⚠️  Asset ${assetId} not found in vault ${vaultId}`);
      console.log('\nAvailable assets in this vault:');
      vault.assets?.forEach(asset => {
        console.log(`  - ${asset.id}`);
      });
      process.exit(1);
    }
    
    // Get addresses for the asset
    console.log(`Fetching addresses for ${assetId}...`);
    const addresses = await getAssetAddresses(vaultId, assetId);
    
    displayAddresses(vaultId, vault.name, assetId, addresses);
    
    console.log('\n✓ Done!\n');
  } catch (error) {
    console.error('\n✗ Error:', error.message);
    console.error('\nPlease ensure:');
    console.error('  1. FIREBLOCKS_API_KEY is set in .env');
    console.error('  2. FIREBLOCKS_SECRET_KEY_PATH points to your private key file');
    console.error('  3. Your Fireblocks credentials are valid');
    console.error('  4. The vault ID exists');
    process.exit(1);
  }
}

// Run the script
main();
