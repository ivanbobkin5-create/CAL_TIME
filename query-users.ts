import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  const users = await prisma.authUser.findMany({
    orderBy: { createdAt: "desc" },
    take: 5
  });
  console.log("Users:", users);
  const tokens = await prisma.verificationToken.findMany({
    orderBy: { expiresAt: "desc" },
    take: 5
  });
  console.log("Tokens:", tokens);
}
main();
