import express from "express";
import "dotenv/config";
import path from "path";
import fs from "fs";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import jwt from "jsonwebtoken";
import compression from "compression";

const dbUrl = process.env.DATABASE_URL || "";
let adjustedDbUrl: string | undefined = undefined;
if (dbUrl) {
  try {
    const urlObj = new URL(dbUrl);
    urlObj.searchParams.set("connection_limit", "20");
    urlObj.searchParams.set("pool_timeout", "30");
    adjustedDbUrl = urlObj.toString();
  } catch (e) {
    adjustedDbUrl = dbUrl + (dbUrl.includes("?") ? "&" : "?") + "connection_limit=20&pool_timeout=30";
  }
}

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

// Robust database query wrapper with exponential backoff retry to handle transient connection drops/timeouts/shutdowns
async function dbQueryWithRetry<T>(fn: () => Promise<T>, retries = 15, delayMs = 600): Promise<T> {
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
        console.warn(`[DB RETRY] Database query failed (attempt ${attempt}/${retries}). Retrying in ${Math.round(delayMs)}ms... Error: ${errMsg}`);
        
        // Disconnect & reconnect Prisma client if error is connection/shutdown related so it re-establishes pool on next attempt
        const errStr = (errMsg + " " + String(err?.code || "")).toLowerCase();
        if (errStr.includes('shutting down') || errStr.includes('closed') || errStr.includes('connection') || errStr.includes('fatal') || errStr.includes('econnreset') || errStr.startsWith('p1') || errStr.startsWith('p100')) {
          await prisma.$disconnect().catch(() => {});
          await prisma.$connect().catch(() => {});
        }

        await new Promise(resolve => setTimeout(resolve, delayMs));
        delayMs = Math.min(delayMs * 1.5, 3000);
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

  // SEO Endpoints: robots.txt & sitemap.xml
  app.get("/robots.txt", (req, res) => {
    const robotsPath = path.join(process.cwd(), "public", "robots.txt");
    if (fs.existsSync(robotsPath)) {
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      return res.sendFile(robotsPath);
    }
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.send("User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: https://mebel-plan.ru/sitemap.xml\nHost: https://mebel-plan.ru\n");
  });

  app.get("/sitemap.xml", (req, res) => {
    const sitemapPath = path.join(process.cwd(), "public", "sitemap.xml");
    if (fs.existsSync(sitemapPath)) {
      res.setHeader("Content-Type", "application/xml; charset=utf-8");
      return res.sendFile(sitemapPath);
    }
    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://mebel-plan.ru/</loc><lastmod>2026-08-01</lastmod><changefreq>daily</changefreq><priority>1.0</priority></url></urlset>`);
  });

function transliterate(str: string): string {
  if (!str) return "";
  const ruMap: Record<string, string> = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo', 'ж': 'zh',
    'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o',
    'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'h', 'ц': 'ts',
    'ч': 'ch', 'ш': 'sh', 'щ': 'sch', 'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu',
    'я': 'ya'
  };
  
  return str
    .toLowerCase()
    .split('')
    .map((char) => ruMap[char] !== undefined ? ruMap[char] : (/[a-z0-9]/.test(char) ? char : ''))
    .join('')
    .replace(/[^a-z0-9-]/g, '');
}

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
            const autoAlias = transliterate(parsed.name || "");
            return res.json({ 
              id: doc.docId, 
              companySlug: autoAlias || doc.docId,
              storefrontAlias: parsed.landingPage?.alias || "catalog"
            });
          }
        } catch (e) {}
      }
      res.status(404).json({ error: "No company found for this host" });
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  // Public Catalog/Landing Page API
  app.get("/api/public/company/:aliasOrId", async (req, res) => {
    try {
      const { aliasOrId } = req.params;
      
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
            const savedAlias = parsed.landingPage?.alias;
            const autoAlias = transliterate(parsed.name || "");

            if (savedAlias === aliasOrId || autoAlias === aliasOrId || doc.docId === aliasOrId) {
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
      
      const isErpAllowed = companyData.erpAllowed !== undefined ? !!companyData.erpAllowed : (companyData.erpEnabled !== undefined ? !!companyData.erpEnabled : false);

      const responseData = {
        company: {
          id: companyId,
          ...companyData,
          erpAllowed: isErpAllowed,
          erpEnabled: isErpAllowed,
          erpConfig: companyData.erpConfig || companyData.erpSettings || null,
          erpSettings: companyData.erpSettings || companyData.erpConfig || null,
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

      // Send email notification to company if they configured notification email or general email
      try {
        const companyDoc = await dbQueryWithRetry(() => prisma.dbDocument.findUnique({ where: { path: `companies/${companyId}` } }));
        if (companyDoc) {
          const companyData = JSON.parse(companyDoc.data);
          const landingConfig = companyData.landingPage || {};
          const notificationEmail = (landingConfig.notificationEmail || landingConfig.email || "").trim();

          if (notificationEmail) {
            const companyName = companyData.name || "Онлайн-витрина";
            const subject = `🛍️ Новая заявка с онлайн-витрины "${companyName}"`;
            
            let itemsHtml = "";
            if (cartItems && cartItems.length > 0) {
              itemsHtml = cartItems.map((item: any) => {
                const itemTotal = (item.price || 0) * (item.quantity || 1);
                return `
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: left;">
                    <b style="color: #2d3748;">${item.name}</b>${item.article ? `<br><span style="font-size: 11px; color: #718096;">Артикул: ${item.article}</span>` : ""}
                  </td>
                  <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: center; color: #4a5568;">
                    ${item.quantity} шт.
                  </td>
                  <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right; color: #4a5568; white-space: nowrap;">
                    ${(item.price || 0).toLocaleString()} ₽
                  </td>
                  <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: bold; color: #2d3748; white-space: nowrap;">
                    ${itemTotal.toLocaleString()} ₽
                  </td>
                </tr>`;
              }).join("");
            }

            const rawHtml = `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 20px; background-color: #ffffff; color: #1a202c; box-sizing: border-box;">
                <div style="text-align: center; margin-bottom: 24px; padding-bottom: 20px; border-bottom: 2px solid #e2e8f0;">
                  <div style="font-size: 40px; margin-bottom: 10px;">🛍️</div>
                  <h2 style="color: #4f46e5; margin: 0 0 5px 0; font-size: 22px; font-weight: 800; line-height: 1.3;">Новая заявка с витрины</h2>
                  <p style="margin: 0; color: #718096; font-size: 14px;">Компания: <b style="color: #4a5568;">${companyName}</b></p>
                </div>

                <div style="margin-bottom: 24px; background-color: #f7fafc; padding: 18px; border-radius: 16px; border: 1px solid #edf2f7;">
                  <h3 style="margin-top: 0; margin-bottom: 12px; color: #1a202c; font-size: 15px; font-weight: 700; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;">
                    Данные клиента
                  </h3>
                  <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                    <tbody>
                      <tr>
                        <td style="padding: 6px 0; color: #718096; width: 110px; font-weight: bold;">Имя:</td>
                        <td style="padding: 6px 0; color: #1a202c; font-weight: bold;">${customerName}</td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; color: #718096; font-weight: bold;">Телефон:</td>
                        <td style="padding: 6px 0; color: #1a202c;"><a href="tel:${customerPhone}" style="color: #4f46e5; text-decoration: none; font-weight: bold;">${customerPhone}</a></td>
                      </tr>
                      ${customerEmail ? `
                      <tr>
                        <td style="padding: 6px 0; color: #718096; font-weight: bold;">Email:</td>
                        <td style="padding: 6px 0; color: #1a202c;"><a href="mailto:${customerEmail}" style="color: #4f46e5; text-decoration: none;">${customerEmail}</a></td>
                      </tr>` : ""}
                      ${customerComment ? `
                      <tr>
                        <td style="padding: 6px 0; color: #718096; vertical-align: top; font-weight: bold;">Комментарий:</td>
                        <td style="padding: 6px 0; color: #4a5568; font-style: italic; white-space: pre-line;">${customerComment}</td>
                      </tr>` : ""}
                    </tbody>
                  </table>
                </div>

                <div style="margin-bottom: 24px;">
                  <h3 style="margin-top: 0; margin-bottom: 12px; color: #1a202c; font-size: 15px; font-weight: 700;">
                    Содержимое корзины
                  </h3>
                  <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                    <thead>
                      <tr style="background-color: #edf2f7;">
                        <th style="padding: 10px; text-align: left; border-bottom: 2px solid #cbd5e0; color: #4a5568; font-weight: bold;">Товар</th>
                        <th style="padding: 10px; text-align: center; border-bottom: 2px solid #cbd5e0; color: #4a5568; font-weight: bold; width: 70px;">Кол-во</th>
                        <th style="padding: 10px; text-align: right; border-bottom: 2px solid #cbd5e0; color: #4a5568; font-weight: bold; width: 90px;">Цена</th>
                        <th style="padding: 10px; text-align: right; border-bottom: 2px solid #cbd5e0; color: #4a5568; font-weight: bold; width: 100px;">Итого</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${itemsHtml || `<tr><td colspan="4" style="padding: 15px; text-align: center; color: #a0aec0; font-style: italic;">Корзина пуста</td></tr>`}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colspan="3" style="padding: 15px 10px; text-align: right; font-weight: bold; font-size: 14px; color: #4a5568;">
                          Общая стоимость:
                        </td>
                        <td style="padding: 15px 10px; text-align: right; font-weight: 800; font-size: 16px; color: #4f46e5; white-space: nowrap;">
                          ${(totalPrice || 0).toLocaleString()} ₽
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                <div style="text-align: center; padding-top: 15px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #a0aec0;">
                  Заявка сгенерирована автоматически. Вы можете увидеть её в разделе «Проекты» вашей административной панели.
                </div>
              </div>
            `;

            // Replace newlines with spaces to avoid raw <br> tags being added inside HTML structures
            const htmlMessage = rawHtml.replace(/\n/g, " ");

            await sendEmail(notificationEmail, subject, htmlMessage);
            console.log(`--- [ORDER NOTIFICATION] Sent notification to ${notificationEmail} ---`);
          }
        }
      } catch (mailErr) {
        console.error("Failed to send order email notification:", mailErr);
      }
      
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
      
      const authUser = await dbQueryWithRetry(() => prisma.authUser.upsert({
        where: { email },
        update: { password: hashedPassword },
        create: { email, password: hashedPassword }
      }));

      console.log(`--- [ADMIN SETUP] Upserted user: ${authUser.uid} ---`);

      // Update or Create the DB document for role sync
      const userDocPath = `users/${authUser.uid}`;
      const existingDoc = await dbQueryWithRetry(() => prisma.dbDocument.findUnique({ where: { path: userDocPath } }));
      
      const userData = existingDoc ? JSON.parse(existingDoc.data) : { 
        uid: authUser.uid, 
        email: authUser.email,
        createdAt: new Date().toISOString()
      };
      
      userData.role = "admin";
      userData.isRoot = true; // Flag for global admin panel
      
      if (existingDoc) {
        await dbQueryWithRetry(() => prisma.dbDocument.update({
          where: { path: userDocPath },
          data: { data: JSON.stringify(userData) }
        }));
        console.log(`--- [ADMIN SETUP] Updated existing user document: ${userDocPath} ---`);
      } else {
        await dbQueryWithRetry(() => prisma.dbDocument.create({
          data: {
            path: userDocPath,
            collection: "users",
            docId: authUser.uid,
            data: JSON.stringify(userData)
          }
        }));
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
      const smtpHost = (process.env.SMTP_HOST || 'smtp.timeweb.ru').trim();
      const smtpPort = Number(process.env.SMTP_PORT) || 465;
      const smtpUser = (process.env.SMTP_USER || 'noreply@mebel-plan.ru').trim();
      const smtpPass = (process.env.SMTP_PASS || '').trim();
      
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465, // важно для 465
        auth: {
          user: smtpUser,
          pass: smtpPass
        },
        logger: true,
        debug: true,
        connectionTimeout: 10000,
        socketTimeout: 10000,
        tls: { rejectUnauthorized: false }
      });

      let fromField = (process.env.SMTP_FROM || '').trim();
      if (!fromField) {
        fromField = `"Мебельный калькулятор" <${smtpUser}>`;
      } else {
        // Clean quotes
        if (fromField.startsWith('"') && fromField.endsWith('"')) {
            fromField = fromField.substring(1, fromField.length - 1);
        }
        if (fromField.startsWith("'") && fromField.endsWith("'")) {
            fromField = fromField.substring(1, fromField.length - 1);
        }
        // ensure format "Name" <email> if it has brackets
        if (!fromField.includes('<')) {
           fromField = `"${fromField}" <${smtpUser}>`;
        }
      }

      console.log(`--- [SMTP CONFIG USED] Host: ${smtpHost}, Port: ${smtpPort}, Secure: ${smtpPort === 465}, User: ${smtpUser}, From: ${fromField} ---`);

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
      const user = await dbQueryWithRetry(() => prisma.authUser.findUnique({ where: { email: email.toLowerCase() } }));
      if (!user) {
        return res.json({ status: "ok", message: "Instructions sent if email exists" });
      }

      const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      await dbQueryWithRetry(() => prisma.verificationToken.create({
        data: {
          email: user.email,
          token,
          type: "RESET",
          expiresAt: new Date(Date.now() + 3600000) // 1 hour
        }
      }));

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
      const vToken = await dbQueryWithRetry(() => prisma.verificationToken.findFirst({
        where: { token, type: "RESET", expiresAt: { gt: new Date() } }
      }));

      if (!vToken) return res.status(400).json({ error: "Invalid or expired token" });

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await dbQueryWithRetry(() => prisma.authUser.update({
        where: { email: vToken.email },
        data: { password: hashedPassword }
      }));

      await dbQueryWithRetry(() => prisma.verificationToken.delete({ where: { id: vToken.id } }));

      res.json({ status: "ok" });
    } catch (e) {
      res.status(500).json({ error: "Failed to reset password" });
    }
  });

  app.post("/api/auth/verify-email", async (req, res) => {
    const { token } = req.body;
    try {
      const vToken = await dbQueryWithRetry(() => prisma.verificationToken.findFirst({
        where: { token, type: "VERIFY", expiresAt: { gt: new Date() } }
      }));

      if (!vToken) return res.status(400).json({ error: "Invalid or expired code" });

      await dbQueryWithRetry(() => prisma.authUser.update({
        where: { email: vToken.email },
        data: { verified: true }
      }));

      const user = await dbQueryWithRetry(() => prisma.authUser.findUnique({ where: { email: vToken.email } }));
      await dbQueryWithRetry(() => prisma.verificationToken.delete({ where: { id: vToken.id } }));

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
      const existingUser = await dbQueryWithRetry(() => prisma.authUser.findUnique({ where: { email: lowerEmail } }));
      if (existingUser) {
        return res.status(400).json({ code: 'auth/email-already-in-use', error: 'Email already in use' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      user = await dbQueryWithRetry(() => prisma.authUser.create({
        data: { 
          email: lowerEmail, 
          password: hashedPassword,
          verified: verified ?? false // Allow pre-verified users (e.g. added by admin)
        }
      }));

      if (!verified) {
        const token = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digit code
        await dbQueryWithRetry(() => prisma.verificationToken.create({
          data: {
            email: user.email,
            token,
            type: "VERIFY",
            expiresAt: new Date(Date.now() + 86400000) // 24 hours
          }
        }));

        const emailResult = await sendEmail(
          user.email,
          "Подтверждение регистрации - Мебельный калькулятор",
          `Добро пожаловать в "Мебельный калькулятор"!\n\nДля завершения регистрации, пожалуйста, введите следующий код подтверждения в приложении:\n\nКод: ${token}\n\nЕсли вы не регистрировались в нашем приложении, просто проигнорируйте это письмо.\n\nС уважением,\nКоманда "Мебельный калькулятор"`
        );

        if (typeof emailResult === 'object' && !emailResult.success && process.env.SMTP_HOST) {
          // If SMTP is configured but failed, we cleanup the user so they can try again
          await dbQueryWithRetry(() => prisma.authUser.delete({ where: { uid: user.uid } }));
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
      const user = await dbQueryWithRetry(() => prisma.authUser.findUnique({ where: { email: email.toLowerCase() } }));
      if (!user) return res.status(404).json({ error: "Пользователь не найден" });
      if (user.verified) return res.status(400).json({ error: "Email уже подтвержден" });

      const token = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Delete any existing verification tokens of this type for this email
      await dbQueryWithRetry(() => prisma.verificationToken.deleteMany({
        where: { email: user.email, type: "VERIFY" }
      }));

      // Create new token
      await dbQueryWithRetry(() => prisma.verificationToken.create({
        data: { email: user.email, token, type: "VERIFY", expiresAt: new Date(Date.now() + 86400000) }
      }));

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
      const user = await dbQueryWithRetry(() => prisma.authUser.findUnique({ where: { email: email.toLowerCase() }}));
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
        await dbQueryWithRetry(() => prisma.authUser.update({
          where: { uid },
          data
        }));
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
      await dbQueryWithRetry(() => prisma.authUser.delete({ where: { uid } }));
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
      
      const user = await dbQueryWithRetry(() => prisma.authUser.findUnique({ where: { email: lowerEmail }}));
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
    const { article, name, currentCompanyId, manufacturerArticle, mfgArticle } = req.query;
    try {
      const searchMfg = typeof manufacturerArticle === 'string' ? manufacturerArticle.trim().toLowerCase() : (typeof mfgArticle === 'string' ? mfgArticle.trim().toLowerCase() : "");
      const cleanArticle = typeof article === 'string' ? article.trim().toLowerCase() : "";
      const cleanName = typeof name === 'string' ? name.trim().toLowerCase() : "";

      if (!searchMfg && !cleanArticle && (!cleanName || cleanName.length < 3)) {
        return res.json([]);
      }

      const normMfg = searchMfg.replace(/[^a-z0-9а-яё]/gi, "");
      const normArt = cleanArticle.replace(/[^a-z0-9а-яё]/gi, "");
      const normName = cleanName.replace(/[^a-z0-9а-яё]/gi, "");

      let docs: any[] = [];
      if (searchMfg) {
        const queryTerm = '%' + searchMfg + '%';
        const queryNormTerm = normMfg ? '%' + normMfg + '%' : queryTerm;
        docs = await dbQueryWithRetry(() => prisma.$queryRaw<any[]>`
          SELECT id, "docId", collection, path, data
          FROM "DbDocument"
          WHERE collection LIKE 'companies/%/products'
            AND (LOWER(data) LIKE ${queryTerm} OR LOWER(data) LIKE ${queryNormTerm})
          LIMIT 35
        `);
      } else if (cleanArticle) {
        const queryTerm = '%' + cleanArticle + '%';
        const queryNormTerm = normArt ? '%' + normArt + '%' : queryTerm;
        docs = await dbQueryWithRetry(() => prisma.$queryRaw<any[]>`
          SELECT id, "docId", collection, path, data
          FROM "DbDocument"
          WHERE collection LIKE 'companies/%/products'
            AND (LOWER(data) LIKE ${queryTerm} OR LOWER(data) LIKE ${queryNormTerm})
          LIMIT 35
        `);
      } else if (cleanName && cleanName.length >= 3) {
        docs = await dbQueryWithRetry(() => prisma.$queryRaw<any[]>`
          SELECT id, "docId", collection, path, data
          FROM "DbDocument"
          WHERE collection LIKE 'companies/%/products'
            AND LOWER(data) LIKE ${'%' + cleanName + '%'}
          LIMIT 35
        `);
      }
      
      const normalizedDocs = docs.map(d => ({
        id: d.id,
        docId: d.docId || d.docid,
        collection: d.collection,
        path: d.path,
        data: d.data
      }));
      
      const duplicates: any[] = [];
      const seenIds = new Set<string>();

      const normalize = (s: string) => String(s || "").toLowerCase().replace(/[^a-z0-9а-яё]/gi, "");

      for (const doc of normalizedDocs) {
        let data: any = {};
        try {
          data = typeof doc.data === 'string' ? JSON.parse(doc.data) : doc.data;
        } catch {
          continue;
        }

        const mfgArt = data.manufacturerArticle ? String(data.manufacturerArticle) : "";
        const art = data.article ? String(data.article) : "";
        const vArt = data.vendorArticle ? String(data.vendorArticle) : "";
        const nName = data.name ? String(data.name) : "";

        const nMfgArt = normalize(mfgArt);
        const nArt = normalize(art);
        const nVArt = normalize(vArt);
        const nNameStr = normalize(nName);

        const hasMatchingVariation = data.variations && Array.isArray(data.variations) && data.variations.some((v: any) => {
          const vMfg = normalize(v.manufacturerArticle);
          const vArt = normalize(v.article);
          return (normMfg && (vMfg === normMfg || vMfg.includes(normMfg))) || (normArt && (vArt === normArt || vArt.includes(normArt)));
        });
        
        const matchMfg = normMfg && (nMfgArt === normMfg || nMfgArt.includes(normMfg) || nArt === normMfg || nVArt === normMfg || hasMatchingVariation);
        const matchArticle = normArt && (nArt === normArt || nArt.includes(normArt) || nVArt === normArt || nMfgArt === normArt || hasMatchingVariation);
        const matchName = normName && normName.length >= 3 && nNameStr.includes(normName);
        
        if (matchMfg || matchArticle || matchName) {
          const ukey = `${doc.collection}-${doc.docId}`;
          if (seenIds.has(ukey)) continue;
          seenIds.add(ukey);

          duplicates.push({
            id: doc.docId || doc.id,
            companyId: doc.collection.split('/')[1],
            name: data.name,
            article: data.article,
            vendorArticle: data.vendorArticle,
            manufacturerArticle: data.manufacturerArticle || data.article,
            description: data.description,
            images: data.images || (data.image ? [data.image] : []),
            color: data.color,
            unit: data.unit,
            manufacturer: data.manufacturer,
            category: data.category,
            purchasePrice: data.purchasePrice || data.price || 0,
            dryerWidth: data.dryerWidth,
            dryerBase: data.dryerBase,
            handleMaterial: data.handleMaterial,
            sinkGroup: data.sinkGroup,
            sinkBrand: data.sinkBrand,
            faucetBrand: data.faucetBrand,
            filterBrand: data.filterBrand,
            fastenerGroup: data.fastenerGroup,
            wardrobeGroup: data.wardrobeGroup,
            variations: data.variations || [],
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
      
      let docs: any[] = [];
      if (colPath.endsWith("/products")) {
        docs = await dbQueryWithRetry(() => prisma.$queryRaw<any[]>`
          SELECT id, "docId", collection, path,
            REGEXP_REPLACE(data, 'data:image/[^"]+', '', 'g') as data
          FROM "DbDocument"
          WHERE collection = ${colPath}
        `);
      } else {
        docs = await dbQueryWithRetry(() => prisma.dbDocument.findMany({ where: { collection: colPath } }));
      }

      let mapped = docs.map(d => {
        let parsedData: any = {};
        try {
          parsedData = typeof d.data === 'string' ? JSON.parse(d.data) : (d.data || {});
        } catch {
          parsedData = {};
        }
        return {
          id: d.docId || d.docid || d.id,
          data: parsedData,
          path: d.path
        };
      });
      
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
      const products = await dbQueryWithRetry(() => prisma.dbProduct.findMany());
      res.json(products);
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch products" });
    }
  });

  app.get("/api/products/:id/history", async (req, res) => {
    try {
      const history = await dbQueryWithRetry(() => prisma.priceHistory.findMany({
        where: { productId: req.params.id },
        orderBy: { createdAt: 'desc' }
      }));
      res.json(history);
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch price history" });
    }
  });

  app.post("/api/products", async (req, res) => {
    try {
      const { name, description, price, ownerCompanyId, photos } = req.body;
      const product = await dbQueryWithRetry(() => prisma.dbProduct.create({
        data: { name, description, price, ownerCompanyId, photos, status: "PENDING" }
      }));
      res.json(product);
    } catch (e) {
      res.status(500).json({ error: "Failed to create product" });
    }
  });

  app.patch("/api/products/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { status, name, description, price, photos, changedBy } = req.body;
      
      const oldProduct = await dbQueryWithRetry(() => prisma.dbProduct.findUnique({ where: { id } }));
      
      const product = await dbQueryWithRetry(() => prisma.dbProduct.update({
        where: { id },
        data: { status, name, description, price, photos }
      }));

      if (price !== undefined && oldProduct?.price !== price) {
        await dbQueryWithRetry(() => prisma.priceHistory.create({
          data: {
            productId: id,
            oldPrice: oldProduct?.price,
            newPrice: price,
            changedBy: changedBy || "admin"
          }
        }));
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
      const companyDoc = await dbQueryWithRetry(() => prisma.dbDocument.findUnique({ where: { path: `companies/${companyId}` } }));
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

  // --- ERP System Orders & Stages API ---
  app.get("/api/erp/:companyId/orders", async (req, res) => {
    try {
      const { companyId } = req.params;
      const companyDoc = await dbQueryWithRetry(() => prisma.dbDocument.findUnique({ where: { path: `companies/${companyId}` } }));
      if (!companyDoc) return res.status(404).json({ error: "Компания не найдена" });
      
      const companyData = JSON.parse(companyDoc.data);
      const erpConfig = companyData.erpConfig || companyData.erpSettings || {};
      const webhookUrl = erpConfig.bitrix24WebhookUrl || companyData.bitrix24?.webhookUrl;
      const orderSource = erpConfig.orderSource || (webhookUrl ? 'bitrix24' : 'projects');
      
      // Load saved local ERP production states for this company
      const erpOrderDocs = await dbQueryWithRetry(() => prisma.dbDocument.findMany({
        where: { collection: `companies/${companyId}/erp_orders` }
      }));
      const localErpOrdersMap: Record<string, any> = {};
      for (const d of erpOrderDocs) {
        try {
          localErpOrdersMap[d.docId] = JSON.parse(d.data);
        } catch (e) {}
      }

      let orders: any[] = [];

      if (orderSource === 'bitrix24' && webhookUrl) {
        const categoryId = (erpConfig.bitrix24CategoryId !== undefined && erpConfig.bitrix24CategoryId !== "")
          ? String(erpConfig.bitrix24CategoryId)
          : (companyData.bitrix24?.categoryId !== undefined && companyData.bitrix24?.categoryId !== null
              ? String(companyData.bitrix24.categoryId)
              : "0");

        const startStageId = erpConfig.bitrix24StageId 
          || companyData.bitrix24?.stageId 
          || companyData.bitrix24?.startStageId 
          || "";

        const doneStageId = erpConfig.bitrix24DoneStageId 
          || companyData.bitrix24?.doneStageId 
          || companyData.bitrix24?.finalStageId 
          || companyData.bitrix24?.procurementFinalStageId 
          || "";

        const isSameStage = (st1: string, st2: string, catId: string) => {
          if (!st1 || !st2) return false;
          const s1 = String(st1).trim().toUpperCase();
          const s2 = String(st2).trim().toUpperCase();
          if (s1 === s2) return true;
          if (`C${catId}:${s1}` === s2 || s1 === `C${catId}:${s2}`) return true;
          const s1Clean = s1.startsWith(`C${catId}:`) ? s1.substring(`C${catId}:`.length) : s1;
          const s2Clean = s2.startsWith(`C${catId}:`) ? s2.substring(`C${catId}:`.length) : s2;
          return s1Clean === s2Clean;
        };

        // 1. Fetch pipeline stages to know sequence and human-readable names
        let stagesList: any[] = [];
        try {
          if (categoryId === "0" || !categoryId) {
            const stRes = await fetch(`${webhookUrl}/crm.status.list`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ filter: { ENTITY_ID: "DEAL_STAGE" }, order: { SORT: "ASC" } })
            });
            const stData = await stRes.json();
            stagesList = stData.result || [];
          } else {
            const stRes = await fetch(`${webhookUrl}/crm.dealcategory.stage.list`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: categoryId })
            });
            const stData = await stRes.json();
            stagesList = stData.result || [];
          }
        } catch (stErr) {
          console.warn("Could not fetch Bitrix24 stages list:", stErr);
        }

        // Determine allowed stage IDs range
        const stageIdsInOrder = stagesList.map((s: any) => String(s.STATUS_ID || s.ID || s.id || ''));
        let allowedStageIds: Set<string> | null = null;
        
        let startIndex = -1;
        if (startStageId && stageIdsInOrder.length > 0) {
          startIndex = stageIdsInOrder.findIndex((s: string) => isSameStage(s, startStageId, categoryId));
        }

        let endIndex = -1;
        if (doneStageId && stageIdsInOrder.length > 0) {
          endIndex = stageIdsInOrder.findIndex((s: string) => isSameStage(s, doneStageId, categoryId));
        }

        if (startIndex >= 0) {
          let calcEnd = endIndex;
          if (calcEnd < 0) {
            for (let i = stageIdsInOrder.length - 1; i >= startIndex; i--) {
              const upperS = stageIdsInOrder[i].toUpperCase();
              if (!upperS.includes("WON") && !upperS.includes("LOSE") && !upperS.includes("APOLOGY")) {
                calcEnd = i;
                break;
              }
            }
            if (calcEnd < startIndex) calcEnd = stageIdsInOrder.length - 1;
          }
          const minIdx = Math.min(startIndex, calcEnd);
          const maxIdx = Math.max(startIndex, calcEnd);
          const slice = stageIdsInOrder.slice(minIdx, maxIdx + 1);
          allowedStageIds = new Set(slice);
        }

        // 2. Fetch Deals from Bitrix24
        const dealsFilter: any = {};
        if (categoryId !== undefined && categoryId !== null && categoryId !== "") {
          dealsFilter.CATEGORY_ID = categoryId;
        }

        const dealsRes = await fetch(`${webhookUrl}/crm.deal.list`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            order: { DATE_CREATE: "DESC" },
            filter: dealsFilter,
            select: [
              "ID", "TITLE", "STAGE_ID", "CATEGORY_ID", "OPPORTUNITY", 
              "CURRENCY_ID", "DATE_CREATE", "CLOSEDATE", "DATE_MODIFY",
              "COMMENTS", "ASSIGNED_BY_NAME", "CONTACT_ID", "COMPANY_ID",
              "BEGINDATE", "PROBABILITY", "CLOSED"
            ]
          })
        });

        const dealsData = await dealsRes.json();
        const rawDeals = dealsData.result || [];

        let portalBase = "";
        try {
          const urlObj = new URL(webhookUrl);
          portalBase = `${urlObj.protocol}//${urlObj.host}`;
        } catch (_) {}

        for (const deal of rawDeals) {
          const dealCategory = String(deal.CATEGORY_ID ?? "0");
          if (dealCategory !== categoryId) {
            continue;
          }

          const dealStageId = String(deal.STAGE_ID || "");
          const upperStage = dealStageId.toUpperCase();
          const isClosedInB24 = deal.CLOSED === "Y" || upperStage.includes("WON") || upperStage.includes("LOSE") || upperStage.includes("APOLOGY");

          if (allowedStageIds && allowedStageIds.size > 0) {
            const isInAllowed = Array.from(allowedStageIds).some(allowed => isSameStage(allowed, dealStageId, categoryId));
            if (!isInAllowed) {
              continue;
            }
          } else if (startStageId) {
            if (!isSameStage(dealStageId, startStageId, categoryId)) {
              continue;
            }
          } else {
            if (isClosedInB24) {
              continue;
            }
          }

          if (isClosedInB24 && doneStageId) {
            if (!isSameStage(dealStageId, doneStageId, categoryId)) {
              continue;
            }
          } else if (isClosedInB24 && !doneStageId && !allowedStageIds) {
            continue;
          }

          const orderId = `b24_${deal.ID}`;
          const local = localErpOrdersMap[orderId] || {};

          const matchingStage = stagesList.find((s: any) => isSameStage(String(s.STATUS_ID || s.ID || s.id), dealStageId, categoryId));
          const stageName = matchingStage ? (matchingStage.NAME || matchingStage.name) : dealStageId;

          const opp = Number(deal.OPPORTUNITY) || 0;
          const estArea = local.totalAreaM2 !== undefined ? local.totalAreaM2 : Math.max(6, Math.round((opp > 0 ? (opp / 9500) : 16.5) * 10) / 10);
          const estEdge = local.totalEdgeM !== undefined ? local.totalEdgeM : Math.round(estArea * 2.8);
          const estParts = local.partsCount !== undefined ? local.partsCount : Math.round(estArea * 1.8);
          const estFacades = local.facadesCount !== undefined ? local.facadesCount : Math.round(estArea * 0.35);

          const dealLink = portalBase ? `${portalBase}/crm/deal/details/${deal.ID}/` : undefined;

          orders.push({
            id: orderId,
            orderNumber: deal.TITLE ? deal.TITLE : `Сделка #${deal.ID}`,
            clientName: deal.TITLE || `Клиент #${deal.ID}`,
            projectName: deal.TITLE || `Заказ #${deal.ID}`,
            createdAt: deal.DATE_CREATE ? deal.DATE_CREATE.substring(0, 10) : new Date().toISOString().substring(0, 10),
            deadlineDate: deal.CLOSEDATE ? deal.CLOSEDATE.substring(0, 10) : (deal.BEGINDATE ? deal.BEGINDATE.substring(0, 10) : new Date(Date.now() + 7 * 86400000).toISOString().substring(0, 10)),
            currentStage: local.currentStage || 'queue',
            priority: local.priority || (opp > 250000 ? 'urgent' : (opp > 120000 ? 'high' : 'normal')),
            totalAreaM2: estArea,
            totalEdgeM: estEdge,
            partsCount: estParts,
            facadesCount: estFacades,
            priceTotal: opp,
            status: local.status || 'in_progress',
            bitrixDealId: deal.ID,
            bitrixStageId: deal.STAGE_ID,
            bitrixStageName: stageName,
            bitrixUrl: dealLink,
            comments: deal.COMMENTS || local.comments || "",
            responsibleEmployeeId: local.responsibleEmployeeId,
            responsibleEmployeeName: local.responsibleEmployeeName,
            stageProgress: local.stageProgress || {
              queue: { status: 'in_progress' }
            }
          });
        }
      } else {
        // Internal Projects source
        const projectDocs = await dbQueryWithRetry(() => prisma.dbDocument.findMany({
          where: { collection: `companies/${companyId}/projects` }
        }));

        for (const pDoc of projectDocs) {
          try {
            const project = JSON.parse(pDoc.data);
            const pStatus = project.status || 'draft';
            
            const startStatus = erpConfig.projectStartStatus || 'in_progress';
            if (startStatus === 'in_progress' && pStatus !== 'in_progress' && pStatus !== 'transferred_to_production' && pStatus !== 'landing_order' && pStatus !== 'sent') {
              continue;
            }

            const orderId = `proj_${pDoc.docId}`;
            const local = localErpOrdersMap[orderId] || {};

            const addedProducts = project.data?.addedProducts || [];
            let calcArea = 0;
            let calcParts = 0;
            let calcFacades = 0;
            
            for (const item of addedProducts) {
              const qty = Number(item.quantity) || 1;
              const w = (Number(item.width) || 600) / 1000;
              const h = (Number(item.height) || 720) / 1000;
              const d = (Number(item.depth) || 560) / 1000;
              const itemArea = (2 * (w * h) + 2 * (w * d) + 2 * (h * d)) * qty;
              calcArea += itemArea;
              calcParts += 5 * qty;
              if (item.category === 'facades' || item.type === 'facade' || (item.name && item.name.toLowerCase().includes('фасад'))) {
                calcFacades += qty;
              }
            }

            const finalArea = local.totalAreaM2 !== undefined ? local.totalAreaM2 : Math.max(5, Math.round(calcArea * 10) / 10);
            const finalEdge = local.totalEdgeM !== undefined ? local.totalEdgeM : Math.round(finalArea * 2.5);
            const finalParts = local.partsCount !== undefined ? local.partsCount : Math.max(12, calcParts);
            const finalFacades = local.facadesCount !== undefined ? local.facadesCount : calcFacades;

            orders.push({
              id: orderId,
              orderNumber: `ПР-${pDoc.docId.substring(0, 6).toUpperCase()}`,
              clientName: project.clientInfo?.name || project.createdByName || 'Заказчик',
              projectName: project.name || 'Мебельный проект',
              createdAt: project.createdAt ? project.createdAt.substring(0, 10) : new Date().toISOString().substring(0, 10),
              deadlineDate: project.deadlineDate || new Date(Date.now() + 10 * 86400000).toISOString().substring(0, 10),
              currentStage: local.currentStage || 'queue',
              priority: local.priority || (project.totalPrice > 200000 ? 'high' : 'normal'),
              totalAreaM2: finalArea,
              totalEdgeM: finalEdge,
              partsCount: finalParts,
              facadesCount: finalFacades,
              priceTotal: Number(project.totalPrice) || 0,
              status: local.status || 'in_progress',
              projectId: pDoc.docId,
              comments: project.clientInfo?.comment || local.comments || "",
              responsibleEmployeeId: local.responsibleEmployeeId,
              responsibleEmployeeName: local.responsibleEmployeeName,
              stageProgress: local.stageProgress || {
                queue: { status: 'in_progress' }
              }
            });
          } catch (e) {}
        }
      }

      res.json({
        success: true,
        orderSource,
        orders,
        totalCount: orders.length
      });

    } catch (e: any) {
      console.error("Error fetching ERP orders:", e);
      res.status(500).json({ error: String(e) });
    }
  });

  app.post("/api/erp/:companyId/orders/:orderId/stage", async (req, res) => {
    try {
      const { companyId, orderId } = req.params;
      const { currentStage, stageProgress, status, responsibleEmployeeId, responsibleEmployeeName, comments, priority, totalAreaM2, totalEdgeM, partsCount, facadesCount } = req.body;

      const companyDoc = await dbQueryWithRetry(() => prisma.dbDocument.findUnique({ where: { path: `companies/${companyId}` } }));
      if (!companyDoc) return res.status(404).json({ error: "Компания не найдена" });
      const companyData = JSON.parse(companyDoc.data);
      const erpConfig = companyData.erpConfig || companyData.erpSettings || {};
      const webhookUrl = erpConfig.bitrix24WebhookUrl || companyData.bitrix24?.webhookUrl;

      const orderDocPath = `companies/${companyId}/erp_orders/${orderId}`;
      const existingDoc = await dbQueryWithRetry(() => prisma.dbDocument.findUnique({ where: { path: orderDocPath } }));
      const existingData = existingDoc ? JSON.parse(existingDoc.data) : {};

      const updatedData = {
        ...existingData,
        currentStage: currentStage || existingData.currentStage,
        stageProgress: stageProgress || existingData.stageProgress,
        status: status || existingData.status,
        responsibleEmployeeId: responsibleEmployeeId !== undefined ? responsibleEmployeeId : existingData.responsibleEmployeeId,
        responsibleEmployeeName: responsibleEmployeeName !== undefined ? responsibleEmployeeName : existingData.responsibleEmployeeName,
        comments: comments !== undefined ? comments : existingData.comments,
        priority: priority || existingData.priority,
        totalAreaM2: totalAreaM2 !== undefined ? totalAreaM2 : existingData.totalAreaM2,
        totalEdgeM: totalEdgeM !== undefined ? totalEdgeM : existingData.totalEdgeM,
        partsCount: partsCount !== undefined ? partsCount : existingData.partsCount,
        facadesCount: facadesCount !== undefined ? facadesCount : existingData.facadesCount,
        updatedAt: new Date().toISOString()
      };

      await dbQueryWithRetry(() => prisma.dbDocument.upsert({
        where: { path: orderDocPath },
        create: {
          path: orderDocPath,
          collection: `companies/${companyId}/erp_orders`,
          docId: orderId,
          data: JSON.stringify(updatedData)
        },
        update: {
          data: JSON.stringify(updatedData)
        }
      }));

      // If Bitrix24 order and reached 'ready' stage and doneStageId configured
      if (orderId.startsWith('b24_') && webhookUrl && erpConfig.bitrix24DoneStageId) {
        const bitrixDealId = orderId.replace('b24_', '');
        if (currentStage === 'ready' || status === 'completed') {
          try {
            await fetch(`${webhookUrl}/crm.deal.update`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                id: bitrixDealId,
                fields: {
                  STAGE_ID: erpConfig.bitrix24DoneStageId
                }
              })
            });
            console.log(`[ERP B24 SYNC] Deal ${bitrixDealId} moved to stage ${erpConfig.bitrix24DoneStageId}`);
          } catch (b24Err) {
            console.error("Failed to update Bitrix24 deal stage:", b24Err);
          }
        }
      }

      res.json({ success: true, updatedData });
    } catch (e: any) {
      console.error("Error updating ERP order stage:", e);
      res.status(500).json({ error: String(e) });
    }
  });

  // --- ERP Employees API ---
  app.get("/api/erp/:companyId/employees", async (req, res) => {
    try {
      const { companyId } = req.params;
      const companyDoc = await dbQueryWithRetry(() => prisma.dbDocument.findUnique({ where: { path: `companies/${companyId}` } }));
      if (!companyDoc) return res.status(404).json({ error: "Компания не найдена" });
      const companyData = JSON.parse(companyDoc.data);

      // 1. Fetch all users associated with this company
      const allUserDocs = await dbQueryWithRetry(() => prisma.dbDocument.findMany({
        where: { collection: "users" }
      }));

      // 2. Fetch specific company sub-collections if any
      const companyUserDocs = await dbQueryWithRetry(() => prisma.dbDocument.findMany({
        where: {
          OR: [
            { collection: `companies/${companyId}/users` },
            { collection: `companies/${companyId}/employees` }
          ]
        }
      }));

      // 3. Fetch ERP employee overrides/settings
      const erpEmpDocs = await dbQueryWithRetry(() => prisma.dbDocument.findMany({
        where: { collection: `companies/${companyId}/erp_employees` }
      }));
      const erpEmpMap: Record<string, any> = {};
      for (const d of erpEmpDocs) {
        try {
          erpEmpMap[d.docId] = JSON.parse(d.data);
        } catch (e) {}
      }

      const employeesMap: Map<string, any> = new Map();

      // Helper to determine production department by role
      const getDepartmentForRole = (roleName: string) => {
        const r = (roleName || '').toLowerCase();
        if (r.includes('распил') || r.includes('раскрой')) return 'cutting';
        if (r.includes('кромк')) return 'edging';
        if (r.includes('чпу') || r.includes('присад')) return 'cnc';
        if (r.includes('фасад') || r.includes('покрас')) return 'facades';
        if (r.includes('упаковк')) return 'packing';
        if (r.includes('склад') || r.includes('кладовщ') || r.includes('комплект')) return 'warehouse';
        if (r.includes('сборк') || r.includes('отк')) return 'assembly';
        if (r.includes('начальник') || r.includes('руковод') || r.includes('мастер')) return 'management';
        return 'cutting';
      };

      const isSuperAdminEmail = (e?: string) => {
        if (!e) return false;
        const em = e.toLowerCase().trim();
        return em === 'lk.ivanbobkin@gmail.com' || em === 'superadmin';
      };

      // Add Company Owner if known and not superadmin
      if ((companyData.ownerId || companyData.ownerEmail) && !isSuperAdminEmail(companyData.ownerEmail)) {
        const ownerId = companyData.ownerId || `owner_${companyId}`;
        const ownerOverride = erpEmpMap[ownerId] || {};
        employeesMap.set(ownerId, {
          id: ownerId,
          userId: ownerId,
          name: ownerOverride.name || companyData.ownerName || companyData.contactPerson || companyData.ownerEmail?.split('@')[0] || "Руководитель компании",
          email: companyData.ownerEmail || "",
          phone: ownerOverride.phone || companyData.phone || "",
          role: ownerOverride.role || "Начальник цеха",
          productionRole: ownerOverride.productionRole || "Начальник цеха",
          isProductionEmployee: ownerOverride.isProductionEmployee !== undefined ? ownerOverride.isProductionEmployee : true,
          department: ownerOverride.department || "management",
          rateType: ownerOverride.rateType || "salary",
          baseRate: ownerOverride.baseRate !== undefined ? ownerOverride.baseRate : 100000,
          shiftType: ownerOverride.shiftType || "5/2",
          status: ownerOverride.status || "active",
          isOwner: true
        });
      }

      // Check all users belonging to company
      for (const uDoc of allUserDocs) {
        try {
          const uData = JSON.parse(uDoc.data);
          if (uData.companyId === companyId || uData.companySlug === companyId || uData.companyAlias === companyId) {
            const uid = uDoc.docId;
            const override = erpEmpMap[uid] || {};
            const prodRole = override.productionRole || uData.productionRole || (uData.role === 'admin' ? 'Начальник цеха' : (uData.position || 'Оператор станка'));
            
            employeesMap.set(uid, {
              id: uid,
              userId: uid,
              name: override.name || uData.name || uData.displayName || (uData.email ? uData.email.split('@')[0] : 'Сотрудник'),
              email: uData.email || override.email || '',
              phone: override.phone || uData.phone || '',
              role: prodRole,
              productionRole: prodRole,
              isProductionEmployee: override.isProductionEmployee !== undefined ? override.isProductionEmployee : (uData.isProductionEmployee !== undefined ? uData.isProductionEmployee : true),
              department: override.department || getDepartmentForRole(prodRole),
              rateType: override.rateType || uData.rateType || 'piecework',
              baseRate: override.baseRate !== undefined ? override.baseRate : (uData.baseRate || 55000),
              shiftType: override.shiftType || uData.shiftType || '2/2',
              status: override.status || uData.status || 'active',
              isOwner: uData.role === 'admin' || uData.isOwner
            });
          }
        } catch (e) {}
      }

      // Check company-specific user documents
      for (const cuDoc of companyUserDocs) {
        try {
          const cuData = JSON.parse(cuDoc.data);
          const uid = cuDoc.docId;
          const override = erpEmpMap[uid] || {};
          const prodRole = override.productionRole || cuData.productionRole || cuData.position || cuData.role || 'Оператор станка';

          if (!employeesMap.has(uid)) {
            employeesMap.set(uid, {
              id: uid,
              userId: uid,
              name: override.name || cuData.name || cuData.displayName || cuData.email?.split('@')[0] || 'Сотрудник цеха',
              email: cuData.email || override.email || '',
              phone: override.phone || cuData.phone || '',
              role: prodRole,
              productionRole: prodRole,
              isProductionEmployee: override.isProductionEmployee !== undefined ? override.isProductionEmployee : (cuData.isProductionEmployee !== undefined ? cuData.isProductionEmployee : true),
              department: override.department || getDepartmentForRole(prodRole),
              rateType: override.rateType || cuData.rateType || 'piecework',
              baseRate: override.baseRate !== undefined ? override.baseRate : (cuData.baseRate || 55000),
              shiftType: override.shiftType || cuData.shiftType || '2/2',
              status: override.status || cuData.status || 'active'
            });
          }
        } catch (e) {}
      }

      // If any ERP employees were created locally via ERP
      for (const erpId of Object.keys(erpEmpMap)) {
        if (!employeesMap.has(erpId)) {
          const emp = erpEmpMap[erpId];
          employeesMap.set(erpId, {
            id: erpId,
            userId: erpId,
            name: emp.name || 'Сотрудник',
            email: emp.email || '',
            phone: emp.phone || '',
            role: emp.productionRole || emp.role || 'Распиловщик',
            productionRole: emp.productionRole || emp.role || 'Распиловщик',
            isProductionEmployee: emp.isProductionEmployee !== undefined ? emp.isProductionEmployee : true,
            department: emp.department || getDepartmentForRole(emp.productionRole || emp.role),
            rateType: emp.rateType || 'piecework',
            baseRate: emp.baseRate || 55000,
            shiftType: emp.shiftType || '2/2',
            status: emp.status || 'active'
          });
        }
      }

      const employees = Array.from(employeesMap.values()).filter(e => {
        if (isSuperAdminEmail(e.email)) return false;
        if (e.isSuperAdmin || e.role === 'superadmin' || e.productionRole === 'superadmin') return false;
        return true;
      });

      res.json({
        success: true,
        employees,
        totalCount: employees.length
      });
    } catch (e: any) {
      console.error("Error fetching ERP employees:", e);
      res.status(500).json({ error: String(e) });
    }
  });

  app.post("/api/erp/:companyId/employees", async (req, res) => {
    try {
      const { companyId } = req.params;
      const { employees } = req.body;
      if (!Array.isArray(employees)) {
        return res.status(400).json({ error: "employees must be an array" });
      }

      for (const emp of employees) {
        if (!emp.id) continue;
        const docPath = `companies/${companyId}/erp_employees/${emp.id}`;
        const existingDoc = await dbQueryWithRetry(() => prisma.dbDocument.findUnique({ where: { path: docPath } }));
        const existing = existingDoc ? JSON.parse(existingDoc.data) : {};

        const updated = {
          ...existing,
          ...emp,
          id: emp.id,
          updatedAt: new Date().toISOString()
        };

        await dbQueryWithRetry(() => prisma.dbDocument.upsert({
          where: { path: docPath },
          create: {
            path: docPath,
            collection: `companies/${companyId}/erp_employees`,
            docId: emp.id,
            data: JSON.stringify(updated)
          },
          update: {
            data: JSON.stringify(updated)
          }
        }));

        // Also sync back to user document if it exists in users collection
        const userDocPath = `users/${emp.id}`;
        const userDoc = await dbQueryWithRetry(() => prisma.dbDocument.findUnique({ where: { path: userDocPath } }));
        if (userDoc) {
          try {
            const uObj = JSON.parse(userDoc.data);
            if (updated.name) uObj.name = updated.name;
            if (updated.productionRole) uObj.productionRole = updated.productionRole;
            if (updated.isProductionEmployee !== undefined) uObj.isProductionEmployee = updated.isProductionEmployee;
            await dbQueryWithRetry(() => prisma.dbDocument.update({
              where: { path: userDocPath },
              data: { data: JSON.stringify(uObj) }
            }));
          } catch (e) {}
        }
      }

      res.json({ success: true, count: employees.length });
    } catch (e: any) {
      console.error("Error saving ERP employees:", e);
      res.status(500).json({ error: String(e) });
    }
  });

  app.post("/api/erp/:companyId/employees/:employeeId", async (req, res) => {
    try {
      const { companyId, employeeId } = req.params;
      const empData = req.body;

      const docPath = `companies/${companyId}/erp_employees/${employeeId}`;
      const existingDoc = await dbQueryWithRetry(() => prisma.dbDocument.findUnique({ where: { path: docPath } }));
      const existing = existingDoc ? JSON.parse(existingDoc.data) : {};

      const updated = {
        ...existing,
        ...empData,
        id: employeeId,
        updatedAt: new Date().toISOString()
      };

      await dbQueryWithRetry(() => prisma.dbDocument.upsert({
        where: { path: docPath },
        create: {
          path: docPath,
          collection: `companies/${companyId}/erp_employees`,
          docId: employeeId,
          data: JSON.stringify(updated)
        },
        update: {
          data: JSON.stringify(updated)
        }
      }));

      // Also sync back to user document if it exists in users collection
      const userDocPath = `users/${employeeId}`;
      const userDoc = await dbQueryWithRetry(() => prisma.dbDocument.findUnique({ where: { path: userDocPath } }));
      if (userDoc) {
        try {
          const uObj = JSON.parse(userDoc.data);
          uObj.productionRole = updated.productionRole;
          uObj.isProductionEmployee = updated.isProductionEmployee;
          await dbQueryWithRetry(() => prisma.dbDocument.update({
            where: { path: userDocPath },
            data: { data: JSON.stringify(uObj) }
          }));
        } catch (e) {}
      }

      res.json({ success: true, employee: updated });
    } catch (e: any) {
      console.error("Error updating ERP employee:", e);
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
