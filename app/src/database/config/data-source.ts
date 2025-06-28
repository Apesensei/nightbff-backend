import "reflect-metadata";
import { DataSource } from "typeorm";
import { config } from "dotenv";
import * as path from "path";

config();

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

  // Default to development configuration that works
  return new DataSource({
    type: "postgres",
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "5432"),
    username: process.env.DB_USERNAME || "admin",
    password: process.env.DB_PASSWORD || "testpass",
    database: process.env.DB_DATABASE || "nightbff_dev",
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
