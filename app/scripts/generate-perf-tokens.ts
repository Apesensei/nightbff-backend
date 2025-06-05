import 'reflect-metadata';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { DataSource, DataSourceOptions } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
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
  // Primary: Use process.env if vars are directly passed (e.g., DATABASE_URL, JWT_SECRET)
  // Fallback: Try to load from performance-testing/config/.env.performance
  const perfEnvPath = path.resolve(__dirname, '..', '..', 'performance-testing', 'config', '.env.performance');
  let jwtSecret = process.env.JWT_SECRET;
  let databaseUrl = process.env.DATABASE_URL;

  if (fs.existsSync(perfEnvPath)) {
    console.log(`Loading environment variables from: ${perfEnvPath}`);
    const perfEnvContent = fs.readFileSync(perfEnvPath, 'utf-8');
    const parsedPerfEnv = parseEnv(perfEnvContent);
    if (!jwtSecret && parsedPerfEnv.JWT_SECRET) {
      jwtSecret = parsedPerfEnv.JWT_SECRET;
      console.log('Loaded JWT_SECRET from .env.performance');
    }
    // DATABASE_URL is expected to be set directly in the environment for this script.
  } else {
    console.warn(`Warning: ${perfEnvPath} not found. Relying solely on process.env for JWT_SECRET.`);
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
    users = await userRepository.find({ select: ['id'] }); // Fetch only user IDs

    if (users.length === 0) {
      console.warn('No users found in the database. Ensure seeding was successful.');
      await dataSource.destroy();
      process.exit(0); // Exit cleanly if no users
    }
    console.log(`Found ${users.length} users in the database.`);

  } catch (error) {
    console.error('Error during database operations:', error);
    if (dataSource.isInitialized) await dataSource.destroy();
    process.exit(1);
  }

  // --- Token Generation ---
  const jwtService = new JwtService({
    secret: jwtSecret,
    // Add signOptions if your app uses them (e.g., expiresIn)
    // signOptions: { expiresIn: '1h' },
  });

  console.log('Generating JWTs...');
  const tokens: string[] = [];
  const userIds: string[] = [];

  for (const user of users) {
    const payload = { userId: user.id, sub: user.id }; // Standard payload
    // Add other claims if your application expects them (e.g., roles)
    // payload.roles = user.roles; 
    const token = jwtService.sign(payload);
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