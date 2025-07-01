// validate-env.js – Runtime environment sanity checks before NestJS/TypeORM starts

/* eslint-disable no-console */
const dotenv = require('dotenv');
const { URL } = require('url');

// Load local .env if present (does not overwrite already-set vars)
// This allows the script to be used both locally and inside CI where the
// env is already injected.
dotenv.config({ override: false });

function fail(message) {
  console.error(`\u001b[31m[ENV VALIDATOR ERROR]\u001b[0m ${message}`);
  process.exitCode = 1;
}

// Gather variables
const {
  DATABASE_URL,
  POSTGRES_USER,
  POSTGRES_PASSWORD,
  POSTGRES_HOST,
  POSTGRES_PORT,
  POSTGRES_DB,
} = process.env;

// ---------------------------------------------------------------------------
// 1. Ensure at least one complete connection definition exists
// ---------------------------------------------------------------------------
const haveDatabaseUrl = Boolean(DATABASE_URL);
const havePostgresFamily =
  POSTGRES_USER && POSTGRES_PASSWORD && POSTGRES_HOST && POSTGRES_PORT && POSTGRES_DB;

if (!haveDatabaseUrl && !havePostgresFamily) {
  fail(
    'No database connection configured. Define either DATABASE_URL or the full POSTGRES_* variable set.'
  );
}

// ---------------------------------------------------------------------------
// 2. If both families are present, ensure they are equivalent (no drift)
// ---------------------------------------------------------------------------
if (haveDatabaseUrl && havePostgresFamily) {
  let parsed;
  try {
    parsed = new URL(DATABASE_URL);
  } catch (err) {
    fail(`DATABASE_URL is not a valid URI: ${err.message}`);
  }

  // postgres://user:pass@host:port/db
  const mismatch =
    parsed.username !== POSTGRES_USER ||
    parsed.hostname !== POSTGRES_HOST ||
    parsed.port !== String(POSTGRES_PORT) ||
    parsed.pathname.replace(/^\//, '') !== POSTGRES_DB;

  if (mismatch) {
    fail(
      'Both DATABASE_URL and POSTGRES_* are set but resolve to different connections. Remove one family.'
    );
  }
}

// ---------------------------------------------------------------------------
// 3. Basic sanity: port range & SSL for production
// ---------------------------------------------------------------------------
function withinRange(p) {
  const n = Number(p);
  return Number.isInteger(n) && n >= 1024 && n <= 65535;
}

const effectivePort = haveDatabaseUrl ? new URL(DATABASE_URL).port : POSTGRES_PORT;
if (effectivePort && !withinRange(effectivePort)) {
  fail(`PostgreSQL port ${effectivePort} is outside the safe range 1024-65535.`);
}

if (process.env.NODE_ENV === 'production') {
  if (haveDatabaseUrl && !DATABASE_URL.includes('sslmode')) {
    console.warn('[ENV VALIDATOR] Production build without sslmode in DATABASE_URL');
  }
}

// ---------------------------------------------------------------------------
// 4. Success message
// ---------------------------------------------------------------------------
console.log('\u001b[32m[ENV VALIDATOR]\u001b[0m Environment variables look sane.'); 