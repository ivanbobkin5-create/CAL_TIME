const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');
const target = `      // Validating "from" field to avoid 550 error.
      // If SMTP_FROM contains <, it's likely already formatted.
      let fromField: string;
      if (process.env.SMTP_FROM) {
        let cleanedFrom = process.env.SMTP_FROM.trim();
        // Remove surrounding quotes if present (e.g. if entered literally in ENV string)
        if (cleanedFrom.startsWith('"') && cleanedFrom.endsWith('"')) {
            cleanedFrom = cleanedFrom.substring(1, cleanedFrom.length - 1);
        }
        if (cleanedFrom.startsWith("'") && cleanedFrom.endsWith("'")) {
            cleanedFrom = cleanedFrom.substring(1, cleanedFrom.length - 1);
        }
        fromField = cleanedFrom.replace(/[\\.\\s]+$/, '');
      } else {
        fromField = \`"Мебельный калькулятор" <\${smtpUser}>\`;
      }`;
const replacement = `      // Validating "from" field to avoid 550 error.
      let fromField: string;
      const smtpFromName = (process.env.SMTP_FROM || "").trim();
      if (smtpFromName) {
        let cleanedFrom = smtpFromName;
        if (cleanedFrom.startsWith('"') && cleanedFrom.endsWith('"')) {
            cleanedFrom = cleanedFrom.substring(1, cleanedFrom.length - 1);
        }
        if (cleanedFrom.startsWith("'") && cleanedFrom.endsWith("'")) {
            cleanedFrom = cleanedFrom.substring(1, cleanedFrom.length - 1);
        }
        cleanedFrom = cleanedFrom.replace(/[\\.\\s]+$/, '');
        if (cleanedFrom.includes('<') && cleanedFrom.includes('>')) {
            fromField = cleanedFrom;
        } else {
            fromField = \`"\${cleanedFrom}" <\${smtpUser}>\`;
        }
      } else {
        fromField = \`"Мебельный калькулятор" <\${smtpUser}>\`;
      }`;
code = code.replace(target, replacement);
fs.writeFileSync('server.ts', code);
