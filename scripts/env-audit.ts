#!/usr/bin/env ts-node
/*
 * env-audit.ts – inventories every .env* file in the repo and produces
 * a tab-separated snapshot at audit/ENV_SNAPSHOT_<yyyy-mm-dd>.tsv
 *
 * Columns: KEY <tab> VALUE <tab> FILE
 * Comment lines (#) and blank lines are ignored.
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { dirname, join } from 'path';

function listTrackedFiles(): string[] {
  const output = execSync('git ls-files -z', { encoding: 'utf8' });
  return output
    .split('\0')
    .filter((p) => p && /\.env(\.|$)/.test(p));
}

function today(): string {
  const d = new Date();
  return d.toISOString().split('T')[0];
}

function main() {
  const files = listTrackedFiles();

  const rows: string[] = [];

  for (const file of files) {
    const content = readFileSync(file, 'utf8');
    const lines = content.split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const value = trimmed.slice(eqIdx + 1).trim();
      rows.push(`${key}\t${value}\t${file}`);
    }
  }

  // ensure audit dir exists
  if (!existsSync('audit')) {
    mkdirSync('audit');
  }

  const outfile = join('audit', `ENV_SNAPSHOT_${today()}.tsv`);
  writeFileSync(outfile, rows.join('\n'), 'utf8');
  console.log(`✅ Environment audit written to ${outfile} (${rows.length} rows)`);
}

main(); 