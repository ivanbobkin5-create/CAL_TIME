import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function test() {
  try {
    const products = await prisma.dbDocument.findMany({
      where: { collection: 'companies/e5om9lzxh/products' },
      take: 5
    });
    for (const p of products) {
      console.log("ID:", p.docId);
      console.log("Path:", p.path);
      const data = JSON.parse(p.data);
      console.log("Keys in data:", Object.keys(data));
      // Log string lengths of some fields
      for (const k of Object.keys(data)) {
        if (typeof data[k] === 'string') {
          console.log(`  Length of string '${k}':`, data[k].length);
        } else if (typeof data[k] === 'object' && data[k] !== null) {
          console.log(`  Keys in object '${k}':`, Object.keys(data[k]));
        }
      }
      console.log("---");
    }
  } catch (err: any) {
    console.error("Failed:", err);
  } finally {
    await prisma.$disconnect();
  }
}

test();
