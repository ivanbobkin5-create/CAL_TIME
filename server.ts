import express from "express";
import "dotenv/config";
import path from "path";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

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

  app.post("/api/auth/register", async (req, res) => {
    const { email, password } = req.body;
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await prisma.authUser.create({
        data: { email: email.toLowerCase(), password: hashedPassword }
      });
      res.json({ uid: user.uid, email: user.email });
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
