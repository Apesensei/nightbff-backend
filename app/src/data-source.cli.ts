import 'reflect-metadata';
import { DataSource, DataSourceOptions } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config(); // Load from root .env file

// This file is exclusively for TypeORM CLI operations.
// It uses a simple, direct configuration that relies ONLY on environment variables.
// This avoids the complex, app-level logic in the main data-source.ts,
// ensuring migrations can run reliably in any environment (local dev, CI, etc.).

const isProduction = process.env.NODE_ENV === 'production';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set. CLI operations require it.');
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