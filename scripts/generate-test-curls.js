import crypto from 'crypto';

const API_BASE_URL = 'http://localhost:3000/v1';

// Provided Keys
const MAKER = {
    publicKey: 'ak_c909d5a9253acd9e54ef917f66eedf99',
    secretKey: 'sk_ebd6ccc695e9e6c38336b3686548fee760b8819fe941928e'
};

const CHECKER = {
    publicKey: 'ak_0f6bf9ab66a61cd598e709b65357856d',
    secretKey: 'sk_f8a705ef9cf26073e83f8d9ed0d60830df0203f8b80b531c'
};

function generateSignature(method, path, timestamp, body, secret) {
    const bodyString = body ? (typeof body === 'string' ? body : JSON.stringify(body)) : '';
    const payload = method + path + timestamp + bodyString;
    return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

async function prepareTests() {
    const timestamp = Math.floor(Date.now() / 1000).toString();

    // 1. Link Asset (Maker)
    const linkPath = '/v1/custody/link';
    const linkBody = {
        assetId: `TEST_ASSET_${Date.now()}`,
        assetType: 'WATCH',
        assetName: 'Rolex Submariner',
        estimatedValue: '15000',
        currency: 'USD',
        documents: [],
        images: []
    };
    const linkSignature = generateSignature('POST', linkPath, timestamp, linkBody, MAKER.secretKey);

    console.log('\n--- 1. LINK ASSET (MAKER) ---');
    console.log(`curl -X POST "http://localhost:3000${linkPath}" \\`);
    console.log(`  -H "Content-Type: application/json" \\`);
    console.log(`  -H "x-api-key: ${MAKER.publicKey}" \\`);
    console.log(`  -H "x-signature: ${linkSignature}" \\`);
    console.log(`  -H "x-timestamp: ${timestamp}" \\`);
    console.log(`  -d '${JSON.stringify(linkBody)}'`);

    // Note: To test approval, we would need the custody record ID returned from the first call.
    console.log('\n--- 2. APPROVE ASSET (CHECKER) ---');
    console.log('# Replace {id} with the ID returned from the link call');
    console.log(`echo 'Run the command below after replacing {id}:'`);

    // Example for a hypothetical ID
    const sampleId = '{id}';
    const approvePath = `/v1/custody/${sampleId}/approve`;
    const approveBody = {}; // Empty body usually
    const approveSignature = generateSignature('POST', approvePath, timestamp, approveBody, CHECKER.secretKey);

    console.log(`curl -X POST "http://localhost:3000${approvePath}" \\`);
    console.log(`  -H "Content-Type: application/json" \\`);
    console.log(`  -H "x-api-key: ${CHECKER.publicKey}" \\`);
    console.log(`  -H "x-signature: ${approveSignature}" \\`); // This signature will change based on the actual ID
    console.log(`  -H "x-timestamp: ${timestamp}" \\`);
    console.log(`  -d '{}'`);
}

prepareTests();
