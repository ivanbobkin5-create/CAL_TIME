const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const targetLookup = `            const autoAlias = transliterate(parsed.name || "");
            return res.json({ id: doc.docId, alias: parsed.landingPage?.alias || autoAlias || doc.docId });`;

const replacementLookup = `            const autoAlias = transliterate(parsed.name || "");
            return res.json({ 
              id: doc.docId, 
              companySlug: autoAlias || doc.docId,
              storefrontAlias: parsed.landingPage?.alias || "catalog"
            });`;

code = code.replace(targetLookup, replacementLookup);

// Also remove parsed.landingPage?.alias from the company lookup so it ONLY looks by company slug or id!
// Wait, if I remove it, existing users who used alias as the first path segment might break.
// But the new design says the first segment is always company slug!

const targetFind = `          return parsed.landingPage?.alias === aliasOrId || autoAlias === aliasOrId || doc.docId === aliasOrId;`;
const replacementFind = `          return autoAlias === aliasOrId || doc.docId === aliasOrId;`;
code = code.replace(targetFind, replacementFind);

fs.writeFileSync('server.ts', code);
console.log("Patched server.ts");
