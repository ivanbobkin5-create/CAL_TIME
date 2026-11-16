import nodemailer from "nodemailer";
async function test() {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_PORT === "465", 
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: { rejectUnauthorized: false }
  });
  const message = "Test";
  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: "ivan@mebel-faktura.ru",
      subject: "Test",
      text: message,
      html: message,
    });
    console.log("Success:", info.messageId);
  } catch (err) {
    console.error("Error:", err);
  }
}
test();
