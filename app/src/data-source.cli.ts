import "reflect-metadata";
import { DataSource, DataSourceOptions } from "typeorm";
import path from "path";
import fs from "fs";

// Dynamic path resolution for load-env.js that works in both test and production contexts
const loadEnvPath = path.resolve(__dirname, "../scripts/load-env.js");
const loadEnvPathAlt = path.resolve(
  __dirname,
  "../../dist/scripts/load-env.js",
);

(async () => {
  if (fs.existsSync(loadEnvPath)) {
    await import(loadEnvPath);
    console.log("[DEBUG] Loaded env from:", loadEnvPath);
  } else if (fs.existsSync(loadEnvPathAlt)) {
    await import(loadEnvPathAlt);
    console.log("[DEBUG] Loaded env from:", loadEnvPathAlt);
  } else {
    console.warn("[WARN] load-env.js not found, skipping env loading");
  }
})();

console.log("[DEBUG] FULL ENV:", process.env);
console.log("[DEBUG] POSTGRES_USER:", process.env.POSTGRES_USER);
console.log("[DEBUG] DATABASE_URL:", process.env.DATABASE_URL);
import { validateEnv } from "./config/env.schema";

// Validate environment early to fail fast
validateEnv();

// This file is exclusively for TypeORM CLI operations.
// It uses a simple, direct configuration that relies ONLY on environment variables.
// This avoids the complex, app-level logic in the main data-source.ts,
// ensuring migrations can run reliably in any environment (local dev, CI, etc.).

const isProduction = process.env.NODE_ENV === "production";

// ENV sanity guard (duplicated for CLI context)
(() => {
  const hasUrl = !!process.env.DATABASE_URL;
  const hasPieces =
    !!process.env.POSTGRES_USER ||
    !!process.env.DB_USERNAME ||
    !!process.env.POSTGRES_HOST;

  if (hasUrl && hasPieces && process.env.NODE_ENV !== "development") {
    throw new Error(
      "Ambiguous DB configuration: Both DATABASE_URL and POSTGRES_* individual variables are set.",
    );
  } else if (hasUrl && hasPieces) {
    console.warn("[DEV] Ambiguous DB config detected (DATABASE_URL + pieces).");
  }
})();

// Fallback: construct DATABASE_URL from POSTGRES_* variables for containerised environments
if (!process.env.DATABASE_URL) {
  const {
    POSTGRES_HOST,
    POSTGRES_PORT = "57599",
    POSTGRES_USER,
    POSTGRES_PASSWORD,
    POSTGRES_DB,
  } = process.env as Record<string, string | undefined>;

  if (POSTGRES_HOST && POSTGRES_USER && POSTGRES_PASSWORD && POSTGRES_DB) {
    process.env.DATABASE_URL = `postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}`;
    console.log("[CLI] Composed DATABASE_URL from POSTGRES_* variables");
  } else {
    throw new Error(
      "DATABASE_URL is not set and POSTGRES_* variables are incomplete. CLI operations require a connection string.",
    );
  }
}

export const AppDataSource = new DataSource({
  type: "postgres",
  url: process.env.DATABASE_URL,
  synchronize: false,
  logging: !isProduction,
  // Locked migration patterns - always use compiled JS files from dist/
  entities: [__dirname + "/microservices/**/*.entity.js"],
  migrations: ["dist/src/database/migrations/*.js"],
  migrationsTableName: "typeorm_migrations",
  migrationsTransactionMode: "each",
} as DataSourceOptions);
