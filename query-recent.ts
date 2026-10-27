import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  const users = await prisma.authUser.findMany({
    where: { createdAt: { gte: new Date(Date.now() - 3600000) } }
  });
  console.log("Recent Users:", users);
  const tokens = await prisma.verificationToken.findMany({
    where: { createdAt: { gte: new Date(Date.now() - 3600000) } }
  });
  console.log("Recent Tokens:", tokens);
}
main();
