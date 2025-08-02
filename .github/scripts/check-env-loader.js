// CI check: Ensure all direct Node scripts use the centralized env loader
const fs = require('fs');
const path = require('path');

const PKG_PATHS = [
  path.join(__dirname, '../../app/package.json'),
  path.join(__dirname, '../../integration_scan/backend/app/package.json'),
];

const REQUIRED_FLAG = '--require ./dist/scripts/load-env.js';
let failed = false;

for (const pkgPath of PKG_PATHS) {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  for (const [name, cmd] of Object.entries(pkg.scripts || {})) {
    if (cmd.startsWith('node ') && !cmd.includes(REQUIRED_FLAG)) {
      console.error(`❌ Script '${name}' in ${pkgPath} is missing the env loader preload flag.`);
      failed = true;
    }
  }
}

if (failed) {
  process.exit(1);
} else {
  console.log('✅ All Node scripts use the centralized env loader.');
} 