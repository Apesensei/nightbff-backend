/**
 * Centralized environment loader for NightBFF scripts.
 * Loads config/env/base.env and config/env/${NODE_ENV}.env (if present).
 * Later files override earlier ones (industry standard).
 * Logs loaded files for traceability.
 *
 * Usage: import or require this file at the top of any direct Node script.
 * Keep this file in sync with integration_scan/backend/app/scripts/load-env.ts.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

const envDir = path.resolve(__dirname, '../../config/env');
const baseEnvPath = path.join(envDir, 'base.env');
const nodeEnv = process.env.NODE_ENV || 'development';
const envPaths = [baseEnvPath, path.join(envDir, `${nodeEnv}.env`)];

for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    const result = dotenv.config({ path: envPath, override: true });
    if (result.error) {
      console.error(`[env-loader] Error loading ${envPath}:`, result.error);
    } else {
      console.log(`[env-loader] Loaded: ${envPath}`);
    }
  } else {
    console.log(`[env-loader] Not found: ${envPath}`);
  }
} 