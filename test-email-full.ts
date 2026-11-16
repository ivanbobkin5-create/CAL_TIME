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
  
  const message = `Добро пожаловать в "Мебельный калькулятор"!\n\nДля завершения регистрации, пожалуйста, введите следующий код подтверждения в приложении:\n\nКод: 123456\n\nЕсли вы не регистрировались в нашем приложении, просто проигнорируйте это письмо.\n\nС уважением,\nКоманда "Мебельный калькулятор"`;
  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: "lk.ivanbobkin@gmail.com",
      subject: "Подтверждение регистрации - Мебельный калькулятор",
      text: message,
      html: message.replace(/\n/g, '<br>'),
    });
    console.log("Success:", info.messageId);
  } catch (err) {
    console.error("Error:", err);
  }
}
test();
