import bcrypt from 'bcryptjs';
import prisma from '../src/config/db.js';

/**
 * Create Admin User Script
 * Run: node scripts/create-admin.js
 */

async function createAdmin() {
    try {
        const email = 'admin@assetlink.io';
        const password = 'admin123'; // Change this in production!

        // Check if admin already exists
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
            console.log('❌ Admin user already exists:', email);
            process.exit(0);
        }

        // Create admin user
        const passwordHash = await bcrypt.hash(password, 10);
        const admin = await prisma.user.create({
            data: {
                email,
                passwordHash,
                role: 'ADMIN',
                status: 'ACTIVE'
            }
        });

        console.log('✅ Admin user created successfully!');
        console.log('📧 Email:', email);
        console.log('🔑 Password:', password);
        console.log('⚠️  Please change the password after first login!');
        console.log('🔗 Login at: http://localhost:5174/admin/login');

    } catch (error) {
        console.error('❌ Error creating admin:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

createAdmin();
