import "reflect-metadata";
import { DataSource } from "typeorm";
// Remove ConfigModule/ConfigService imports as they cause issues outside Nest context
// import { ConfigModule, ConfigService } from '@nestjs/config';
import * as dotenv from "dotenv"; // Import dotenv
import * as path from "path"; // Import path module
// Remove ES Module specific imports
// import { fileURLToPath } from 'url';

// Dynamically load environment variables based on NODE_ENV
const envFilePath =
  process.env.NODE_ENV === "production"
    ? ".env.production"
    : ".env.development";

// Load environment variables relative to the project root (wherever the command is run from)
// Assumes CLI is run from the 'app' directory.
const projectRoot = process.cwd();
// Correct the path and keep the assignment
const envConfig = dotenv.config({
  path: path.resolve(projectRoot, envFilePath),
});

if (envConfig.error) {
  console.warn(`Warning: Could not load ${envFilePath} file.`, envConfig.error);
}

// Ensure DATABASE_URL is loaded before defining options
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error(
    "Error: DATABASE_URL environment variable is not set or could not be loaded.",
  );
  // Optionally throw an error to halt the process if URL is absolutely required
  // throw new Error('DATABASE_URL environment variable is not set.');
}

// Configuration for TypeORM CLI and runtime
export const dataSourceOptions = {
  type: "postgres",
  url: databaseUrl,
  synchronize: false, // Always false when using migrations
  logging: process.env.NODE_ENV === "development",
  entities: [
    // Use path relative to CWD (app), pointing to compiled JS files in dist
    path.join(projectRoot, "dist/**/*.entity.js"),
  ],
  migrations: [
    // Use path relative to CWD (app), pointing to compiled JS files in dist
    path.join(projectRoot, "dist/migrations/*.js"),
  ],
  migrationsTableName: "typeorm_migrations",
  // Conditionally apply SSL based on NODE_ENV or a specific check
  // Enable SSL for non-development environments (like production connecting to Supabase)
  ssl:
    process.env.NODE_ENV !== "development"
      ? { rejectUnauthorized: false }
      : false,
};

// Export a DataSource instance for the CLI
// Use type assertion carefully
const AppDataSource = new DataSource(dataSourceOptions as any);

export default AppDataSource;
