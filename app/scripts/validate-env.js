#!/usr/bin/env node
/*
 * Environment validator – works in both dev (TypeScript) and production (compiled JS).
 */
const fs = require('fs');
const path = require('path');

// Load environment files based on NODE_ENV
const nodeEnv = process.env.NODE_ENV || 'development';
const configDir = path.resolve(__dirname, '../../config/env');

// Load base env first
require('dotenv').config({ path: path.join(configDir, 'base.env') });

// Load environment-specific env file (override base values)
require('dotenv').config({ 
  path: path.join(configDir, `${nodeEnv}.env`), 
  override: true 
});

console.log(`🔧 Loaded env config: base + ${nodeEnv}`);

function resolveValidator() {
  // Prefer compiled JS when running inside a Docker production image
  const compiled = path.resolve(__dirname, '../dist/src/config/env.schema.js');
  if (fs.existsSync(compiled)) {
    return require(compiled).validateEnv;
  }
  // Fallback to TS source (register ts-node on the fly)
  require('ts-node/register');
  return require('../src/config/env.schema').validateEnv;
}

try {
  const validateEnv = resolveValidator();
  validateEnv();
  console.log('✅ Environment validation passed.');
} catch (err) {
  console.error('❌ Environment validation failed:\n', err.message || err);
  process.exit(1);
} 