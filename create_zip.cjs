const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

try {
  execSync('npm install --no-save adm-zip', { stdio: 'ignore' });
  const AdmZip = require('adm-zip');
  const zip = new AdmZip();

  const ignoreList = ['node_modules', 'dist', 'dev-dist', '.git', 'public/project.zip', 'public/source_code.zip'];

  function addFolder(dirPath, zipPath) {
    const items = fs.readdirSync(dirPath);
    for (const item of items) {
      if (ignoreList.includes(item)) continue;
      const fullPath = path.join(dirPath, item);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        const newZipPath = zipPath ? `${zipPath}/${item}` : item;
        zip.addLocalFolder(fullPath, newZipPath);
      } else {
        zip.addLocalFile(fullPath, zipPath);
      }
    }
  }

  addFolder('.', '');
  zip.writeZip('public/project_source.zip');
  console.log('Zip created successfully at public/project_source.zip');
} catch (e) {
  console.error(e);
}
