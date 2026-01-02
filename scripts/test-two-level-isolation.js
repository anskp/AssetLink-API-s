/**
 * Test Script: Two-Level Isolation System
 * 
 * This script demonstrates how the two-level isolation works:
 * - Platform owner sees ALL data
 * - End users see only their own data
 */

const API_BASE = 'http://localhost:3000/v1';
const API_KEY = 'pk_test_platform1';
const TIMESTAMP = Math.floor(Date.now() / 1000);

// Helper function to make API requests
async function apiRequest(endpoint, options = {}) {
    const headers = {
        'X-API-KEY': API_KEY,
        'X-SIGNATURE': 'dummy_signature_for_testing',
        'X-TIMESTAMP': TIMESTAMP.toString(),
        'Content-Type': 'application/json',
        ...options.headers
    };

    const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers
    });

    const data = await response.json();
    return { status: response.status, data };
}

async function runTests() {
    console.log('='.repeat(60));
    console.log('TWO-LEVEL ISOLATION TEST');
    console.log('='.repeat(60));
    console.log();

    // Test 1: Link asset as Issuer
    console.log('Test 1: Issuer links an asset');
    console.log('-'.repeat(60));
    const linkResult = await apiRequest('/custody/link', {
        method: 'POST',
        headers: { 'X-USER-ID': 'issuer123' },
        body: JSON.stringify({ assetId: 'asset_test_001' })
    });
    console.log('Status:', linkResult.status);
    console.log('Response:', JSON.stringify(linkResult.data, null, 2));
    console.log();

    // Test 2: Platform owner lists all custody records (no X-USER-ID)
    console.log('Test 2: Platform owner lists ALL custody records');
    console.log('-'.repeat(60));
    const platformList = await apiRequest('/custody');
    console.log('Status:', platformList.status);
    console.log('Total records:', platformList.data.total);
    console.log('Records:', JSON.stringify(platformList.data.records, null, 2));
    console.log();

    // Test 3: Issuer lists only their custody records (with X-USER-ID)
    console.log('Test 3: Issuer lists only THEIR custody records');
    console.log('-'.repeat(60));
    const issuerList = await apiRequest('/custody', {
        headers: { 'X-USER-ID': 'issuer123' }
    });
    console.log('Status:', issuerList.status);
    console.log('Total records:', issuerList.data.total);
    console.log('Records:', JSON.stringify(issuerList.data.records, null, 2));
    console.log();

    // Test 4: Different user tries to list (should see 0 records)
    console.log('Test 4: Different user lists custody records');
    console.log('-'.repeat(60));
    const otherUserList = await apiRequest('/custody', {
        headers: { 'X-USER-ID': 'issuer999' }
    });
    console.log('Status:', otherUserList.status);
    console.log('Total records:', otherUserList.data.total);
    console.log('Records:', JSON.stringify(otherUserList.data.records, null, 2));
    console.log();

    // Test 5: Create marketplace listing
    console.log('Test 5: Issuer creates a marketplace listing');
    console.log('-'.repeat(60));
    const listingResult = await apiRequest('/marketplace/listings', {
        method: 'POST',
        headers: { 'X-USER-ID': 'issuer123' },
        body: JSON.stringify({
            assetId: 'asset_test_001',
            price: '100.00',
            currency: 'USD',
            quantity: 100,
            expiryDate: '2026-12-31T23:59:59Z'
        })
    });
    console.log('Status:', listingResult.status);
    console.log('Response:', JSON.stringify(listingResult.data, null, 2));
    console.log();

    // Test 6: List all marketplace listings
    console.log('Test 6: List all marketplace listings');
    console.log('-'.repeat(60));
    const allListings = await apiRequest('/marketplace/listings');
    console.log('Status:', allListings.status);
    console.log('Response:', JSON.stringify(allListings.data, null, 2));
    console.log();

    // Test 7: Get my listings (issuer)
    console.log('Test 7: Issuer gets their listings');
    console.log('-'.repeat(60));
    const myListings = await apiRequest('/marketplace/my-listings', {
        headers: { 'X-USER-ID': 'issuer123' }
    });
    console.log('Status:', myListings.status);
    console.log('Response:', JSON.stringify(myListings.data, null, 2));
    console.log();

    console.log('='.repeat(60));
    console.log('TESTS COMPLETED');
    console.log('='.repeat(60));
}

// Run tests
runTests().catch(console.error);
