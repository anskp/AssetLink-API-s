import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    try {
        console.log('Testing connection...');
        await prisma.$connect();
        console.log('Connected!');

        console.log('Counting records...');
        const custodyCount = await prisma.custodyRecord.count();
        const auditCount = await prisma.auditLog.count();
        const operationCount = await prisma.custodyOperation.count();
        const apiKeyCount = await prisma.apiKey.count();

        console.log({
            custodyCount,
            auditCount,
            operationCount,
            apiKeyCount
        });

        if (custodyCount > 0) {
            const records = await prisma.custodyRecord.findMany({ take: 1 });
            console.log('Example record:', JSON.stringify(records[0], null, 2));
        }

    } catch (error) {
        console.error('Error during diagnostics:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
