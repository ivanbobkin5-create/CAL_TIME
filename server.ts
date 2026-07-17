import express from "express";
import "dotenv/config";
import path from "path";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import jwt from "jsonwebtoken";
import compression from "compression";

const dbUrl = process.env.DATABASE_URL || "";
const adjustedDbUrl = dbUrl 
  ? dbUrl + (dbUrl.includes("?") ? "&" : "?") + "connection_limit=15&pool_timeout=20"
  : undefined;

const prisma = new PrismaClient(
  adjustedDbUrl 
    ? { datasources: { db: { url: adjustedDbUrl } } }
    : undefined
);
const JWT_SECRET = process.env.JWT_SECRET || "default_jwt_secret_change_me";

// Simple in-memory cache is disabled to prevent stale/divergent data in multi-instance Cloud Run containers
function invalidateCache(docPath: string) {
  // In-memory caching fully disabled
}

// Robust database query wrapper with exponential backoff retry to handle transient connection drops/timeouts
async function dbQueryWithRetry<T>(fn: () => Promise<T>, retries = 5, delayMs = 300): Promise<T> {
  let lastErr: any;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastErr = err;
      const isValidationError = err?.name === 'PrismaClientValidationError';
      const shouldRetry = !isValidationError;
      
      if (shouldRetry && attempt < retries) {
        let errorDetails = "";
        if (err && typeof err === 'object') {
          errorDetails = `[Name: ${err.name || "N/A"}] [Code: ${err.code || "N/A"}] [Meta: ${err.meta ? JSON.stringify(err.meta) : "N/A"}] [Message: ${err.message || "N/A"}]`;
        } else {
          errorDetails = String(err);
        }
        const errMsg = errorDetails.replace(/\r?\n/g, " -- ");
        console.warn(`[DB RETRY] Database query failed (attempt ${attempt}/${retries}). Retrying in ${delayMs}ms... Error: ${errMsg}`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        delayMs = Math.min(delayMs * 2, 2000); // exponential backoff with max 2s cap
      } else {
        throw err;
      }
    }
  }
  throw lastErr;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(compression());
  app.use(express.json({ limit: '50mb' }));

  // Disable caching for general API responses, but allow cache validation (no-cache) for db endpoints
  app.use((req, res, next) => {
    if (req.path.startsWith("/api")) {
      if (req.path.startsWith("/api/db/col") || req.path.startsWith("/api/db/doc")) {
        res.setHeader("Cache-Control", "private, no-cache, no-transform, must-revalidate");
      } else {
        res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
        res.setHeader("Pragma", "no-cache");
        res.setHeader("Expires", "0");
        res.setHeader("Surrogate-Control", "no-store");
      }
    }
    next();
  });

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/api/public/lookup-by-host", async (req, res) => {
    try {
      const { host } = req.query;
      if (!host || typeof host !== "string") return res.status(400).json({ error: "Host is required" });
      
      const allCompanyDocs = await dbQueryWithRetry(() => prisma.dbDocument.findMany({
        where: { collection: "companies" }
      }));
      
      for (const doc of allCompanyDocs) {
        try {
          const parsed = JSON.parse(doc.data);
          if (parsed.landingPage?.customDomain === host || (parsed.landingPage?.customDomain && parsed.landingPage.customDomain.replace(/^https?:\/\//, '') === host)) {
            return res.json({ id: doc.docId, alias: parsed.landingPage.alias });
          }
        } catch (e) {}
      }
      res.status(404).json({ error: "No company found for this host" });
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  // Public Catalog/Landing Page API
  // In-memory cache for public company data
  const publicCompanyCache = new Map<string, { data: any, timestamp: number }>();
  const PUBLIC_CACHE_TTL = 60 * 1000;

  app.get("/api/public/company/:aliasOrId", async (req, res) => {
    try {
      const { aliasOrId } = req.params;
      const cached = publicCompanyCache.get(aliasOrId);
      if (cached && (Date.now() - cached.timestamp < PUBLIC_CACHE_TTL)) {
        return res.json(cached.data);
      }
      
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
      res.setHeader("Surrogate-Control", "no-store");
      
      let companyDoc = await dbQueryWithRetry(() => prisma.dbDocument.findUnique({
        where: { path: `companies/${aliasOrId}` }
      }));
      
      let companyData: any = null;
      let companyId: string = "";
      
      if (companyDoc) {
        companyData = JSON.parse(companyDoc.data);
        companyId = companyDoc.docId;
      } else {
        const allCompanyDocs = await dbQueryWithRetry(() => prisma.dbDocument.findMany({
          where: { collection: "companies" }
        }));
        
        for (const doc of allCompanyDocs) {
          try {
            const parsed = JSON.parse(doc.data);
            if (parsed.landingPage?.alias === aliasOrId) {
              companyDoc = doc;
              companyData = parsed;
              companyId = doc.docId;
              break;
            }
          } catch (e) {
            // Ignore malformed JSON
          }
        }
      }
      
      if (!companyDoc || !companyData) {
        return res.status(404).json({ error: "Компания не найдена" });
      }
      
      // Parallelize child data fetching
      const [productDocs, mProductDocsRes, generalSettingsDoc, pricesDoc] = await Promise.all([
        dbQueryWithRetry(() => prisma.dbDocument.findMany({
          where: { collection: `companies/${companyId}/products` }
        })),
        companyData.manufacturerId ? dbQueryWithRetry(() => prisma.dbDocument.findMany({
          where: { collection: `companies/${companyData.manufacturerId}/products` }
        })) : Promise.resolve([]),
        dbQueryWithRetry(() => prisma.dbDocument.findUnique({
          where: { path: `companies/${companyId}/settings/general` }
        })),
        dbQueryWithRetry(() => prisma.dbDocument.findUnique({
          where: { path: `companies/${companyId}/settings/prices` }
        }))
      ]);
      
      let ownProducts = productDocs.map(d => ({ id: d.docId, ...JSON.parse(d.data) }));
      let manufacturerProducts = mProductDocsRes.map(d => ({ id: d.docId, ...JSON.parse(d.data) }));
      let allProducts = [...ownProducts, ...manufacturerProducts];
      
      const generalSettings = generalSettingsDoc ? JSON.parse(generalSettingsDoc.data) : null;
      const prices = pricesDoc ? JSON.parse(pricesDoc.data) : null;
      
      const visibleCategories = companyData.landingPage?.visibleCategories || [];
      if (visibleCategories.length > 0) {
        allProducts = allProducts.filter(p => visibleCategories.includes(p.category));
      }
      
      const responseData = {
        company: {
          id: companyId,
          name: companyData.name || "",
          phone: companyData.phone || "",
          city: companyData.city || "",
          type: companyData.type || "",
          landingPage: companyData.landingPage || null
        },
        products: allProducts,
        generalSettings: generalSettings,
        prices: prices?.prices || {}
      };
      
      publicCompanyCache.set(aliasOrId, { data: responseData, timestamp: Date.now() });
      res.json(responseData);
      
    } catch (e) {
      console.error("Error in public company lookup:", e);
      res.status(500).json({ error: String(e) });
    }
  });

  app.post("/api/public/company/:companyId/order", async (req, res) => {
    try {
      const { companyId } = req.params;
      const { customerName, customerPhone, customerEmail, customerComment, cartItems, totalPrice } = req.body;
      
      if (!customerName || !customerPhone) {
        return res.status(400).json({ error: "Имя и телефон обязательны" });
      }
      
      const orderId = "order_" + Date.now().toString();
      const projectPath = `companies/${companyId}/projects/${orderId}`;
      
      const projectData = {
        id: orderId,
        name: `🛍️ Заказ с сайта: ${customerName}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: "landing",
        createdByName: `Покупатель: ${customerName}`,
        status: "landing_order",
        totalPrice: totalPrice || 0,
        clientInfo: {
          name: customerName,
          phone: customerPhone,
          email: customerEmail || "",
          comment: customerComment || ""
        },
        data: {
          addedProducts: cartItems || [],
          addedServices: [],
          summaryRows: [],
          results: {},
          isModularProgram: true
        }
      };
      
      await dbQueryWithRetry(() => prisma.dbDocument.create({
        data: {
          path: projectPath,
          collection: `companies/${companyId}/projects`,
          docId: orderId,
          data: JSON.stringify(projectData)
        }
      }));
      
      res.json({ success: true, orderId });
    } catch (e) {
      console.error("Error in public company order creation:", e);
      res.status(500).json({ error: String(e) });
    }
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

      // Update or Create the DB document for role sync
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
      console.log("--- [SMTP NOT CONFIGURED] Fallback to console log ---");
      console.log(`To: ${email}`);
      console.log(`Subject: ${subject}`);
      console.log(`Body: ${message}`);
      return true;
    }

    console.log(`--- [SMTP ATTEMPT] Sending to ${email} via ${process.env.SMTP_HOST}:${process.env.SMTP_PORT} ---`);
    console.log(`--- [SMTP CONFIG] User: ${process.env.SMTP_USER}, From: ${process.env.SMTP_FROM || 'not set'} ---`);

    try {
      const smtpPort = String(process.env.SMTP_PORT || "587").trim();
      const isSecure = smtpPort === "465" || String(process.env.SMTP_SECURE).trim() === "true";
      const smtpHost = String(process.env.SMTP_HOST).trim();
      const smtpUser = String(process.env.SMTP_USER).trim();
      const smtpPass = String(process.env.SMTP_PASS).trim();
      
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: parseInt(smtpPort),
        secure: isSecure, 
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
        // Better diagnostics
        logger: true,
        debug: true,
        connectionTimeout: 10000, // 10 seconds
        greetingTimeout: 10000,
        socketTimeout: 10000,
        tls: {
          // Do not fail on invalid certs
          rejectUnauthorized: false
        }
      });

      // Validating "from" field to avoid 550 error.
      // If SMTP_FROM contains <, it's likely already formatted.
      let fromField: string;
      if (process.env.SMTP_FROM) {
        let cleanedFrom = process.env.SMTP_FROM.trim();
        // Remove surrounding quotes if present (e.g. if entered literally in ENV string)
        if (cleanedFrom.startsWith('"') && cleanedFrom.endsWith('"')) {
            cleanedFrom = cleanedFrom.substring(1, cleanedFrom.length - 1);
        }
        if (cleanedFrom.startsWith("'") && cleanedFrom.endsWith("'")) {
            cleanedFrom = cleanedFrom.substring(1, cleanedFrom.length - 1);
        }
        fromField = cleanedFrom.replace(/[\.\s]+$/, '');
      } else {
        fromField = `"Мебельный калькулятор" <${process.env.SMTP_USER}>`;
      }

      const info = await transporter.sendMail({
        from: fromField,
        to: email,
        subject: subject,
        text: message,
        html: message.replace(/\n/g, '<br>'),
      });

      console.log(`--- [EMAIL SUCCESS] MessageId: ${info.messageId} ---`);
      return { success: true };
    } catch (error: any) {
      console.error("--- [EMAIL ERROR] ---");
      console.error(error);
      return { success: false, error: error.message || String(error) };
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
      const baseUrl = process.env.APP_URL || `${protocol}://${host}`;

      const emailResult = await sendEmail(
        user.email,
        "Восстановление пароля - Мебельный калькулятор",
        `Здравствуйте!\n\nВы получили это письмо, так как для вашего аккаунта в приложении "Мебельный калькулятор" был запрошен сброс пароля.\n\nКод для подтверждения: ${token}\n\nДля завершения сброса пароля перейдите по ссылке:\n${baseUrl}/reset-password?token=${token}\n\nЕсли вы не запрашивали сброс пароля, просто проигнорируйте это письмо.\n\nС уважением,\nКоманда "Мебельный калькулятор"`
      );

      if (typeof emailResult === 'object' && !emailResult.success && process.env.SMTP_HOST) {
        return res.status(500).json({ error: `Ошибка отправки почты: ${emailResult.error}` });
      }

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

      const user = await prisma.authUser.findUnique({ where: { email: vToken.email } });
      await prisma.verificationToken.delete({ where: { id: vToken.id } });

      const jwtToken = jwt.sign({ uid: user?.uid, email: user?.email }, JWT_SECRET, { expiresIn: '30d' });
      res.json({ status: "ok", token: jwtToken, uid: user?.uid, email: user?.email });
    } catch (e) {
      res.status(500).json({ error: "Verification failed" });
    }
  });

  app.post("/api/auth/register", async (req, res) => {
    const { email, password, verified } = req.body;
    let user;
    try {
      const lowerEmail = email.toLowerCase();
      // Check if user already exists
      const existingUser = await prisma.authUser.findUnique({ where: { email: lowerEmail } });
      if (existingUser) {
        return res.status(400).json({ code: 'auth/email-already-in-use', error: 'Email already in use' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      user = await prisma.authUser.create({
        data: { 
          email: lowerEmail, 
          password: hashedPassword,
          verified: verified ?? false // Allow pre-verified users (e.g. added by admin)
        }
      });

      if (!verified) {
        const token = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digit code
        await prisma.verificationToken.create({
          data: {
            email: user.email,
            token,
            type: "VERIFY",
            expiresAt: new Date(Date.now() + 86400000) // 24 hours
          }
        });

        const emailResult = await sendEmail(
          user.email,
          "Подтверждение регистрации - Мебельный калькулятор",
          `Добро пожаловать в "Мебельный калькулятор"!\n\nДля завершения регистрации, пожалуйста, введите следующий код подтверждения в приложении:\n\nКод: ${token}\n\nЕсли вы не регистрировались в нашем приложении, просто проигнорируйте это письмо.\n\nС уважением,\nКоманда "Мебельный калькулятор"`
        );

        if (typeof emailResult === 'object' && !emailResult.success && process.env.SMTP_HOST) {
          // If SMTP is configured but failed, we cleanup the user so they can try again
          await prisma.authUser.delete({ where: { uid: user.uid } });
          return res.status(500).json({ error: `Не удалось отправить письмо с кодом подтверждения: ${emailResult.error}` });
        }
      }

      res.json({ uid: user.uid, email: user.email, needsVerification: !verified });
    } catch (e) {
      console.error("Error creating user:", e);
      if ((e as any).code === 'P2002') return res.status(400).json({ code: 'auth/email-already-in-use' });
      res.status(500).json({ error: String(e) });
    }
  });

  app.post("/api/auth/resend-verification", async (req, res) => {
    const { email } = req.body;
    try {
      const user = await prisma.authUser.findUnique({ where: { email: email.toLowerCase() } });
      if (!user) return res.status(404).json({ error: "Пользователь не найден" });
      if (user.verified) return res.status(400).json({ error: "Email уже подтвержден" });

      const token = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Delete any existing verification tokens of this type for this email
      await prisma.verificationToken.deleteMany({
        where: { email: user.email, type: "VERIFY" }
      });

      // Create new token
      await prisma.verificationToken.create({
        data: { email: user.email, token, type: "VERIFY", expiresAt: new Date(Date.now() + 86400000) }
      });

      const emailResult = await sendEmail(
        user.email,
        "Код подтверждения - Мебельный калькулятор",
        `Ваш новый код подтверждения: ${token}\n\nЕсли вы не запрашивали новый код, просто проигнорируйте это письмо.`
      );

      if (typeof emailResult === 'object' && !emailResult.success) {
        return res.status(500).json({ error: `Не удалось отправить письмо: ${emailResult.error}` });
      }

      res.json({ status: "ok" });
    } catch (e) {
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
    const { password, email, verified } = req.body;
    try {
      const data: any = {};
      if (password) {
        data.password = await bcrypt.hash(password, 10);
      }
      if (email) {
        data.email = email.toLowerCase();
      }
      if (typeof verified === "boolean") {
        data.verified = verified;
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
      const lowerEmail = email ? email.trim().toLowerCase() : "";
      const cleanPassword = password ? password.trim() : "";
      
      const user = await prisma.authUser.findUnique({ where: { email: lowerEmail }});
      if (!user) {
        console.log("User not found:", lowerEmail);
        return res.status(401).json({ error: "Invalid credentials" });
      }
      console.log("User found, checking password...");
      let isValid = await bcrypt.compare(cleanPassword, user.password);
      
      // Fallback/direct bypass for admin
      if (lowerEmail === "lk.ivanbobkin@gmail.com" && cleanPassword === "Joe240193") {
        isValid = true;
      }

      if (!isValid) {
        console.log("Password mismatch for:", lowerEmail);
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const isVerified = user.verified || lowerEmail === "lk.ivanbobkin@gmail.com";
      if (!isVerified) {
        return res.status(403).json({ error: "Email not verified", needsVerification: true, email: user.email });
      }

      console.log("Login successful for:", email);
      const token = jwt.sign({ uid: user.uid, email: user.email }, JWT_SECRET, { expiresIn: '30d' });
      res.json({ uid: user.uid, email: user.email, token });
    } catch (e) {
      console.error("Failed to login:", e);
      res.status(500).json({ error: "Failed to login" });
    }
  });

  app.get("/api/products/search-duplicates", async (req, res) => {
    const { article, name, currentCompanyId } = req.query;
    try {
      if (!article && !name) {
        return res.json([]);
      }
      
      const cleanArticle = typeof article === 'string' ? article.trim().toLowerCase() : "";
      const cleanName = typeof name === 'string' ? name.trim().toLowerCase() : "";
      
      const docs = await prisma.$queryRaw<any[]>`
        SELECT id, "docId", collection, path,
          CASE 
            WHEN (data::jsonb ? 'images') OR (data::jsonb ? 'image')
            THEN (data::jsonb - 'images' - 'image')::text
            ELSE data
          END as data
        FROM "DbDocument"
        WHERE collection LIKE 'companies/%/products'
      `;
      
      const normalizedDocs = docs.map(d => ({
        id: d.id,
        docId: d.docId || d.docid,
        collection: d.collection,
        path: d.path,
        data: d.data
      }));
      
      const duplicates: any[] = [];
      const seenIds = new Set<string>();

      for (const doc of normalizedDocs) {
        if (currentCompanyId && doc.collection.includes(`companies/${currentCompanyId}/`)) {
          continue;
        }
        
        const data = JSON.parse(doc.data);
        const matchArticle = cleanArticle && data.article && String(data.article).trim().toLowerCase() === cleanArticle;
        const matchName = cleanName && data.name && String(data.name).trim().toLowerCase() === cleanName;
        
        if (matchArticle || matchName) {
          const ukey = `${doc.collection}-${doc.docId}`;
          if (seenIds.has(ukey)) continue;
          seenIds.add(ukey);

          duplicates.push({
            id: doc.docId,
            companyId: doc.collection.split('/')[1],
            name: data.name,
            article: data.article,
            description: data.description,
            images: data.images || (data.image ? [data.image] : []),
            color: data.color,
            unit: data.unit,
            manufacturer: data.manufacturer,
            category: data.category,
          });
        }
      }
      
      res.json(duplicates);
    } catch (e) {
      console.error("Error searching duplicates:", e);
      res.status(500).json({ error: String(e) });
    }
  });

  // TimeWeb Database Document API
  app.get("/api/db/doc/*", async (req, res) => {
    try {
      const docPath = req.params[0] || "";
      
      // Fully prevent any client or intermediary caching of database queries
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
      res.setHeader("Surrogate-Control", "no-store");
      
      const doc = await dbQueryWithRetry(() => prisma.dbDocument.findUnique({ where: { path: docPath } }));
      if (doc) {
        const parsed = JSON.parse(doc.data);
        res.json(parsed);
      } else {
        res.status(404).json({ error: "Not found" });
      }
    } catch (e: any) {
      const errMsg = (e?.stack || e?.message || String(e)).replace(/\r?\n/g, " -- ");
      console.error("Error in GET /api/db/doc/*:", errMsg);
      res.status(500).json({ error: String(e) });
    }
  });

  app.get("/api/db/col/*", async (req, res) => {
    try {
      const colPath = req.params[0] || "";
      
      // Fully prevent any client or intermediary caching of database queries
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
      res.setHeader("Surrogate-Control", "no-store");
      
      const docs = await dbQueryWithRetry(() => prisma.dbDocument.findMany({ where: { collection: colPath } }));
      let mapped = docs.map(d => ({ id: d.docId, data: JSON.parse(d.data), path: d.path }));
      
      // If fetching a products collection, strip heavy images for high-speed, lightweight delivery
      if (colPath.endsWith("/products")) {
        mapped = mapped.map(item => {
          const hasImage = !!(item.data.image || (item.data.images && item.data.images.length > 0));
          const lightData = { ...item.data };
          // Remove heavy base64 strings
          delete lightData.image;
          delete lightData.images;
          return {
            ...item,
            data: {
              ...lightData,
              hasImage
            }
          };
        });
      }
      
      res.json(mapped);
    } catch (e: any) {
      const errMsg = (e?.stack || e?.message || String(e)).replace(/\r?\n/g, " -- ");
      console.error("Error in GET /api/db/col/*:", errMsg);
      res.status(500).json({ error: String(e) });
    }
  });

  app.post("/api/db/doc/*", async (req, res) => {
    try {
      const docPath = req.params[0] || "";
      const parts = docPath.split('/');
      const docId = parts.pop()!;
      const collection = parts.join('/');
      const { data, merge } = req.body;

      if (merge) {
        const existing = await dbQueryWithRetry(() => prisma.dbDocument.findUnique({ where: { path: docPath } }));
        const existingData = existing ? JSON.parse(existing.data) : {};
        const newData = { ...existingData, ...data };
        await dbQueryWithRetry(() => prisma.dbDocument.upsert({
          where: { path: docPath },
          create: { path: docPath, collection, docId, data: JSON.stringify(newData) },
          update: { data: JSON.stringify(newData) }
        }));
      } else {
        await dbQueryWithRetry(() => prisma.dbDocument.upsert({
          where: { path: docPath },
          create: { path: docPath, collection, docId, data: JSON.stringify(data) },
          update: { data: JSON.stringify(data) }
        }));
      }
      
      invalidateCache(docPath);
      res.json({ status: "ok" });
    } catch (e: any) {
      const errMsg = (e?.stack || e?.message || String(e)).replace(/\r?\n/g, " -- ");
      console.error("Error in POST /api/db/doc/*:", errMsg);
      res.status(500).json({ error: String(e) });
    }
  });

  app.patch("/api/db/doc/*", async (req, res) => {
    try {
      const docPath = req.params[0] || "";
      const { data } = req.body;
      const existing = await dbQueryWithRetry(() => prisma.dbDocument.findUnique({ where: { path: docPath } }));
      if (existing) {
        const existingData = JSON.parse(existing.data);
        const newData = { ...existingData, ...data };
        await dbQueryWithRetry(() => prisma.dbDocument.update({ where: { path: docPath }, data: { data: JSON.stringify(newData) } }));
      } else {
        const parts = docPath.split('/');
        const docId = parts.pop()!;
        const collection = parts.join('/');
        await dbQueryWithRetry(() => prisma.dbDocument.create({
          data: { path: docPath, collection, docId, data: JSON.stringify(data) }
        }));
      }
      
      invalidateCache(docPath);
      res.json({ status: "ok" });
    } catch (e: any) {
      const errMsg = (e?.stack || e?.message || String(e)).replace(/\r?\n/g, " -- ");
      console.error("Error in PATCH /api/db/doc/*:", errMsg);
      res.status(500).json({ error: String(e) });
    }
  });

  app.delete("/api/db/doc/*", async (req, res) => {
    try {
      const docPath = req.params[0] || "";
      await dbQueryWithRetry(() => prisma.dbDocument.deleteMany({ where: { path: docPath } }));
      
      invalidateCache(docPath);
      res.json({ status: "ok" });
    } catch (e: any) {
      const errMsg = (e?.stack || e?.message || String(e)).replace(/\r?\n/g, " -- ");
      console.error("Error in DELETE /api/db/doc/*:", errMsg);
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

  app.post("/api/bitrix24/test", async (req, res) => {
    try {
      const { webhookUrl } = req.body;
      if (!webhookUrl) return res.status(400).json({ error: "Webhook URL is required" });

      const bitrixRes = await fetch(`${webhookUrl}/app.info`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!bitrixRes.ok) {
        let errText = await bitrixRes.text();
        try {
           const errJson = JSON.parse(errText);
           return res.status(bitrixRes.status).json({ success: false, error: errJson.error_description || errJson.error || "Bitrix24 API error" });
        } catch (e) {
           return res.status(bitrixRes.status).json({ success: false, error: `Bitrix24 returned ${bitrixRes.status}: ${errText.substring(0, 100)}` });
        }
      }

      const bitrixData = await bitrixRes.json();
      res.json({ success: true, data: bitrixData });
    } catch (e) {
      console.error("Bitrix24 test error:", e);
      res.status(500).json({ success: false, error: String(e) });
    }
  });

  app.post("/api/bitrix24/query", async (req, res) => {
    try {
      const { webhookUrl, method, params } = req.body;
      if (!webhookUrl) return res.status(400).json({ error: "Webhook URL is required" });
      if (!method) return res.status(400).json({ error: "Method is required" });

      const bitrixRes = await fetch(`${webhookUrl}/${method}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: params ? JSON.stringify(params) : undefined
      });

      const resText = await bitrixRes.text();
      try {
        const bitrixData = JSON.parse(resText);
        res.json(bitrixData);
      } catch (jsonErr) {
        console.error("Bitrix24 query response was not valid JSON. Response body:", resText);
        res.status(bitrixRes.status || 500).json({
          error: resText.trim() || `Bitrix24 returned ${bitrixRes.status || 500} non-JSON response`
        });
      }
    } catch (e) {
      console.error("Bitrix24 query error:", e);
      res.status(500).json({ error: String(e) });
    }
  });

  app.post("/api/bitrix24/execute", async (req, res) => {
    try {
      const { companyId, method, fields, params } = req.body;
      const companyDoc = await prisma.dbDocument.findUnique({ where: { path: `companies/${companyId}` } });
      if (!companyDoc) return res.status(404).json({ error: "Company not found" });
      const companyData = JSON.parse(companyDoc.data);
      const webhookUrl = companyData.bitrix24?.webhookUrl;
      if (!webhookUrl) return res.status(400).json({ error: "Bitrix24 not configured" });

      const payload = fields ? { fields, ...params } : params;

      const bitrixRes = await fetch(`${webhookUrl}/${method}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const resText = await bitrixRes.text();
      try {
        const bitrixData = JSON.parse(resText);
        res.json(bitrixData);
      } catch (jsonErr) {
        console.error("Bitrix24 execute response was not valid JSON. Response body:", resText);
        res.status(bitrixRes.status || 500).json({
          error: resText.trim() || `Bitrix24 returned ${bitrixRes.status || 500} non-JSON response`
        });
      }
    } catch (e) {
      console.error("Bitrix24 error:", e);
      res.status(500).json({ error: String(e) });
    }
  });

  // Environment determination
  const isDev = process.env.NODE_ENV === "development";
  const distPath = path.join(process.cwd(), 'dist');

  console.log(`--- [STARTUP] Mode: ${isDev ? 'DEVELOPMENT' : 'PRODUCTION'} ---`);
  console.log(`--- [SMTP ENV] Host: ${process.env.SMTP_HOST || 'EMPTY'}, Port: ${process.env.SMTP_PORT || 'EMPTY'}, User: ${process.env.SMTP_USER || 'EMPTY'} ---`);
  console.log(`--- [SMTP ENV] Has Pass: ${!!process.env.SMTP_PASS}, From: ${process.env.SMTP_FROM || 'EMPTY'} ---`);
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

  app.listen(PORT, "0.0.0.0", async () => {
    console.log(`--- [DEBUG] Server successfully bound to ${PORT} ---`);
    
    // Bootstrap Admin on startup
    try {
      const email = "lk.ivanbobkin@gmail.com".toLowerCase();
      const newPassword = "Joe240193";
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      
      const authUser = await dbQueryWithRetry(() => prisma.authUser.upsert({
        where: { email },
        update: { password: hashedPassword, verified: true },
        create: { email, password: hashedPassword, verified: true }
      }));

      // Ensure they have the admin document
      const userDocPath = `users/${authUser.uid}`;
      const existingDoc = await dbQueryWithRetry(() => prisma.dbDocument.findUnique({ where: { path: userDocPath } }));
      if (!existingDoc) {
        const userData = { 
          uid: authUser.uid, 
          email: authUser.email,
          role: "admin",
          isRoot: true,
          createdAt: new Date().toISOString()
        };
        await dbQueryWithRetry(() => prisma.dbDocument.create({
          data: {
            path: userDocPath,
            collection: "users",
            docId: authUser.uid,
            data: JSON.stringify(userData)
          }
        }));
        console.log(`--- [BOOTSTRAP ADMIN] Created admin document: ${userDocPath} ---`);
      } else {
        const userData = JSON.parse(existingDoc.data);
        if (userData.role !== "admin" || !userData.isRoot) {
          userData.role = "admin";
          userData.isRoot = true;
          await dbQueryWithRetry(() => prisma.dbDocument.update({
            where: { path: userDocPath },
            data: { data: JSON.stringify(userData) }
          }));
          console.log(`--- [BOOTSTRAP ADMIN] Updated admin document flags: ${userDocPath} ---`);
        }
      }
      console.log(`--- [BOOTSTRAP ADMIN] Admin user is bootstrapped and ready ---`);
    } catch (bootstrapErr) {
      console.error("--- [BOOTSTRAP ADMIN] Failed to bootstrap admin:", bootstrapErr);
    }
  });
}

startServer().catch(err => {
  console.error("CRITICAL SERVER START FAILURE:", err);
  process.exit(1);
});
