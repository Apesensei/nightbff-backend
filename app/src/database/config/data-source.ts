import "reflect-metadata";
import { DataSource } from "typeorm";
import { config } from "dotenv";
import * as path from "path";

// Load environment-specific .env similar to application bootstrap
const nodeEnv = process.env.NODE_ENV || "development";
const envFileMap: Record<string, string> = {
  development: path.join("config", "env", "development.env"),
  test: path.join("config", "env", "test.env"),
  performance: path.join("config", "env", "performance.env"),
  integration: path.join("config", "env", "integration.env"),
  production: path.join("config", "env", "production.env"),
};

const envFile = envFileMap[nodeEnv] || path.join("config", "env", "development.env");

// Resolve path relative to repo root. `__dirname` = app/src/database/config
// so four levels up reaches repo root.
const rootDir = path.resolve(__dirname, "../../../../");
const envPathResolved = path.join(rootDir, envFile);
console.log('[DEBUG] loading env file', envPathResolved);
config({ path: envPathResolved });

const environment = process.env.NODE_ENV || "development";

export const createDataSource = (env: string = environment): DataSource => {
  const isTest = env === "test";

  // Resolve paths from the project root to avoid "dist/dist" duplication after compilation.
  // After the TypeScript build, `process.cwd()` inside the container is `/usr/src/app` and
  // all compiled JS lives under `/usr/src/app/dist`.
  const projectRoot = process.cwd();

  const entitiesPath = isTest
    ? path.join(projectRoot, "src/**/*.entity.ts")
    : path.join(projectRoot, "dist/**/*.entity.js");

  const migrationsPath = isTest
    ? path.join(projectRoot, "src/database/migrations/**/*.ts")
    : path.join(projectRoot, "dist/database/migrations/**/*.js");

  if (env === "test") {
    return new DataSource({
      type: "sqlite",
      database: ":memory:",
      synchronize: true,
      dropSchema: true,
      logging: false,
      entities: [path.join(__dirname, "../../**/*.entity.ts")],
      migrations: [],
      migrationsTableName: "typeorm_migrations_test",
    });
  }

  // Prefer DATABASE_URL if supplied (aligns with canonical rule)
  if (process.env.DATABASE_URL) {
    return new DataSource({
      type: "postgres",
      url: process.env.DATABASE_URL,
      entities: [entitiesPath],
      migrations: [migrationsPath],
      synchronize: false,
      migrationsRun: false,
      migrationsTableName: "typeorm_migrations",
      logging: env === "development",
      extra: {
        max: parseInt(process.env.DB_POOL_SIZE || "20", 10),
        min: 2,
        acquireTimeoutMillis: 30000,
        idleTimeoutMillis: 600000,
      },
    });
  }

  // Fallback legacy DB_* variables (will be deprecated)
  console.log('[DEBUG] Using POSTGRES_HOST', process.env.POSTGRES_HOST, 'PORT', process.env.POSTGRES_PORT);
  return new DataSource({
    type: "postgres",
    host: process.env.POSTGRES_HOST || process.env.DB_HOST || "localhost",
    port: parseInt(process.env.POSTGRES_PORT || process.env.DB_PORT || "5432"),
    username: process.env.POSTGRES_USER || process.env.DB_USERNAME || "admin",
    password: process.env.POSTGRES_PASSWORD || process.env.DB_PASSWORD || "testpass",
    database: process.env.POSTGRES_DB || process.env.DB_DATABASE || "nightbff_dev",
    entities: [entitiesPath],
    migrations: [migrationsPath],
    synchronize: false,
    migrationsRun: false,
    migrationsTableName: "typeorm_migrations",
    logging: env === "development",
    extra: {
      max: parseInt(process.env.DB_POOL_SIZE || "20", 10),
      min: 2,
      acquireTimeoutMillis: 30000,
      idleTimeoutMillis: 600000,
    },
  });
};

export const AppDataSource = createDataSource();
export default AppDataSource;
