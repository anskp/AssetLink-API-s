/**
 * Test Marketplace Endpoint
 * Tests the minted tokens endpoint
 */

import prisma from '../src/config/db.js';

async function testEndpoint() {
  try {
    console.log('🔍 Testing marketplace endpoint logic...\n');
    
    // Get the client user
    const user = await prisma.user.findUnique({
      where: { email: 'client@assetlink.io' }
    });
    
    if (!user) {
      console.log('❌ Client user not found');
      return;
    }
    
    console.log(`✅ Found user: ${user.email}`);
    console.log(`   User ID: ${user.id}\n`);
    
    // Test the query that the endpoint uses
    console.log('🔍 Testing query with OR condition...\n');
    
    const mintedTokens = await prisma.custodyRecord.findMany({
      where: {
        status: 'MINTED',
        OR: [
          { createdBy: `dashboard_user_${user.id}` },
          { createdBy: user.id }
        ]
      },
      include: {
        assetMetadata: true
      },
      orderBy: { mintedAt: 'desc' }
    });
    
    console.log(`✅ Query returned ${mintedTokens.length} token(s)\n`);
    
    if (mintedTokens.length > 0) {
      mintedTokens.forEach((token, index) => {
        console.log(`${index + 1}. Asset ID: ${token.assetId}`);
        console.log(`   Created By: ${token.createdBy}`);
        console.log(`   Matches user.id: ${token.createdBy === user.id ? '✅ YES' : '❌ NO'}`);
        console.log(`   Matches dashboard_user_\${user.id}: ${token.createdBy === `dashboard_user_${user.id}` ? '✅ YES' : '❌ NO'}`);
        console.log('');
      });
    } else {
      console.log('❌ No tokens found with the query');
      console.log('\n🔍 Let me check what createdBy values exist...\n');
      
      const allMinted = await prisma.custodyRecord.findMany({
        where: { status: 'MINTED' },
        select: { assetId: true, createdBy: true }
      });
      
      allMinted.forEach((token) => {
        console.log(`Asset: ${token.assetId}, createdBy: ${token.createdBy}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testEndpoint();
