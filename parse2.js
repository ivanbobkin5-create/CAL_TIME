const fs = require('fs');
const lines = fs.readFileSync('src/App.tsx', 'utf8').split('\n');
let start = 20864;
let depth = 0;
for(let i=start; i<25980; i++) {
  const line = lines[i];
  if (!line) continue;
  
  const open = (line.match(/<div/g) || []).length;
  const close = (line.match(/<\/div>/g) || []).length;
  depth += (open - close);
  
  if (i > 25930) {
    console.log(`L${i+1}: D=${depth} | ${line}`);
  }
}
