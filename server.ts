import express from "express";
import path from "path";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/auth/register", async (req, res) => {
    const { email, password } = req.body;
    try {
      const user = await prisma.authUser.create({
        data: { email: email.toLowerCase(), password }
      });
      res.json({ uid: user.uid, email: user.email });
    } catch (e) {
      if ((e as any).code === 'P2002') return res.status(400).json({ code: 'auth/email-already-in-use' });
      res.status(500).json({ error: "Failed to create user" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    try {
      const user = await prisma.authUser.findUnique({ where: { email: email.toLowerCase() }});
      if (!user || user.password !== password) return res.status(401).json({ error: "Invalid credentials" });
      res.json({ uid: user.uid, email: user.email });
    } catch (e) {
      res.status(500).json({ error: "Failed to login" });
    }
  });

  // Firestore-like Document API
  app.get("/api/firebase/doc/*", async (req, res) => {
    const docPath = req.params[0];
    const doc = await prisma.dbDocument.findUnique({ where: { path: docPath } });
    if (doc) res.json(doc.data);
    else res.status(404).json({ error: "Not found" });
  });

  app.get("/api/firebase/col/*", async (req, res) => {
    const colPath = req.params[0];
    const docs = await prisma.dbDocument.findMany({ where: { collection: colPath } });
    res.json(docs.map(d => ({ id: d.docId, data: d.data, path: d.path })));
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
        const newData = existing ? { ...(existing.data as object), ...data } : data;
        await prisma.dbDocument.upsert({
          where: { path: docPath },
          create: { path: docPath, collection, docId, data: newData },
          update: { data: newData }
        });
      } else {
        await prisma.dbDocument.upsert({
          where: { path: docPath },
          create: { path: docPath, collection, docId, data },
          update: { data }
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
        const newData = { ...(existing.data as object), ...data };
        await prisma.dbDocument.update({ where: { path: docPath }, data: { data: newData } });
      } else {
        const parts = docPath.split('/');
        const docId = parts.pop()!;
        const collection = parts.join('/');
        await prisma.dbDocument.create({
          data: { path: docPath, collection, docId, data }
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
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
