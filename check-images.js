const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const docs = await prisma.dbDocument.findMany({
      where: { collection: 'companies/e5om9lzxh/products' },
      take: 20
    });
    
    for (const d of docs) {
      const data = JSON.parse(d.data);
      const dataStr = JSON.stringify(data);
      console.log(`Product: ${data.name}, ID: ${d.docId}, Data length: ${dataStr.length}`);
      if (data.images && data.images.length > 0) {
        console.log(`  Images count: ${data.images.length}`);
        console.log(`  First image prefix: ${data.images[0].substring(0, 100)}...`);
        console.log(`  First image length: ${data.images[0].length}`);
      }
    }
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
