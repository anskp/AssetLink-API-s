import prisma from '../src/config/db.js';

async function verify() {
    const record = await prisma.custodyRecord.findFirst({
        where: { assetId: '14' }
    });
    console.log('Record for assetId 14:', record);
    await prisma.$disconnect();
}

verify().catch(console.error);
