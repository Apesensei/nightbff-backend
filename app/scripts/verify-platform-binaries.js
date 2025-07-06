#!/usr/bin/env node

/**
 * Verify Platform-Specific Binaries
 * 
 * Ensures critical platform-specific dependencies (Pact, Sharp) are properly
 * installed for the current platform. Fails early in CI if binaries are missing.
 * 
 * Usage: node scripts/verify-platform-binaries.js
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const PLATFORM = os.platform();
const ARCH = os.arch();

// Map Node.js platform/arch to package suffixes
const PLATFORM_MAPPINGS = {
  'linux-x64': 'linux-x64-glibc',
  'linux-arm64': 'linux-arm64-glibc', 
  'darwin-x64': 'darwin-x64',
  'darwin-arm64': 'darwin-arm64',
  'win32-x64': 'windows-x64'
};

const platformKey = `${PLATFORM}-${ARCH}`;
const expectedSuffix = PLATFORM_MAPPINGS[platformKey];

if (!expectedSuffix) {
  console.warn(`⚠️  Platform ${platformKey} not explicitly supported, skipping binary verification`);
  process.exit(0);
}

console.log(`🔍 Verifying platform-specific binaries for ${platformKey} (${expectedSuffix})`);

const REQUIRED_PACKAGES = [
  {
    name: 'Pact FFI',
    path: `node_modules/@pact-foundation/pact-core-${expectedSuffix}`,
    critical: true
  }
];

let hasErrors = false;

for (const pkg of REQUIRED_PACKAGES) {
  const fullPath = path.join(process.cwd(), pkg.path);
  
  if (fs.existsSync(fullPath)) {
    console.log(`✅ ${pkg.name}: Found at ${pkg.path}`);
  } else {
    const level = pkg.critical ? '❌' : '⚠️ ';
    console.log(`${level} ${pkg.name}: Missing at ${pkg.path}`);
    
    if (pkg.critical) {
      hasErrors = true;
      console.log(`   💡 Try: npm ci --include=optional`);
      console.log(`   💡 Or set: NPM_CONFIG_INCLUDE_OPTIONAL=true`);
    }
  }
}

if (hasErrors) {
  console.log('\n❌ Critical platform-specific binaries are missing!');
  console.log('   This will cause test failures in CI environments.');
  console.log('   Ensure npm install includes optional dependencies.');
  process.exit(1);
} else {
  console.log('\n✅ All required platform-specific binaries are available');
  process.exit(0);
} 