import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  const users = await prisma.authUser.findMany({
    where: { createdAt: { gte: new Date('2026-07-17T00:00:00.000Z') } }
  });
  console.log("Today Users:", users);
}
main();
