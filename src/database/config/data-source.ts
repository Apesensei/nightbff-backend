import 'reflect-metadata';
import { DataSource, DataSourceOptions } from 'typeorm';
import { config } from 'dotenv';
import * as path from 'path';

// Load environment variables
config();

const environment = process.env.NODE_ENV || 'development';

/**
 * Industry-Standard TypeORM Data Source Configuration
 * Supports multiple environments with environment-specific overrides
 */
export const createDataSource = (env: string = environment): DataSource => {
  const isTest = env === 'test';
  const isProduction = env === 'production';
  const isPerformance = env === 'performance';
  
  // Base configuration common to all environments
  const baseConfig: Partial<DataSourceOptions> = {
    type: 'postgres',
    entities: [
      isTest 
        ? path.join(__dirname, '../../**/*.entity.ts')
        : path.join(__dirname, '../../../dist/**/*.entity.js')
    ],
    migrations: [
      isTest
        ? path.join(__dirname, '../migrations/**/*.ts')
        : path.join(__dirname, '../../../dist/src/database/migrations/**/*.js')
    ],
    synchronize: false, // NEVER true in production
    migrationsRun: false,
    migrationsTableName: 'typeorm_migrations',
    migrationsTransactionMode: 'none',
    logging: false,
    ssl: false,
  };

  // Environment-specific configurations
  const envConfigs: Record<string, Partial<DataSourceOptions>> = {
    development: {
      ...baseConfig,
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      username: process.env.DB_USERNAME || 'admin',
      password: process.env.DB_PASSWORD || 'testpass',
      database: process.env.DB_DATABASE || 'nightbff_dev',
      logging: true,
      extra: {
        max: 20,
        min: 2,
        acquireTimeoutMillis: 30000,
        idleTimeoutMillis: 600000,
      },
    },
    
    test: {
      type: 'sqlite',
      database: ':memory:',
      synchronize: true,
      dropSchema: true,
      logging: false,
      entities: [path.join(__dirname, '../../**/*.entity.ts')],
      migrations: [],
      migrationsTableName: 'typeorm_migrations_test',
    },
    
    staging: {
      ...baseConfig,
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432'),
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
      logging: ['error', 'warn'],
      ssl: { rejectUnauthorized: false },
      extra: {
        max: 30,
        min: 5,
        acquireTimeoutMillis: 30000,
        idleTimeoutMillis: 600000,
        createTimeoutMillis: 20000,
        destroyTimeoutMillis: 5000,
      },
    },
    
    production: {
      ...baseConfig,
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432'),
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
      logging: ['error'],
      ssl: { rejectUnauthorized: false },
      extra: {
        max: 50,
        min: 10,
        acquireTimeoutMillis: 30000,
        idleTimeoutMillis: 600000,
        createTimeoutMillis: 20000,
        destroyTimeoutMillis: 5000,
        reapIntervalMillis: 1000,
        createRetryIntervalMillis: 200,
        propagateCreateError: false,
      },
    },
    
    performance: {
      ...baseConfig,
      host: process.env.DB_HOST || process.env.POSTGRES_HOST,
      port: parseInt(process.env.DB_PORT || process.env.POSTGRES_PORT || '5432'),
      username: process.env.DB_USERNAME || process.env.POSTGRES_USER,
      password: process.env.DB_PASSWORD || process.env.POSTGRES_PASSWORD,
      database: process.env.DB_DATABASE || process.env.POSTGRES_DB,
      logging: false,
      extra: {
        max: parseInt(process.env.DB_POOL_SIZE || '15', 10),
        min: 2,
        acquireTimeoutMillis: parseInt(process.env.DB_POOL_ACQUIRE_TIMEOUT || '30000', 10),
        idleTimeoutMillis: parseInt(process.env.DB_POOL_IDLE_TIMEOUT || '600000', 10),
        createTimeoutMillis: 20000,
        destroyTimeoutMillis: 5000,
        reapIntervalMillis: 1000,
        createRetryIntervalMillis: 200,
        propagateCreateError: false,
      },
    },
    
    integration: {
      ...baseConfig,
      host: process.env.DB_HOST || 'db',
      port: parseInt(process.env.DB_PORT || '5432'),
      username: process.env.DB_USERNAME || 'admin',
      password: process.env.DB_PASSWORD || 'testpassword',
      database: process.env.DB_DATABASE || 'nightbff_integration_db',
      logging: ['error', 'warn'],
      extra: {
        max: parseInt(process.env.DB_POOL_SIZE || '15', 10),
        min: 2,
        acquireTimeoutMillis: 30000,
        idleTimeoutMillis: 600000,
      },
    },
  };

  const config = envConfigs[env] || envConfigs.development;
  
  // Handle DATABASE_URL if provided (overrides individual settings)
  if (process.env.DATABASE_URL && env !== 'test') {
    // Type assertion to handle PostgreSQL-specific properties
    const postgresConfig = config as any;
    postgresConfig.url = process.env.DATABASE_URL;
    delete postgresConfig.host;
    delete postgresConfig.port;
    delete postgresConfig.username;
    delete postgresConfig.password;
    delete postgresConfig.database;
  }

  return new DataSource(config as DataSourceOptions);
};

// Default data source for current environment
export const AppDataSource = createDataSource();
export default AppDataSource; 