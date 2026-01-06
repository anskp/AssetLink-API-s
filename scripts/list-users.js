import prisma from '../src/config/db.js';

async function listUsers() {
    const users = await prisma.user.findMany({
        select: { id: true, email: true, role: true }
    });
    console.log(JSON.stringify(users, null, 2));
    await prisma.$disconnect();
}

listUsers().catch(console.error);
