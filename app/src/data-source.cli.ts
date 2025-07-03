import 'reflect-metadata';
import { DataSource, DataSourceOptions } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config(); // Load from root .env file

// This file is exclusively for TypeORM CLI operations.
// It uses a simple, direct configuration that relies ONLY on environment variables.
// This avoids the complex, app-level logic in the main data-source.ts,
// ensuring migrations can run reliably in any environment (local dev, CI, etc.).

const isProduction = process.env.NODE_ENV === 'production';

// ENV sanity guard (duplicated for CLI context)
(() => {
  const hasUrl = !!process.env.DATABASE_URL;
  const hasPieces =
    !!process.env.POSTGRES_USER ||
    !!process.env.DB_USERNAME ||
    !!process.env.POSTGRES_HOST;

  if (hasUrl && hasPieces && process.env.NODE_ENV !== 'development') {
    throw new Error(
      'Ambiguous DB configuration: Both DATABASE_URL and POSTGRES_* individual variables are set.',
    );
  } else if (hasUrl && hasPieces) {
    console.warn('[DEV] Ambiguous DB config detected (DATABASE_URL + pieces).');
  }
})();

// Fallback: construct DATABASE_URL from POSTGRES_* variables for containerised environments
if (!process.env.DATABASE_URL) {
  const { POSTGRES_HOST, POSTGRES_PORT = '5432', POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB } =
    process.env as Record<string, string | undefined>;

  if (POSTGRES_HOST && POSTGRES_USER && POSTGRES_PASSWORD && POSTGRES_DB) {
    process.env.DATABASE_URL = `postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}`;
    console.log('[CLI] Composed DATABASE_URL from POSTGRES_* variables');
  } else {
    throw new Error(
      'DATABASE_URL is not set and POSTGRES_* variables are incomplete. CLI operations require a connection string.',
    );
  }
}

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  synchronize: false,
  logging: !isProduction,
  // Corrected paths for the compiled JS output in the dist folder.
  // The script runs from dist/src/data-source.cli.js, so __dirname is /usr/src/app/dist/src
  entities: [__dirname + '/microservices/**/*.entity.js'],
  migrations: [__dirname + '/database/migrations/*.js'],
  migrationsTableName: 'typeorm_migrations',
} as DataSourceOptions); 