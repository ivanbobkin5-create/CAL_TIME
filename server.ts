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
  app.use(express.json());

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
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

  app.post("/api/products", async (req, res) => {
    try {
      const { name, description, price, ownerCompanyId } = req.body;
      const product = await prisma.dbProduct.create({
        data: { name, description, price, ownerCompanyId, status: "PENDING" }
      });
      res.json(product);
    } catch (e) {
      res.status(500).json({ error: "Failed to create product" });
    }
  });

  app.patch("/api/products/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { status, name, description, price } = req.body;
      const product = await prisma.dbProduct.update({
        where: { id },
        data: { status, name, description, price }
      });
      res.json(product);
    } catch (e) {
      res.status(500).json({ error: "Failed to update product" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // In production, serve static files and have a catch-all route for SPA routing
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
