/**
 * Test Minted Tokens Endpoint
 * Tests the GET /v1/marketplace/dashboard/minted-tokens endpoint
 */

async function testMintedTokensEndpoint() {
  try {
    console.log('🔐 Logging in as client@assetlink.io...\n');
    
    // Login first
    const loginResponse = await fetch('http://localhost:3000/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'client@assetlink.io',
        password: 'client123'
      })
    });
    
    if (!loginResponse.ok) {
      const error = await loginResponse.json();
      console.error('❌ Login failed:', error);
      return;
    }
    
    const loginData = await loginResponse.json();
    const token = loginData.accessToken;
    const userId = loginData.user.id;
    
    console.log('✅ Login successful');
    console.log('User ID:', userId);
    console.log('Token:', token.substring(0, 20) + '...\n');
    
    // Test minted tokens endpoint
    console.log('📦 Fetching minted tokens...\n');
    
    const response = await fetch('http://localhost:3000/v1/marketplace/dashboard/minted-tokens', {
      headers: { 
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('Response status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('\n✅ Success! Minted tokens:');
      console.log(JSON.stringify(data, null, 2));
      
      if (data.data && data.data.length > 0) {
        console.log(`\n📊 Found ${data.data.length} minted token(s)`);
        data.data.forEach((token, index) => {
          console.log(`\n${index + 1}. ${token.assetId}`);
          console.log(`   Status: ${token.status}`);
          console.log(`   Blockchain: ${token.blockchain}`);
          console.log(`   Contract: ${token.tokenAddress}`);
          console.log(`   Created By: ${token.createdBy}`);
          console.log(`   Tenant ID: ${token.tenantId}`);
        });
      } else {
        console.log('\n⚠️  No minted tokens found');
      }
    } else {
      const error = await response.json();
      console.error('\n❌ Failed:', error);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testMintedTokensEndpoint();
