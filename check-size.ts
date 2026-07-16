import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function test() {
  try {
    const products = await prisma.dbDocument.findMany({
      where: { collection: 'companies/e5om9lzxh/products' }
    });
    const mapped = products.map(d => ({ id: d.docId, data: JSON.parse(d.data), path: d.path }));
    const jsonStr = JSON.stringify(mapped);
    console.log("Total products count:", products.length);
    console.log("JSON length (bytes):", jsonStr.length);
    console.log("Size in MB:", (jsonStr.length / (1024 * 1024)).toFixed(2));
  } catch (err: any) {
    console.error("Failed:", err);
  } finally {
    await prisma.$disconnect();
  }
}

test();
