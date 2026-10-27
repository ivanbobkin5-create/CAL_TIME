import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  const user = await prisma.authUser.findUnique({ where: { email: 'testuser55@gmail.com' } });
  console.log("User:", user);
}
main();
