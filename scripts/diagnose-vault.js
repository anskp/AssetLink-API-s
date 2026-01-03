/**
 * Diagnose Fireblocks Vault Issues
 * 
 * This script checks:
 * 1. If vault exists
 * 2. If vault has ETH_TEST5 asset
 * 3. If vault has sufficient gas
 * 4. Wallet address
 * 
 * Usage:
 *   node scripts/diagnose-vault.js <vaultId>
 */

import * as fireblocksClient from '../src/modules/fireblocks/fireblocks.client.js';
import logger from '../src/utils/logger.js';

const vaultId = process.argv[2];

if (!vaultId) {
  console.error('❌ Please provide a vault ID');
  console.error('Usage: node scripts/diagnose-vault.js <vaultId>');
  process.exit(1);
}

async function diagnoseVault() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  FIREBLOCKS VAULT DIAGNOSTICS                              ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  try {
    console.log(`🔍 Checking vault: ${vaultId}\n`);

    // Get vault details
    const vaultDetails = await fireblocksClient.getVaultDetails(vaultId);

    console.log('✅ Vault found!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Vault ID: ${vaultDetails.id}`);
    console.log(`Vault Name: ${vaultDetails.name}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    if (vaultDetails.wallets && vaultDetails.wallets.length > 0) {
      console.log('💰 Wallets in vault:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      vaultDetails.wallets.forEach((wallet) => {
        console.log(`\n  Blockchain: ${wallet.blockchain}`);
        console.log(`  Address: ${wallet.address}`);
        console.log(`  Balance: ${wallet.balance}`);
        
        if (wallet.blockchain === 'ETH_TEST5') {
          const balance = parseFloat(wallet.balance);
          if (balance < 0.001) {
            console.log(`  ⚠️  WARNING: Low gas balance! Need at least 0.001 ETH`);
          } else {
            console.log(`  ✅ Sufficient gas`);
          }
        }
      });
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      // Check if ETH_TEST5 exists
      const hasEthTest5 = vaultDetails.wallets.some(w => w.blockchain === 'ETH_TEST5');
      if (!hasEthTest5) {
        console.log('❌ ETH_TEST5 asset NOT found in vault!');
        console.log('   This vault cannot mint tokens on Ethereum testnet.');
        console.log('   You need to create the ETH_TEST5 asset in this vault.\n');
      } else {
        console.log('✅ ETH_TEST5 asset found in vault\n');
      }
    } else {
      console.log('❌ No wallets found in vault!');
      console.log('   This vault has no blockchain assets configured.\n');
    }

    console.log('🎯 Recommendations:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const hasEthTest5 = vaultDetails.wallets?.some(w => w.blockchain === 'ETH_TEST5');
    if (!hasEthTest5) {
      console.log('1. Create ETH_TEST5 asset in this vault');
      console.log('2. Transfer gas from vault 88 to this vault');
    } else {
      const ethWallet = vaultDetails.wallets.find(w => w.blockchain === 'ETH_TEST5');
      const balance = parseFloat(ethWallet.balance);
      if (balance < 0.001) {
        console.log('1. Transfer gas from vault 88 to this vault');
        console.log(`   Current: ${balance} ETH, Need: 0.001+ ETH`);
      } else {
        console.log('✅ Vault is ready for token minting!');
      }
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('\nFull error:');
    console.error(error);
  }
}

diagnoseVault();
