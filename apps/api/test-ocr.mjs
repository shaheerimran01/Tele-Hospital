import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './dist/generated/prisma/client.js';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

async function check() {
  const cats = ['Antibiotics', 'Diabetes Care', 'Pain Relief', 'Stomach Care', 'Respiratory Care', 'Cold & Cough', 'Allergy Care'];
  const prods = await prisma.product.findMany({
    where: { category: { in: cats } },
    select: { id: true, name: true, genericName: true, brandName: true, strength: true, category: true }
  });

  console.log(`Found ${prods.length} products in key medical categories:`);
  prods.forEach(p => console.log(`[${p.category}] ${p.name} | Generic: ${p.genericName} | Brand: ${p.brandName}`));

  await prisma.$disconnect();
}

check().catch(console.error);
