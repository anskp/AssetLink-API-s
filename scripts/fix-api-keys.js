import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const keysToUpdate = [
    {
        publicKey: 'ak_c909d5a9253acd9e54ef917f66eedf99',
        secretKey: 'sk_ebd6ccc695e9e6c38336b3686548fee760b8819fe941928e'
    },
    {
        publicKey: 'ak_0f6bf9ab66a61cd598e709b65357856d',
        secretKey: 'sk_f8a705ef9cf26073e83f8d9ed0d60830df0203f8b80b531c'
    }
];

async function main() {
    console.log('Updating API keys with plain secrets...');

    for (const key of keysToUpdate) {
        try {
            const updated = await prisma.apiKey.update({
                where: { publicKey: key.publicKey },
                data: { secretKey: key.secretKey }
            });
            console.log(`✅ Updated key: ${key.publicKey}`);
        } catch (error) {
            console.error(`❌ Failed to update key ${key.publicKey}: ${error.message}`);
        }
    }

    await prisma.$disconnect();
}

main();
