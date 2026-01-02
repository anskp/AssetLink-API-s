import bcrypt from 'bcryptjs';
import prisma from '../src/config/db.js';

/**
 * Create Client User Script
 * Run: node scripts/create-client.js
 */

async function createClient() {
    try {
        const email = 'client@assetlink.io';
        const password = 'client123';

        // Check if client already exists
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
            console.log('❌ Client user already exists:', email);
            process.exit(0);
        }

        // Create client user
        const passwordHash = await bcrypt.hash(password, 10);
        const client = await prisma.user.create({
            data: {
                email,
                passwordHash,
                role: 'CLIENT',
                status: 'ACTIVE'
            }
        });

        console.log('✅ Client user created successfully!');
        console.log('📧 Email:', email);
        console.log('🔑 Password:', password);
        console.log('🔗 Login at: http://localhost:5174/login');

    } catch (error) {
        console.error('❌ Error creating client:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

createClient();
