const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const target = `        logger: true,
        debug: true,
        connectionTimeout: 10000,
        socketTimeout: 10000
      });`;

const replacement = `        logger: true,
        debug: true,
        connectionTimeout: 10000,
        socketTimeout: 10000,
        tls: { rejectUnauthorized: false }
      });`;

code = code.replace(target, replacement);
fs.writeFileSync('server.ts', code);
