/**
 * Jest Environment Setup
 * 
 * Sets up global environment variables and configuration before any tests run.
 * This ensures NODE_ENV is properly set before modules are imported, which is
 * critical for database configuration and other environment-dependent settings.
 */

// Set NODE_ENV before any modules are imported
process.env.NODE_ENV = 'test';

// Ensure test database configuration is available
process.env.POSTGRES_HOST = 'localhost';
process.env.POSTGRES_PORT = '5432';
process.env.POSTGRES_USER = 'admin';
process.env.POSTGRES_PASSWORD = 'testpass';
process.env.POSTGRES_DB = 'testdb';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';
process.env.JWT_SECRET = 'test-secret-for-jest';
process.env.SUPABASE_URL = 'http://localhost:54321';
process.env.SUPABASE_KEY = 'test-key';

// Suppress console.log during tests unless explicitly needed
if (!process.env.JEST_VERBOSE) {
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: console.error, // Keep errors visible
  };
}

// Global test timeout
jest.setTimeout(30000); 