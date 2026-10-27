import nodemailer from "nodemailer";
import * as dotenv from "dotenv";
dotenv.config();

async function main() {
  const smtpPort = (process.env.SMTP_PORT || "587").trim();
  const isSecure = smtpPort === "465" || (process.env.SMTP_SECURE || "").trim() === "true";
  const smtpHost = (process.env.SMTP_HOST || "").trim();
  const smtpUser = (process.env.SMTP_USER || "").trim();
  const smtpPass = (process.env.SMTP_PASS || "").trim();
  let fromField = (process.env.SMTP_FROM || "").trim();
  
  if (fromField.startsWith('"') && fromField.endsWith('"')) {
      fromField = fromField.substring(1, fromField.length - 1);
  }
  if (fromField.startsWith("'") && fromField.endsWith("'")) {
      fromField = fromField.substring(1, fromField.length - 1);
  }
  fromField = fromField.replace(/[\.\s]+$/, '');
  if (!fromField) fromField = `"Мебельный калькулятор" <${smtpUser}>`;

  console.log(`Host: ${smtpHost}, Port: ${smtpPort}, Secure: ${isSecure}, User: ${smtpUser}, From: ${fromField}`);

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: parseInt(smtpPort),
    secure: isSecure,
    auth: { user: smtpUser, pass: smtpPass },
    logger: true,
    debug: true,
    tls: { rejectUnauthorized: false }
  });

  try {
    const info = await transporter.sendMail({
      from: fromField,
      to: "lk.ivanbobkin@gmail.com",
      subject: "Тестовое письмо",
      text: "Проверка новой почты",
    });
    console.log("Success:", info.messageId);
  } catch (error) {
    console.error("Error:", error);
  }
}
main();
