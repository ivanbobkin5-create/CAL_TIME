import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  const user = await prisma.authUser.findUnique({ where: { email: 'lk.ivanbobkin@gmail.com' } });
  console.log("User:", user);
}
main();
