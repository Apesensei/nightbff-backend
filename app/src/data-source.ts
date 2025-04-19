import "reflect-metadata";
import { DataSource, DataSourceOptions } from "typeorm";
// Remove ConfigModule/ConfigService imports as they cause issues outside Nest context
// import { ConfigModule, ConfigService } from '@nestjs/config';
import * as dotenv from "dotenv"; // Import dotenv
import * as path from "path"; // Import path module
// Remove ES Module specific imports
// import { fileURLToPath } from 'url';

// Dynamically determine the environment and load the appropriate .env file
const nodeEnv = process.env.NODE_ENV || "development"; // Default to development
const isTest = nodeEnv === "test";
const isProduction = nodeEnv === "production";

// Load environment variables relative to the project root
const projectRoot = process.cwd();
const envFilePath = path.resolve(
  projectRoot,
  isTest ? ".env.test" : isProduction ? ".env.production" : ".env.development",
);

const envConfig = dotenv.config({ path: envFilePath });

if (envConfig.error) {
  console.warn(
    `Warning: Could not load ${path.basename(envFilePath)} file.`,
    envConfig.error,
  );
}

// Define base entity and migration paths
const entitiesPath = path.join(
  projectRoot,
  isTest ? "src/**/*.entity.ts" : "dist/**/*.entity.js", // Use TS files for tests
);
const migrationsPath = path.join(
  projectRoot,
  isTest ? "src/database/migrations/*.ts" : "dist/database/migrations/*.js", // Use TS files for tests, Corrected path for JS
);

// Configuration options for TypeORM
let options: DataSourceOptions;

if (isTest) {
  // Configuration for SQLite (Testing)
  options = {
    type: "sqlite",
    database: ":memory:", // Use in-memory database for tests
    synchronize: true, // Auto-create schema for tests
    logging: false, // Disable logging for tests
    entities: [entitiesPath],
    migrations: [migrationsPath], // Include migrations even for sync mode if needed for data seeding
    migrationsTableName: "typeorm_migrations_test", // Use separate table for test migrations if run
    dropSchema: true, // Drop schema before starting test runs
  };
} else {
  // Configuration for PostgreSQL (Development/Production)
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    const errorMessage = `Error: DATABASE_URL environment variable is not set or could not be loaded from ${path.basename(
      envFilePath,
    )}.`;
    console.error(errorMessage);
    throw new Error(errorMessage);
  }

  options = {
    type: "postgres",
    url: databaseUrl,
    synchronize: false, // Never synchronize in dev/prod, use migrations
    logging: !isProduction, // Log SQL in development
    entities: [entitiesPath],
    migrations: [migrationsPath],
    migrationsTableName: "typeorm_migrations",
    migrationsTransactionMode: "none",
    ssl: isProduction ? { rejectUnauthorized: false } : false, // Enable SSL only in production
  };
}

export const dataSourceOptions: DataSourceOptions = options;

// Export a DataSource instance for the CLI and application use
export const AppDataSource = new DataSource(dataSourceOptions);
