import { PrismaClient } from '../src/generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

const published = await prisma.product.count({ where: { isActive: true } });
const unpublished = await prisma.product.count({ where: { isActive: false } });
console.log('published:', published, 'unpublished:', unpublished);

// Products demoted by the earlier push bug: seeded slugs (no generated suffix), linked offers.
const demoted = await prisma.product.findMany({
  where: { isActive: false, pharmacyProducts: { some: {} } },
  select: {
    id: true,
    name: true,
    slug: true,
    updatedAt: true,
    _count: { select: { pharmacyProducts: true } },
  },
});

const seeded = demoted.filter((p) => !/-[a-z0-9]{8,}-[a-z0-9]{4,}$/.test(p.slug));
console.log('unpublished with linked offers:', demoted.length);
console.log('restoring (previously published):');
for (const p of seeded) {
  console.log('  -', p.name, '|', p.slug, '| offers:', p._count.pharmacyProducts);
}

if (process.argv.includes('--restore')) {
  for (const p of seeded) {
    await prisma.product.update({ where: { id: p.id }, data: { isActive: true } });
  }
  console.log('restored:', seeded.length);
  console.log(
    'published now:',
    await prisma.product.count({ where: { isActive: true } }),
    'unpublished now:',
    await prisma.product.count({ where: { isActive: false } }),
  );
}

await prisma.$disconnect();