const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const targetRegex = /try \{\s*const smtpPort = \(process\.env\.SMTP_PORT \|\| "587"\)\.trim\(\);[\s\S]*?const info = await transporter\.sendMail\(\{/m;

const replacement = `try {
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
        socketTimeout: 10000
      });

      let fromField = (process.env.SMTP_FROM || '').trim();
      if (!fromField) {
        fromField = \`"Мебельный калькулятор" <\${smtpUser}>\`;
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
           fromField = \`"\${fromField}" <\${smtpUser}>\`;
        }
      }

      console.log(\`--- [SMTP CONFIG USED] Host: \${smtpHost}, Port: \${smtpPort}, Secure: \${smtpPort === 465}, User: \${smtpUser}, From: \${fromField} ---\`);

      const info = await transporter.sendMail({`;

code = code.replace(targetRegex, replacement);
fs.writeFileSync('server.ts', code);
