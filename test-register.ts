import "dotenv/config";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function test() {
  try {
    const user = await prisma.authUser.create({
      data: { email: "test-npx-register2@example.com", password: "mypassword" }
    });
    console.log(user);
    const doc = await prisma.dbDocument.create({
      data: { path: "users/" + user.uid, collection: "users", docId: user.uid, data: { name: "Test User" } }
    });
    console.log(doc);
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}
test();
