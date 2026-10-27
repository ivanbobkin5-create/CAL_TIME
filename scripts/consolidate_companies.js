const fs = require('fs');
const path = require('path');

const storeFile = path.resolve(__dirname, '../data/db_fallback.json');
if (!fs.existsSync(storeFile)) {
  console.log('File data/db_fallback.json not found');
  process.exit(0);
}

try {
  const store = JSON.parse(fs.readFileSync(storeFile, 'utf8'));
  const docs = store.documents || {};
  let migratedCount = 0;
  let deletedCount = 0;

  for (const key of Object.keys(docs)) {
    const parts = key.split('/');
    if (parts[0] === 'companies' && parts.length > 1) {
      const cid = parts[1];
      if (cid !== 'e5om9lzxh') {
        if (parts.length === 2) {
          delete docs[key];
          deletedCount++;
        } else {
          const rest = parts.slice(2).join('/');
          const newKey = 'companies/e5om9lzxh/' + rest;
          const oldDoc = docs[key];
          try {
            const parsed = JSON.parse(oldDoc.data);
            if (parsed && typeof parsed === 'object') {
              if (parsed.companyId) parsed.companyId = 'e5om9lzxh';
              if (parsed.ownerCompanyId) parsed.ownerCompanyId = 'e5om9lzxh';
              oldDoc.data = JSON.stringify(parsed);
            }
          } catch (_) {}
          oldDoc.path = newKey;
          oldDoc.collection = 'companies/e5om9lzxh/' + parts.slice(2, -1).join('/');
          if (!docs[newKey]) {
            docs[newKey] = oldDoc;
            migratedCount++;
          }
          delete docs[key];
          deletedCount++;
        }
      }
    }
  }

  const users = store.users || {};
  for (const uid in users) {
    if (users[uid]) {
      users[uid].companyId = 'e5om9lzxh';
    }
  }

  fs.writeFileSync(storeFile, JSON.stringify(store), 'utf8');
  console.log('Migration done! Migrated subdocs:', migratedCount, 'Deleted old keys:', deletedCount);
  const remainingTop = Object.keys(store.documents).filter(k => k.startsWith('companies/') && k.split('/').length === 2);
  console.log('Remaining top level companies:', remainingTop);
} catch (err) {
  console.error('Migration error:', err);
}
