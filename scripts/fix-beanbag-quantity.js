/**
 * Fix Beanbag Token Quantity
 * Updates the beanbag token quantity from 1 to 10
 */

import prisma from '../src/config/db.js';

async function fixBeanbagQuantity() {
  try {
    console.log('🔧 Fixing beanbag token quantity...\n');
    
    // Find the beanbag token
    const beanbag = await prisma.custodyRecord.findFirst({
      where: {
        assetId: 'beanbag',
        status: 'MINTED'
      }
    });
    
    if (!beanbag) {
      console.log('❌ Beanbag token not found');
      return;
    }
    
    console.log('📦 Current beanbag data:');
    console.log(`   Asset ID: ${beanbag.assetId}`);
    console.log(`   Current Quantity: ${beanbag.quantity}`);
    console.log(`   Contract: ${beanbag.tokenAddress}`);
    console.log('');
    
    // Update quantity to 10
    const updated = await prisma.custodyRecord.update({
      where: { id: beanbag.id },
      data: { quantity: '10' }
    });
    
    console.log('✅ Updated beanbag quantity to 10');
    console.log(`   New Quantity: ${updated.quantity}`);
    console.log('');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

fixBeanbagQuantity();
