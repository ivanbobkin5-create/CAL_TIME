const fs = require('fs');
const code = fs.readFileSync('src/App.tsx', 'utf8');
const lines = code.split('\n');
let start = 0;
for(let i=0; i<lines.length; i++) {
  if (lines[i].includes('{isAddingProduct && (')) {
    start = i;
    break;
  }
}

let depth = 0;
for(let i=start; i<start+10000; i++) {
  const line = lines[i];
  if (!line) continue;
  
  const open = (line.match(/<div/g) || []).length;
  const close = (line.match(/<\/div>/g) || []).length;
  depth += (open - close);
  
  if (i > start + 5000 && line.includes('flex justify-end gap-4 rounded-b-3xl')) {
    console.log(`Line ${i+1}: Footer div found, depth is ${depth}, diff: ${open-close}`);
  }
  
  if (depth === 0 && open === 0 && close > 0) {
    console.log(`Line ${i+1}: Modal fully closed`);
    break;
  }
}
