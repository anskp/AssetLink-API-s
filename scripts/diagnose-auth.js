import crypto from 'crypto';
import prisma from '../src/config/db.js';

// The keys you should be using (confirmed in DB)
const MAKER_PUBLIC = 'ak_c909d5a9253acd9e54ef917f66eedf99';
const MAKER_SECRET = 'sk_ebd6ccc695e9e6c38336b3686548fee760b8819fe941928e';

async function diagnose() {
    console.log('--- API Diagnostic Tool ---');

    // 1. Verify Database Record
    const keyRecord = await prisma.apiKey.findUnique({
        where: { publicKey: MAKER_PUBLIC }
    });

    if (!keyRecord) {
        console.log('❌ KEY NOT FOUND: The public key is not in the database.');
        return;
    }

    if (!keyRecord.isActive) {
        console.log('❌ KEY INACTIVE: This key is deactivated.');
        return;
    }

    console.log('✅ Key located and active in database.');

    // 2. Generate Test Signature
    const method = 'POST';
    const path = '/v1/custody/link';
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const body = {
        assetId: 'GOAT_' + timestamp,
        assetName: 'Golden Goat',
        assetType: 'COLLECTIBLE',
        estimatedValue: '5000'
    };
    const bodyString = JSON.stringify(body);

    const payload = method + path + timestamp + bodyString;
    const signature = crypto.createHmac('sha256', MAKER_SECRET).update(payload).digest('hex');

    console.log('\n--- Generated Test Command ---');
    console.log('Copy and run this exact command:');
    console.log(`
curl -X POST "http://localhost:3000${path}" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${MAKER_PUBLIC}" \\
  -H "x-signature: ${signature}" \\
  -H "x-timestamp: ${timestamp}" \\
  -H "x-user-id: issuer123" \\
  -d '${bodyString}'
    `);

    console.log('\n⚠️  Notice: The "x-user-id" header is REQUIRED for the external API.');

    await prisma.$disconnect();
}

diagnose().catch(console.error);
