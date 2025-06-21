import "reflect-metadata";
import { DataSource, DataSourceOptions } from "typeorm";
// Remove ConfigModule/ConfigService imports as they cause issues outside Nest context
// import { ConfigModule, ConfigService } from '@nestjs/config';
import * as dotenv from "dotenv"; // Import dotenv
import * as path from "path"; // Import path module
import * as fs from "fs"; // Added fs import
// Remove ES Module specific imports
// import { fileURLToPath } from 'url';

// Dynamically determine the environment and load the appropriate .env file
const nodeEnv = process.env.NODE_ENV || "development"; // Default to development
const isTest = nodeEnv === "test";
const isProduction = nodeEnv === "production";

console.log(`[DATA_SOURCE_DEBUG] NODE_ENV: ${nodeEnv}`); // DEBUG LOG

// Load environment variables relative to the project root
const projectRoot = process.cwd();
const envFilePath =
  nodeEnv === "performance"
    ? path.resolve(projectRoot, ".env.performance")
    : path.resolve(projectRoot, ".env");

console.log(`[DATA_SOURCE_DEBUG] Resolved envFilePath: ${envFilePath}`);
console.log(`[DATA_SOURCE_DEBUG] process.cwd(): ${process.cwd()}`);

// Log specific process.env values BEFORE dotenv processing
console.log(
  `[DATA_SOURCE_DEBUG] process.env.DB_USERNAME (before dotenv): ${process.env.DB_USERNAME}`,
);
console.log(
  `[DATA_SOURCE_DEBUG] process.env.DB_PASSWORD (before dotenv): ${process.env.DB_PASSWORD ? "******" : undefined}`,
);
console.log(
  `[DATA_SOURCE_DEBUG] process.env.DB_DATABASE (before dotenv): ${process.env.DB_DATABASE}`,
);
console.log(
  `[DATA_SOURCE_DEBUG] process.env.POSTGRES_USER (before dotenv): ${process.env.POSTGRES_USER}`,
);
console.log(
  `[DATA_SOURCE_DEBUG] process.env.POSTGRES_PASSWORD (before dotenv): ${process.env.POSTGRES_PASSWORD ? "******" : undefined}`,
);
console.log(
  `[DATA_SOURCE_DEBUG] process.env.POSTGRES_DB (before dotenv): ${process.env.POSTGRES_DB}`,
);
console.log(
  `[DATA_SOURCE_DEBUG] process.env.DATABASE_URL (before dotenv): ${process.env.DATABASE_URL}`,
);

let envConfig: dotenv.DotenvConfigOutput = { parsed: undefined };

// Always attempt to load the .env file
envConfig = dotenv.config({ path: envFilePath });

if (envConfig.error) {
  console.warn(
    `[DATA_SOURCE_DEBUG] Error loading ${envFilePath}:`,
    envConfig.error.message,
  );
} else {
  console.log(
    `[DATA_SOURCE_DEBUG] Successfully loaded ${envFilePath} via dotenv. Parsed content keys: ${envConfig.parsed ? Object.keys(envConfig.parsed).join(", ") : "N/A"}`,
  );

  // ---- BEGIN RAW FILE CONTENT DUMP ----
  try {
    const rawFileContent = fs.readFileSync(envFilePath, "utf-8");
    console.log(`[DATA_SOURCE_RAW_CONTENT_DUMP] First 500 chars of ${envFilePath}:
---BEGIN DUMP---
${rawFileContent.substring(0, 500)}
---END DUMP---`);
  } catch (readError: any) {
    console.error(
      `[DATA_SOURCE_RAW_CONTENT_DUMP] Error reading ${envFilePath} directly:`,
      readError.message,
    );
  }
  // ---- END RAW FILE CONTENT DUMP ----

  // Log parsed values from dotenv for specific critical variables
  console.log("--- PARSED .ENV VALUES (dotenv) ---");
  if (envConfig.parsed) {
    console.log(
      `[DATA_SOURCE_DEBUG] dotenv.parsed.POSTGRES_USER: ${envConfig.parsed.POSTGRES_USER}`,
    );
    console.log(
      `[DATA_SOURCE_DEBUG] dotenv.parsed.POSTGRES_PASSWORD: ${envConfig.parsed.POSTGRES_PASSWORD ? "******" : undefined}`,
    );
    console.log(
      `[DATA_SOURCE_DEBUG] dotenv.parsed.POSTGRES_DB: ${envConfig.parsed.POSTGRES_DB}`,
    );
    console.log(
      `[DATA_SOURCE_DEBUG] dotenv.parsed.DB_USERNAME: ${envConfig.parsed.DB_USERNAME}`,
    );
    console.log(
      `[DATA_SOURCE_DEBUG] dotenv.parsed.DB_PASSWORD: ${envConfig.parsed.DB_PASSWORD ? "******" : undefined}`,
    );
    console.log(
      `[DATA_SOURCE_DEBUG] dotenv.parsed.DB_DATABASE: ${envConfig.parsed.DB_DATABASE}`,
    );
    console.log(
      `[DATA_SOURCE_DEBUG] dotenv.parsed.DATABASE_URL: ${envConfig.parsed.DATABASE_URL ? envConfig.parsed.DATABASE_URL.replace(/:[^@]*@/, ":<password_hidden>@") : undefined}`,
    );
  } else {
    console.log(
      "[DATA_SOURCE_DEBUG] envConfig.parsed is undefined after dotenv.config()",
    );
  }
  console.log("--- END PARSED .ENV VALUES (dotenv) ---");
}

// Remove complex final assignment logic for now. The TypeORM connection will likely fail,
// but we are focused on what dotenv is parsing.
const dbHost = envConfig.parsed?.DB_HOST || process.env.DB_HOST;
const dbPort = parseInt(
  envConfig.parsed?.DB_PORT || process.env.DB_PORT || "5432",
  10,
);

// Explicitly prioritize parsed POSTGRES_ values, then parsed DB_ values, then process.env fallbacks
const dbUsername =
  envConfig.parsed?.POSTGRES_USER ||
  envConfig.parsed?.DB_USERNAME ||
  process.env.POSTGRES_USER ||
  process.env.DB_USERNAME;
const dbPassword =
  envConfig.parsed?.POSTGRES_PASSWORD ||
  envConfig.parsed?.DB_PASSWORD ||
  process.env.POSTGRES_PASSWORD ||
  process.env.DB_PASSWORD;
const dbDatabase =
  envConfig.parsed?.POSTGRES_DB ||
  envConfig.parsed?.DB_DATABASE ||
  process.env.POSTGRES_DB ||
  process.env.DB_DATABASE;

console.log(`[DATA_SOURCE_DEBUG] Final dbHost: ${dbHost}`);
console.log(`[DATA_SOURCE_DEBUG] Final dbPort: ${dbPort}`);
console.log(`[DATA_SOURCE_DEBUG] Final dbUsername: ${dbUsername}`);
console.log(
  `[DATA_SOURCE_DEBUG] Final dbPassword: ${dbPassword ? "******" : undefined}`,
);
console.log(`[DATA_SOURCE_DEBUG] Final dbDatabase: ${dbDatabase}`);

// Define base entity and migration paths
const entitiesPath = path.join(
  projectRoot,
  isTest ? "src/**/*.entity.ts" : "dist/**/*.entity.js", // Use TS files for tests
);
const migrationsPath = path.join(
  projectRoot,
  isTest ? "src/database/migrations/*.ts" : "dist/src/database/migrations/*.js", // CORRECTED path for JS
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
  // Configuration for PostgreSQL (Development/Production/Performance)
  // Try to use individual DB_* variables first, as seen in the mounted .env.performance
  let databaseUrl =
    process.env.DATABASE_URL ||
    (envConfig.parsed && envConfig.parsed.DATABASE_URL);

  // Check for valid dbPort (not NaN) if not using DATABASE_URL
  if (!databaseUrl && !(dbHost && !isNaN(dbPort) && dbUsername && dbDatabase)) {
    // Added !isNaN(dbPort) check
    const errorMessage = `Error: Database configuration is incomplete. Neither DATABASE_URL nor all DB_HOST/PORT/USERNAME/DATABASE variables are set or could be loaded from ${path.basename(envFilePath)}. Ensure DB_PORT is a valid number.`;
    console.error(errorMessage);
    console.error("Loaded envConfig.parsed:", envConfig.parsed); // Log what dotenv parsed
    console.error("Parsed DB Vars:", {
      dbHost,
      dbPort,
      dbUsername,
      dbDatabase,
      databaseUrl,
    }); // Log parsed vars
    throw new Error(errorMessage);
  }

  if (databaseUrl) {
    options = {
      type: "postgres",
      url: databaseUrl,
      synchronize: false,
      logging: !isProduction,
      entities: [entitiesPath],
      migrations: [migrationsPath],
      migrationsTableName: "typeorm_migrations",
      migrationsTransactionMode: "none",
      ssl: isProduction ? { rejectUnauthorized: false } : false,
      // Connection pool optimization for performance testing
      extra: {
        max: parseInt(process.env.DB_POOL_SIZE || "10", 10), // Max connections in pool
        min: 2, // Minimum connections maintained
        acquireTimeoutMillis: parseInt(
          process.env.DB_POOL_ACQUIRE_TIMEOUT || "30000",
          10,
        ),
        idleTimeoutMillis: parseInt(
          process.env.DB_POOL_IDLE_TIMEOUT || "600000",
          10,
        ),
        createTimeoutMillis: 20000, // Time to wait for connection creation
        destroyTimeoutMillis: 5000, // Time to wait for connection destruction
        reapIntervalMillis: 1000, // Frequency to check for idle connections
        createRetryIntervalMillis: 200, // Delay between connection retry attempts
        propagateCreateError: false, // Continue on connection creation errors
      },
    };
    console.log(
      `[DATA_SOURCE_DEBUG] Using DATABASE_URL: ${databaseUrl ? databaseUrl.replace(/:[^:]*@/, ":<password_hidden>@") : undefined}`,
    );
    console.log(
      `[DATA_SOURCE_DEBUG] Connection pool config: max=${process.env.DB_POOL_SIZE || "10"}, acquireTimeout=${process.env.DB_POOL_ACQUIRE_TIMEOUT || "30000"}ms`,
    );
  } else {
    // Construct options from individual DB_* variables
    options = {
      type: "postgres",
      host: dbHost,
      port: dbPort,
      username: dbUsername,
      password: dbPassword,
      database: dbDatabase,
      synchronize: false,
      logging: !isProduction,
      entities: [entitiesPath],
      migrations: [migrationsPath],
      migrationsTableName: "typeorm_migrations",
      migrationsTransactionMode: "none",
      ssl: isProduction ? { rejectUnauthorized: false } : false,
      // Connection pool optimization for performance testing
      extra: {
        max: parseInt(process.env.DB_POOL_SIZE || "10", 10), // Max connections in pool
        min: 2, // Minimum connections maintained
        acquireTimeoutMillis: parseInt(
          process.env.DB_POOL_ACQUIRE_TIMEOUT || "30000",
          10,
        ),
        idleTimeoutMillis: parseInt(
          process.env.DB_POOL_IDLE_TIMEOUT || "600000",
          10,
        ),
        createTimeoutMillis: 20000, // Time to wait for connection creation
        destroyTimeoutMillis: 5000, // Time to wait for connection destruction
        reapIntervalMillis: 1000, // Frequency to check for idle connections
        createRetryIntervalMillis: 200, // Delay between connection retry attempts
        propagateCreateError: false, // Continue on connection creation errors
      },
    };
    console.log(
      `[DATA_SOURCE_DEBUG] Using individual DB variables: user=${dbUsername}, db=${dbDatabase}`,
    );
    console.log(
      `[DATA_SOURCE_DEBUG] Connection pool config: max=${process.env.DB_POOL_SIZE || "10"}, acquireTimeout=${process.env.DB_POOL_ACQUIRE_TIMEOUT || "30000"}ms`,
    );
  }
}

export const dataSourceOptions: DataSourceOptions = options;

// Export a DataSource instance for the CLI and application use
export const AppDataSource = new DataSource(dataSourceOptions);
