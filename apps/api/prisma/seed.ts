import { PrismaClient } from '../src/generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is missing in .env file');
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Reading product data from JSON file...');

  // process.cwd() ensures it always finds the correct path regardless of ESM/CJS mode
  const jsonPath = path.join(process.cwd(), 'prisma', 'data', 'products.json');

  if (!fs.existsSync(jsonPath)) {
    throw new Error(`JSON file not found at path: ${jsonPath}`);
  }

  const fileContent = fs.readFileSync(jsonPath, 'utf-8');
  const productsData = JSON.parse(fileContent);

  console.log(`📦 Found ${productsData.length} products to insert.`);

  await prisma.product.deleteMany();
  console.log('🧹 Cleared existing database table.');

  let insertedCount = 0;
  for (const product of productsData) {
    await prisma.product.upsert({
      where: { slug: product.slug },
      update: product,
      create: product,
    });
    insertedCount++;
  }

  console.log(`✅ Success! Inserted ${insertedCount} products into PostgreSQL.`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });