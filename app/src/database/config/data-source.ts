import "reflect-metadata";
import { DataSource } from "typeorm";
import { config } from "dotenv";
import * as path from "path";

// Load environment-specific .env similar to application bootstrap
const nodeEnv = process.env.NODE_ENV || "development";
const envFileMap: Record<string, string> = {
  development: ".env.development",
  test: ".env.test",
  performance: ".env.performance",
  production: ".env.production",
};

const envFile = envFileMap[nodeEnv] || ".env";
config({ path: path.resolve(process.cwd(), envFile) });

const environment = process.env.NODE_ENV || "development";

export const createDataSource = (env: string = environment): DataSource => {
  const isTest = env === "test";

  const entitiesPath = isTest
    ? path.join(__dirname, "../../**/*.entity.ts")
    : path.join(__dirname, "../../../dist/**/*.entity.js");

  const migrationsPath = isTest
    ? path.join(__dirname, "../migrations/**/*.ts")
    : path.join(__dirname, "../migrations/**/*.js");

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
