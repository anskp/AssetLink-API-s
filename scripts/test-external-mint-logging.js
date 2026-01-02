/**
 * Test External API Token Minting with Live Fireblocks Logging
 * 
 * This script demonstrates how external clients see Fireblocks transaction logs
 * in their terminal when minting tokens through the AssetLink API.
 * 
 * Usage:
 *   node scripts/test-external-mint-logging.js
 */

import axios from 'axios';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

// Replace with your actual API key
const API_KEY = process.env.TEST_API_KEY || 'your-api-key-here';

async function testExternalMintWithLogging() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  EXTERNAL CLIENT - TOKEN MINTING TEST                     ║');
  console.log('║  Testing Fireblocks Transaction Logging                   ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  try {
    // Step 1: Initiate mint operation
    console.log('📤 Step 1: Initiating mint operation...\n');
    
    const mintRequest = {
      assetId: 'ROLEX_DAYTONA_001',
      tokenSymbol: 'RLX',
      tokenName: 'Rolex Daytona Token',
      totalSupply: '1000000',
      decimals: 18,
      blockchainId: 'ETH_TEST5',
      vaultWalletId: '88'
    };

    console.log('📋 Mint Request Details:');
    console.log(JSON.stringify(mintRequest, null, 2));
    console.log('');

    const initiateResponse = await axios.post(
      `${API_BASE_URL}/v1/operations/mint`,
      mintRequest,
      {
        headers: {
          'X-API-Key': API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );

    const operationId = initiateResponse.data.id;
    console.log(`✅ Operation initiated: ${operationId}\n`);

    // Step 2: Approve the operation (this triggers Fireblocks execution)
    console.log('📤 Step 2: Approving operation (triggering Fireblocks)...\n');
    
    const approveResponse = await axios.post(
      `${API_BASE_URL}/v1/operations/${operationId}/approve`,
      {},
      {
        headers: {
          'X-API-Key': API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('\n✅ Operation approved and executed!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 Final Response:');
    console.log(JSON.stringify(approveResponse.data, null, 2));
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('🎉 SUCCESS! Check the logs above to see Fireblocks transaction details.\n');
    console.log('💡 Note: The server logs show detailed Fireblocks transaction progress');
    console.log('   including gas checks, transaction submission, and blockchain confirmation.\n');

  } catch (error) {
    console.error('\n❌ ERROR:', error.response?.data || error.message);
    console.error('\nFull error details:');
    console.error(error.response?.data || error);
  }
}

// Run the test
testExternalMintWithLogging();
