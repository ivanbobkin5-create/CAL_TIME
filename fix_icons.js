const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

let blockStart = code.indexOf('return (\n                      <div className="absolute top-4 right-4 flex flex-col gap-2 translate-x-12 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-300 z-20">');
let blockEndStr = '                        )}\n                      </div>\n                    );';
let blockEnd = code.indexOf(blockEndStr, blockStart) + blockEndStr.length;

if (blockStart !== -1 && blockEnd !== -1) {
  let block = code.substring(blockStart, blockEnd);
  block = block.replace(/top-4 right-4 flex flex-col gap-2/g, 'top-3 right-3 flex flex-col gap-1.5');
  block = block.replace(/p-2/g, 'p-1.5');
  block = block.replace(/rounded-xl/g, 'rounded-lg');
  block = block.replace(/w-4 h-4/g, 'w-3.5 h-3.5');
  
  code = code.substring(0, blockStart) + block + code.substring(blockEnd);
  fs.writeFileSync('src/App.tsx', code);
  console.log("Fixed icons in ProductsView.");
} else {
  console.log("Could not find block in ProductsView.");
}
