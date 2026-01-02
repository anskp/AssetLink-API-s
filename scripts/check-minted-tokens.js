/**
 * Check Minted Tokens Script
 * Displays all minted tokens in the database
 */

import prisma from '../src/config/db.js';

async function checkMintedTokens() {
  try {
    console.log('🔍 Checking minted tokens in database...\n');
    
    // Get all custody records with MINTED status
    const mintedTokens = await prisma.custodyRecord.findMany({
      where: {
        status: 'MINTED'
      },
      include: {
        assetMetadata: true
      },
      orderBy: { mintedAt: 'desc' }
    });
    
    if (mintedTokens.length === 0) {
      console.log('❌ No minted tokens found in database');
      console.log('💡 Mint a token first in the Tokens page\n');
      return;
    }
    
    console.log(`✅ Found ${mintedTokens.length} minted token(s):\n`);
    
    mintedTokens.forEach((token, index) => {
      console.log(`${index + 1}. Asset ID: ${token.assetId}`);
      console.log(`   Status: ${token.status}`);
      console.log(`   Created By: ${token.createdBy}`);
      console.log(`   Tenant ID: ${token.tenantId}`);
      console.log(`   Blockchain: ${token.blockchain || 'N/A'}`);
      console.log(`   Token Address: ${token.tokenAddress || 'N/A'}`);
      console.log(`   Minted At: ${token.mintedAt ? token.mintedAt.toISOString() : 'N/A'}`);
      console.log('');
    });
    
    // Check for ownerships
    console.log('🔍 Checking ownership records...\n');
    const ownerships = await prisma.ownership.findMany({
      orderBy: { acquiredAt: 'desc' }
    });
    
    if (ownerships.length === 0) {
      console.log('❌ No ownership records found');
      console.log('💡 Ownership records will be created when you list a token\n');
    } else {
      console.log(`✅ Found ${ownerships.length} ownership record(s):\n`);
      ownerships.forEach((ownership, index) => {
        console.log(`${index + 1}. Asset ID: ${ownership.assetId}`);
        console.log(`   Owner ID: ${ownership.ownerId}`);
        console.log(`   Quantity: ${ownership.quantity}`);
        console.log(`   Tenant ID: ${ownership.tenantId}`);
        console.log('');
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkMintedTokens();
