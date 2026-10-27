import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function test() {
  try {
    const product = await prisma.dbDocument.findUnique({
      where: { path: 'companies/e5om9lzxh/products/1781739199253' }
    });
    if (!product) {
      console.log("Product not found");
      return;
    }
    const data = JSON.parse(product.data);
    console.log("Product ID:", product.docId);
    console.log("Keys:");
    for (const k of Object.keys(data)) {
      const val = data[k];
      let valStr = "";
      if (val === null || val === undefined) {
        valStr = "null/undefined";
      } else if (typeof val === 'string') {
        valStr = `string of length ${val.length}`;
        if (val.length > 100) {
          valStr += ` (starts with: ${val.substring(0, 60)})`;
        }
      } else if (Array.isArray(val)) {
        valStr = `array of length ${val.length}`;
        if (val.length > 0) {
          const first = JSON.stringify(val[0]);
          valStr += ` (first item size: ${first.length}, keys: ${typeof val[0] === 'object' ? Object.keys(val[0]) : 'none'})`;
        }
      } else if (typeof val === 'object') {
        valStr = `object with keys: ${Object.keys(val)}`;
      } else {
        valStr = String(val);
      }
      console.log(`- ${k}: ${valStr}`);
    }
  } catch (err: any) {
    console.error("Failed:", err);
  } finally {
    await prisma.$disconnect();
  }
}

test();
