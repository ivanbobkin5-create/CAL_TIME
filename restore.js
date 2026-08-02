const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const marker = 'className="px-12 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-md hover:shadow-lg disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2 justify-center cursor-pointer"';
const markerIndex = code.indexOf(marker);

if (markerIndex !== -1) {
  const cutoff = markerIndex + marker.length;
  // The original file is: first 171 characters + everything after `cutoff`
  const originalFile = code.substring(0, 171) + code.substring(cutoff);
  fs.writeFileSync('src/App.tsx', originalFile);
  console.log("File restored!");
} else {
  console.log("Marker not found.");
}
