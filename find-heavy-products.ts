import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function test() {
  try {
    const products = await prisma.dbDocument.findMany({
      where: { collection: 'companies/e5om9lzxh/products' }
    });
    
    // Sort products by size of their data string descending
    const sorted = products.map(p => ({
      id: p.docId,
      size: p.data.length,
      keys: Object.keys(JSON.parse(p.data))
    })).sort((a, b) => b.size - a.size);

    console.log("Top 10 heaviest products:");
    for (let i = 0; i < Math.min(10, sorted.length); i++) {
      console.log(`Product ${sorted[i].id}: Size = ${sorted[i].size} bytes, Keys =`, sorted[i].keys);
    }
  } catch (err: any) {
    console.error("Failed:", err);
  } finally {
    await prisma.$disconnect();
  }
}

test();
