import "dotenv/config";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const emails = ["lk.ivanbobkin@gmail.com", "lk.ivabobkin@gmail.com"];
  
  for (const e of emails) {
    const existing = await prisma.authUser.findUnique({ where: { email: e } });
    if (!existing) {
      const user = await prisma.authUser.create({
        data: { email: e, password: "adminpassword123" }
      });
      console.log("Created user:", user);
      
      const doc = await prisma.dbDocument.create({
        data: {
          path: "users/" + user.uid,
          collection: "users",
          docId: user.uid,
          data: {
            uid: user.uid,
            email: e,
            displayName: "Super Admin",
            role: "admin",
            companyId: "system",
            createdAt: new Date().toISOString()
          }
        }
      });
      console.log("Created doc:", doc);
    } else {
      console.log("User already exists:", e);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
