import 'reflect-metadata';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { DataSource, DataSourceOptions } from 'typeorm';
import * as jwt from 'jsonwebtoken';
import { User } from '../src/microservices/auth/entities/user.entity'; // Adjust if your User entity is elsewhere

// Function to manually parse a simple .env file content if needed as a fallback
function parseEnv(envContent: string): Record<string, string> {
  const env: Record<string, string> = {};
  envContent.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      let value = match[2] || '';
      // Remove surrounding quotes
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      }
      if (value.startsWith("'") && value.endsWith("'")) {
        value = value.slice(1, -1);
      }
      env[match[1]] = value;
    }
  });
  return env;
}

async function generatePerfTokens() {
  console.log('Starting token generation for performance testing...');

  // --- Environment Variable Loading ---
  // FIXED: Use development environment JWT_SECRET to match running backend
  const devEnvPath = path.resolve(__dirname, '..', '..', 'config', 'env', 'development.env');
  let jwtSecret = process.env.JWT_SECRET;
  let databaseUrl = process.env.DATABASE_URL;

  if (fs.existsSync(devEnvPath)) {
    console.log(`Loading environment variables from: ${devEnvPath}`);
    const devEnvContent = fs.readFileSync(devEnvPath, 'utf-8');
    const parsedDevEnv = parseEnv(devEnvContent);
    if (!jwtSecret && parsedDevEnv.JWT_SECRET) {
      jwtSecret = parsedDevEnv.JWT_SECRET;
      console.log('Loaded JWT_SECRET from .env.development');
    }
    // DATABASE_URL is expected to be set directly in the environment for this script.
  } else {
    console.warn(`Warning: ${devEnvPath} not found. Relying solely on process.env for JWT_SECRET.`);
  }

  if (!databaseUrl) {
    console.error('FATAL: DATABASE_URL environment variable is not set.');
    console.error('Please set it when running the script, e.g., DATABASE_URL=your_connection_string node dist/scripts/generate-perf-tokens.js');
    process.exit(1);
  }

  if (!jwtSecret) {
    console.error('FATAL: JWT_SECRET environment variable is not set and not found in .env.performance.');
    console.error('Please set it directly or ensure it exists in performance-testing/config/.env.performance.');
    process.exit(1);
  }

  console.log(`Using DATABASE_URL: ${databaseUrl.substring(0, databaseUrl.indexOf(':') + 12)}...`); // Obfuscate password part
  console.log(`Using JWT_SECRET: ${jwtSecret.substring(0, 5)}...`);

  // --- Database Connection ---
  const dataSourceOptions: DataSourceOptions = {
    type: 'postgres',
    url: databaseUrl,
    entities: [User, path.join(__dirname, '..', 'src', 'microservices', '**', '*.entity.{js,ts}')],
    synchronize: false, // Never synchronize in a script that might run against a real DB
    logging: ['error'], // Or true for more detailed logs
  };

  const dataSource = new DataSource(dataSourceOptions);
  let users: User[] = [];

  try {
    console.log('Initializing database connection...');
    await dataSource.initialize();
    console.log('Database connection initialized.');

    const userRepository = dataSource.getRepository(User);
    users = await userRepository.find({ select: ['id', 'email', 'username'] }); // FIXED: Fetch full user data

    if (users.length === 0) {
      console.log('No users found in the database. Creating test users for load testing...');
      
      // Create test users for load testing
      const testUsers = [
        {
          email: 'loadtest1@test.com',
          username: 'loadtest1',
          displayName: 'Load Test User 1',
          password: 'SecurePass123!'
        },
        {
          email: 'loadtest2@test.com',
          username: 'loadtest2',
          displayName: 'Load Test User 2',
          password: 'SecurePass123!'
        }
      ];

      for (const testUser of testUsers) {
        try {
          const newUser = userRepository.create({
            id: require('crypto').randomUUID(),
            email: testUser.email,
            username: testUser.username,
            displayName: testUser.displayName,
            isVerified: true,
            isPremium: false,
            // Note: In a real app, password would be hashed
            // For testing purposes, we're creating users directly
          });
          await userRepository.save(newUser);
          console.log(`Created test user: ${testUser.username} with ID: ${newUser.id}`);
        } catch (error) {
          console.warn(`Failed to create test user ${testUser.username}:`, error.message);
        }
      }

      // Fetch users again after creation
      users = await userRepository.find({ select: ['id'] });
      console.log(`Now have ${users.length} users in the database.`);
    } else {
      console.log(`Found ${users.length} users in the database.`);
    }

  } catch (error) {
    console.error('Error during database operations:', error);
    if (dataSource.isInitialized) await dataSource.destroy();
    process.exit(1);
  }

  // --- Token Generation ---
  

  console.log('Generating JWTs...');
  const tokens: string[] = [];
  const userIds: string[] = [];

  for (const user of users) {
    // FIXED: Include email and username fields like the working token
    const payload = { 
      userId: user.id, 
      sub: user.id,
      email: user.email,
      username: user.username
    }; 
    // Add other claims if your application expects them (e.g., roles)
    // payload.roles = user.roles; 
            const token = jwt.sign(payload, jwtSecret, { expiresIn: '1h' });
    tokens.push(token);
    userIds.push(user.id);
  }

  console.log(`Generated ${tokens.length} tokens.`);

  // --- Output Files ---
  const outputDir = path.resolve(__dirname, '..', '..', 'performance-testing', 'k6-scripts');
  const tokensFilePath = path.join(outputDir, 'loadtest_tokens.json');
  const userIdsFilePath = path.join(outputDir, 'loadtest_user_ids.txt');

  try {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
      console.log(`Created output directory: ${outputDir}`);
    }
    fs.writeFileSync(tokensFilePath, JSON.stringify(tokens, null, 2));
    fs.writeFileSync(userIdsFilePath, userIds.join('\n'));
    console.log(`Successfully saved tokens to: ${tokensFilePath}`);
    console.log(`Successfully saved user IDs to: ${userIdsFilePath}`);
  } catch (error) {
    console.error('Error writing output files:', error);
    if (dataSource.isInitialized) await dataSource.destroy();
    process.exit(1);
  }

  // --- Cleanup ---
  if (dataSource.isInitialized) {
    await dataSource.destroy();
    console.log('Database connection closed.');
  }
  console.log('Token generation complete.');
}

generatePerfTokens().catch(error => {
  console.error('Unhandled error in generatePerfTokens:', error);
  process.exit(1);
}); 