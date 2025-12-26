#!/usr/bin/env node

/**
 * Generate API Key Script
 * CLI tool to create API keys for testing and development
 */

import { createApiKey } from '../src/modules/auth/apiKey.repository.js';
import prisma from '../src/config/db.js';
import logger from '../src/utils/logger.js';

const generateKey = async () => {
    try {
        console.log('\n🔑 Generating API Key...\n');

        // Create API key with default permissions
        const apiKey = await createApiKey({
            tenantId: 'default',
            permissions: ['read', 'write', 'admin'],
            ipWhitelist: null // No IP restriction for development
        });

        console.log('✅ API Key Created Successfully\n');
        console.log('━'.repeat(60));
        console.log(`Public Key:  ${apiKey.publicKey}`);
        console.log(`Secret Key:  ${apiKey.secretKey}`);
        console.log('━'.repeat(60));
        console.log('\n⚠️  IMPORTANT: Save the secret key securely!');
        console.log('   It will not be shown again.\n');
        console.log('📋 Key Details:');
        console.log(`   - ID: ${apiKey.id}`);
        console.log(`   - Tenant: ${apiKey.tenantId}`);
        console.log(`   - Permissions: ${apiKey.permissions.join(', ')}`);
        console.log(`   - Active: ${apiKey.isActive}`);
        console.log(`   - Created: ${apiKey.createdAt.toISOString()}\n`);

    } catch (error) {
        console.error('\n❌ Error generating API key:', error.message);
        logger.error('API key generation failed', { error });
    } finally {
        await prisma.$disconnect();
    }
};

// Run the script
generateKey();
