import express from "express";
import "dotenv/config";
import path from "path";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";

const prisma = new PrismaClient();

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  app.use(cors());
  app.use(express.json({ limit: '50mb' }));

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/api/admin/setup-root", async (req, res) => {
    console.log("--- [ADMIN SETUP] Route hit! ---");
    try {
      const email = "lk.ivanbobkin@gmail.com".toLowerCase();
      const newPassword = "Joe240193";
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      
      const authUser = await prisma.authUser.upsert({
        where: { email },
        update: { password: hashedPassword },
        create: { email, password: hashedPassword }
      });

      console.log(`--- [ADMIN SETUP] Upserted user: ${authUser.uid} ---`);

      // Update or Create the Firestore-like document for role sync
      const userDocPath = `users/${authUser.uid}`;
      const existingDoc = await prisma.dbDocument.findUnique({ where: { path: userDocPath } });
      
      const userData = existingDoc ? JSON.parse(existingDoc.data) : { 
        uid: authUser.uid, 
        email: authUser.email,
        createdAt: new Date().toISOString()
      };
      
      userData.role = "admin";
      userData.isRoot = true; // Flag for global admin panel
      
      if (existingDoc) {
        await prisma.dbDocument.update({
          where: { path: userDocPath },
          data: { data: JSON.stringify(userData) }
        });
        console.log(`--- [ADMIN SETUP] Updated existing user document: ${userDocPath} ---`);
      } else {
        await prisma.dbDocument.create({
          data: {
            path: userDocPath,
            collection: "users",
            docId: authUser.uid,
            data: JSON.stringify(userData)
          }
        });
        console.log(`--- [ADMIN SETUP] Created new user document: ${userDocPath} ---`);
      }

      res.send(`
        <div style="font-family: sans-serif; padding: 20px;">
          <h1 style="color: green;">Admin Setup Successful!</h1>
          <p>Account <b>${email}</b> is now an <b>ADMIN</b>.</p>
          <p>Password set to <b>${newPassword}</b>.</p>
          <p>Global flags updated: <b>isRoot: true</b></p>
          <hr/>
          <p>Now go back to the app, login with this password, and you should see the <b>"Админ-панель"</b> button in the sidebar.</p>
          <a href="/" style="display: inline-block; padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 5px;">Go to App</a>
        </div>
      `);
    } catch (e) {
      console.error("--- [ADMIN SETUP] Error: ---", e);
      res.status(500).send("Error setting up admin: " + String(e));
    }
  });

  // Helpers
  const sendEmail = async (email: string, subject: string, message: string) => {
    // Check if SMTP is configured
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.log("--- [SMTP NOT CONFIGURED - FALLBACK TO LOG] ---");
      console.log(`To: ${email}`);
      console.log(`Subject: ${subject}`);
      console.log(`Body: ${message}`);
      return true;
    }

    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || "587"),
        secure: process.env.SMTP_PORT === "465", 
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      // Validating "from" field to avoid 550 error. Use SMTP_FROM if set, otherwise SMTP_USER.
      const fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER;
      const fromName = "Мебельный калькулятор";

      await transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to: email,
        subject: subject,
        text: message,
        html: message.replace(/\n/g, '<br>'),
      });

      console.log(`--- [EMAIL SENT] To: ${email} ---`);
      return true;
    } catch (error) {
      console.error("--- [EMAIL ERROR] ---", error);
      return false;
    }
  };

  app.post("/api/auth/forgot-password", async (req, res) => {
    const { email } = req.body;
    try {
      const user = await prisma.authUser.findUnique({ where: { email: email.toLowerCase() } });
      if (!user) {
        return res.json({ status: "ok", message: "Instructions sent if email exists" });
      }

      const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      await prisma.verificationToken.create({
        data: {
          email: user.email,
          token,
          type: "RESET",
          expiresAt: new Date(Date.now() + 3600000) // 1 hour
        }
      });

      const protocol = req.headers['x-forwarded-proto'] || 'http';
      const host = req.headers['host'];
      // Prefer APP_URL from env if available to avoid unexpected proxy hosts like mf-ftp
      const baseUrl = process.env.APP_URL || `${protocol}://${host}`;

      await sendEmail(
        user.email,
        "Восстановление пароля - Мебельный калькулятор",
        `Здравствуйте!\n\nВы получили это письмо, так как для вашего аккаунта в приложении "Мебельный калькулятор" был запрошен сброс пароля.\n\nКод для подтверждения: ${token}\n\nДля завершения сброса пароля перейдите по ссылке:\n${baseUrl}/reset-password?token=${token}\n\nЕсли вы не запрашивали сброс пароля, просто проигнорируйте это письмо.\n\nС уважением,\nКоманда "Мебельный калькулятор"`
      );

      res.json({ status: "ok", message: "Instructions sent" });
    } catch (e) {
      res.status(500).json({ error: "Failed to process request" });
    }
  });

  app.post("/api/auth/reset-password", async (req, res) => {
    const { token, newPassword } = req.body;
    try {
      const vToken = await prisma.verificationToken.findFirst({
        where: { token, type: "RESET", expiresAt: { gt: new Date() } }
      });

      if (!vToken) return res.status(400).json({ error: "Invalid or expired token" });

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await prisma.authUser.update({
        where: { email: vToken.email },
        data: { password: hashedPassword }
      });

      await prisma.verificationToken.delete({ where: { id: vToken.id } });

      res.json({ status: "ok" });
    } catch (e) {
      res.status(500).json({ error: "Failed to reset password" });
    }
  });

  app.post("/api/auth/verify-email", async (req, res) => {
    const { token } = req.body;
    try {
      const vToken = await prisma.verificationToken.findFirst({
        where: { token, type: "VERIFY", expiresAt: { gt: new Date() } }
      });

      if (!vToken) return res.status(400).json({ error: "Invalid or expired code" });

      await prisma.authUser.update({
        where: { email: vToken.email },
        data: { verified: true }
      });

      await prisma.verificationToken.delete({ where: { id: vToken.id } });

      res.json({ status: "ok" });
    } catch (e) {
      res.status(500).json({ error: "Verification failed" });
    }
  });

  app.post("/api/auth/register", async (req, res) => {
    const { email, password } = req.body;
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await prisma.authUser.create({
        data: { 
          email: email.toLowerCase(), 
          password: hashedPassword,
          verified: false // Require verification for new users
        }
      });

      const token = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digit code
      await prisma.verificationToken.create({
        data: {
          email: user.email,
          token,
          type: "VERIFY",
          expiresAt: new Date(Date.now() + 86400000) // 24 hours
        }
      });

      await sendEmail(
        user.email,
        "Подтверждение регистрации - Мебельный калькулятор",
        `Добро пожаловать в "Мебельный калькулятор"!\n\nДля завершения регистрации, пожалуйста, введите следующий код подтверждения в приложении:\n\nКод: ${token}\n\nЕсли вы не регистрировались в нашем приложении, просто проигнорируйте это письмо.\n\nС уважением,\nКоманда "Мебельный калькулятор"`
      );

      res.json({ uid: user.uid, email: user.email, needsVerification: true });
    } catch (e) {
      console.error("Error creating user:", e);
      if ((e as any).code === 'P2002') return res.status(400).json({ code: 'auth/email-already-in-use' });
      res.status(500).json({ error: String(e) });
    }
  });

  app.get("/api/auth/lookup", async (req, res) => {
    const { email } = req.query;
    try {
      if (typeof email !== "string") return res.status(400).json({ error: "Invalid email" });
      const user = await prisma.authUser.findUnique({ where: { email: email.toLowerCase() }});
      if (user) {
        res.json({ uid: user.uid, email: user.email });
      } else {
        res.status(404).json({ error: "Not found" });
      }
    } catch (e) {
      res.status(500).json({ error: "Lookup failed" });
    }
  });

  app.patch("/api/auth/user/:uid", async (req, res) => {
    const { uid } = req.params;
    const { password, email } = req.body;
    try {
      const data: any = {};
      if (password) {
        data.password = await bcrypt.hash(password, 10);
      }
      if (email) {
        data.email = email.toLowerCase();
      }
      
      if (Object.keys(data).length > 0) {
        await prisma.authUser.update({
          where: { uid },
          data
        });
      }
      res.json({ status: "ok" });
    } catch (e) {
      console.error("Error updating auth user:", e);
      res.status(500).json({ error: "Failed to update auth user" });
    }
  });

  app.delete("/api/auth/user/:uid", async (req, res) => {
    const { uid } = req.params;
    try {
      await prisma.authUser.delete({ where: { uid } });
      res.json({ status: "ok" });
    } catch (e) {
      res.status(500).json({ error: "Failed to delete auth user" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    console.log("Login attempt for:", email);
    try {
      const user = await prisma.authUser.findUnique({ where: { email: email.toLowerCase() }});
      if (!user) {
        console.log("User not found:", email);
        return res.status(401).json({ error: "Invalid credentials" });
      }
      console.log("User found, checking password...");
      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        console.log("Password mismatch for:", email);
        return res.status(401).json({ error: "Invalid credentials" });
      }

      if (!user.verified) {
        return res.status(403).json({ error: "Email not verified", needsVerification: true, email: user.email });
      }

      console.log("Login successful for:", email);
      res.json({ uid: user.uid, email: user.email });
    } catch (e) {
      console.error("Failed to login:", e);
      res.status(500).json({ error: "Failed to login" });
    }
  });

  // Firestore-like Document API
  app.get("/api/firebase/doc/*", async (req, res) => {
    const docPath = req.params[0];
    const doc = await prisma.dbDocument.findUnique({ where: { path: docPath } });
    if (doc) res.json(JSON.parse(doc.data));
    else res.status(404).json({ error: "Not found" });
  });

  app.get("/api/firebase/col/*", async (req, res) => {
    const colPath = req.params[0];
    const docs = await prisma.dbDocument.findMany({ where: { collection: colPath } });
    res.json(docs.map(d => ({ id: d.docId, data: JSON.parse(d.data), path: d.path })));
  });

  app.post("/api/firebase/doc/*", async (req, res) => {
    try {
      const docPath = req.params[0];
      const parts = docPath.split('/');
      const docId = parts.pop()!;
      const collection = parts.join('/');
      const { data, merge } = req.body;

      if (merge) {
        const existing = await prisma.dbDocument.findUnique({ where: { path: docPath } });
        const existingData = existing ? JSON.parse(existing.data) : {};
        const newData = { ...existingData, ...data };
        await prisma.dbDocument.upsert({
          where: { path: docPath },
          create: { path: docPath, collection, docId, data: JSON.stringify(newData) },
          update: { data: JSON.stringify(newData) }
        });
      } else {
        await prisma.dbDocument.upsert({
          where: { path: docPath },
          create: { path: docPath, collection, docId, data: JSON.stringify(data) },
          update: { data: JSON.stringify(data) }
        });
      }
      res.json({ status: "ok" });
    } catch (e) {
      console.error("Error in POST /api/firebase/doc/*:", e);
      res.status(500).json({ error: String(e) });
    }
  });

  app.patch("/api/firebase/doc/*", async (req, res) => {
    try {
      const docPath = req.params[0];
      const { data } = req.body;
      const existing = await prisma.dbDocument.findUnique({ where: { path: docPath } });
      if (existing) {
        const existingData = JSON.parse(existing.data);
        const newData = { ...existingData, ...data };
        await prisma.dbDocument.update({ where: { path: docPath }, data: { data: JSON.stringify(newData) } });
      } else {
        const parts = docPath.split('/');
        const docId = parts.pop()!;
        const collection = parts.join('/');
        await prisma.dbDocument.create({
          data: { path: docPath, collection, docId, data: JSON.stringify(data) }
        });
      }
      res.json({ status: "ok" });
    } catch (e) {
      console.error("Error in PATCH /api/firebase/doc/*:", e);
      res.status(500).json({ error: String(e) });
    }
  });

  app.delete("/api/firebase/doc/*", async (req, res) => {
    try {
      const docPath = req.params[0];
      await prisma.dbDocument.deleteMany({ where: { path: docPath } });
      res.json({ status: "ok" });
    } catch (e) {
      console.error("Error in DELETE /api/firebase/doc/*:", e);
      res.status(500).json({ error: String(e) });
    }
  });

  // --- Продукты (DbProduct) ---
  app.get("/api/products", async (req, res) => {
    try {
      const products = await prisma.dbProduct.findMany();
      res.json(products);
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch products" });
    }
  });

  app.get("/api/products/:id/history", async (req, res) => {
    try {
      const history = await prisma.priceHistory.findMany({
        where: { productId: req.params.id },
        orderBy: { createdAt: 'desc' }
      });
      res.json(history);
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch price history" });
    }
  });

  app.post("/api/products", async (req, res) => {
    try {
      const { name, description, price, ownerCompanyId, photos } = req.body;
      const product = await prisma.dbProduct.create({
        data: { name, description, price, ownerCompanyId, photos, status: "PENDING" }
      });
      res.json(product);
    } catch (e) {
      res.status(500).json({ error: "Failed to create product" });
    }
  });

  app.patch("/api/products/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { status, name, description, price, photos, changedBy } = req.body;
      
      const oldProduct = await prisma.dbProduct.findUnique({ where: { id } });
      
      const product = await prisma.dbProduct.update({
        where: { id },
        data: { status, name, description, price, photos }
      });

      if (price !== undefined && oldProduct?.price !== price) {
        await prisma.priceHistory.create({
          data: {
            productId: id,
            oldPrice: oldProduct?.price,
            newPrice: price,
            changedBy: changedBy || "admin"
          }
        });
      }
      
      res.json(product);
    } catch (e) {
      res.status(500).json({ error: "Failed to update product" });
    }
  });

  app.post("/api/bitrix24/execute", async (req, res) => {
    try {
      const { companyId, method, fields } = req.body;
      const companyDoc = await prisma.dbDocument.findUnique({ where: { path: `companies/${companyId}` } });
      if (!companyDoc) return res.status(404).json({ error: "Company not found" });
      const companyData = JSON.parse(companyDoc.data);
      const webhookUrl = companyData.bitrix24?.webhookUrl;
      if (!webhookUrl) return res.status(400).json({ error: "Bitrix24 not configured" });

      const bitrixRes = await fetch(`${webhookUrl}/${method}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields })
      });
      const bitrixData = await bitrixRes.json();
      res.json(bitrixData);
    } catch (e) {
      console.error("Bitrix24 error:", e);
      res.status(500).json({ error: String(e) });
    }
  });

  // Environment determination
  const isDev = process.env.NODE_ENV === "development";
  const distPath = path.join(process.cwd(), 'dist');

  console.log(`--- [STARTUP] Mode: ${isDev ? 'DEVELOPMENT' : 'PRODUCTION'} ---`);
  console.log(`--- [STARTUP] CWD: ${process.cwd()} ---`);
  console.log(`--- [STARTUP] Dist Path: ${distPath} ---`);

  if (isDev) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Check if dist exists for better error reporting in logs
    app.use(express.static(distPath, { index: false }));
    
    app.get('*', (req, res) => {
      // API 404s
      if (req.path.startsWith('/api/')) {
        console.warn(`--- [API 404] No route for: ${req.path} ---`);
        return res.status(404).json({ error: "API Route not found" });
      }
      
      const indexPath = path.join(distPath, 'index.html');
      res.sendFile(indexPath, (err) => {
        if (err) {
          console.error(`--- [SERVER ERROR] Failed to send index.html: ${err.message} ---`);
          res.status(500).send("The application build (dist) was not found. Please ensure 'npm run build' was executed.");
        }
      });
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`--- [DEBUG] Server successfully bound to ${PORT} ---`);
  });
}

startServer().catch(err => {
  console.error("CRITICAL SERVER START FAILURE:", err);
  process.exit(1);
});
