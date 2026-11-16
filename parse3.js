const fs = require('fs');
const lines = fs.readFileSync('src/App.tsx', 'utf8').split('\n');
let start = 20864;
let depth = 0;
let output = [];
for(let i=start; i<25950; i++) {
  const line = lines[i];
  if (!line) continue;
  
  const open = (line.match(/<div/g) || []).length;
  const close = (line.match(/<\/div>/g) || []).length;
  depth += (open - close);
  
  if (open > 0 || close > 0) {
    output.push(`L${i+1}: D=${depth} | ${line}`);
  }
}
fs.writeFileSync('div_trace.txt', output.join('\n'));
