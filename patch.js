const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');
const target = `      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || "587"),
        secure: process.env.SMTP_PORT === "465", 
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },`;
const replacement = `      const smtpPort = String(process.env.SMTP_PORT || "587").trim();
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
        },`;
code = code.replace(target, replacement);
fs.writeFileSync('server.ts', code);
