const fs = require('fs');
const path = require('path');

// Source and destination paths
const standaloneDir = '.next/standalone';
const staticDir = '.next/static';
const destApp = 'release/app';

// Clean and create destination directory
if (fs.existsSync(destApp)) {
  fs.rmSync(destApp, { recursive: true });
}
fs.mkdirSync(destApp, { recursive: true });

// Copy Next.js standalone build to release/app
fs.cpSync(standaloneDir, destApp, { recursive: true });

// Copy static files to the correct location
fs.mkdirSync(path.join(destApp, '.next', 'static'), { recursive: true });
fs.cpSync(staticDir, path.join(destApp, '.next', 'static'), { recursive: true });

// Copy Electron dist files
fs.cpSync('dist', path.join(destApp, 'dist'), { recursive: true });

// Fix package.json in the app directory
const appPkgPath = path.join(destApp, 'package.json');
const appPkg = JSON.parse(fs.readFileSync(appPkgPath, 'utf8'));

// Remove conflicting fields and set correct main
delete appPkg.build;
delete appPkg.scripts;
appPkg.main = './dist/main/main.js';

fs.writeFileSync(appPkgPath, JSON.stringify(appPkg, null, 2));

console.log('Next.js standalone build prepared in release/app');
