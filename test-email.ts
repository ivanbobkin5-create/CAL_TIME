import nodemailer from "nodemailer";
import * as dotenv from "dotenv";
dotenv.config();

async function main() {
  console.log("SMTP_HOST:", process.env.SMTP_HOST);
  console.log("SMTP_USER:", process.env.SMTP_USER);
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.timeweb.ru",
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_PORT === "465",
    auth: {
      user: process.env.SMTP_USER || "support@zovitemebelschikov.ru",
      pass: process.env.SMTP_PASS, // I don't know it, but process.env should have it
    },
    logger: true,
    debug: true,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
    tls: { rejectUnauthorized: false }
  });

  const fromField = process.env.SMTP_FROM || `"Мебельный Калькулятор" <support@zovitemebelschikov.ru>`;
  
  try {
    const info = await transporter.sendMail({
      from: fromField,
      to: "lk.ivanbobkin@yandex.ru",
      subject: "Test email",
      text: "Test email body",
    });
    console.log("Success:", info.messageId);
  } catch (error) {
    console.error("Error:", error);
  }
}
main();
