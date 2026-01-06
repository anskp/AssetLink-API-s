import prisma from '../src/config/db.js';

async function listKeys() {
    const keys = await prisma.apiKey.findMany({
        select: { publicKey: true, role: true, isActive: true, tenantId: true }
    });
    console.log(JSON.stringify(keys, null, 2));
    await prisma.$disconnect();
}

listKeys().catch(console.error);
