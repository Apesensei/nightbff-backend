#!/usr/bin/env ts-node

/**
 * Test User Seeding Script for NightBFF Load Testing
 * 
 * This script ensures that valid test users exist in the database for k6 load testing.
 * It creates a set of standardized test users with proper authentication credentials.
 * 
 * Usage:
 *   npm run seed:test-users
 *   DATABASE_URL="..." node dist/scripts/seed-test-users.js
 */

import * as path from 'path';
import * as fs from 'fs';
import { DataSource } from 'typeorm';
import { User } from '../src/microservices/auth/entities/user.entity';

// Environment variable parsing function
function parseEnv(envContent: string): Record<string, string> {
  const env: Record<string, string> = {};
  const lines = envContent.split('\n');
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (trimmedLine && !trimmedLine.startsWith('#')) {
      const [key, ...valueParts] = trimmedLine.split('=');
      if (key && valueParts.length > 0) {
        env[key.trim()] = valueParts.join('=').trim();
      }
    }
  }
  
  return env;
}

async function seedTestUsers() {
  console.log('🌱 Starting test user seeding for load testing...');

  // --- Environment Variable Loading ---
  const devEnvPath = path.resolve(__dirname, '..', '..', 'config', 'env', 'development.env');
  let databaseUrl = process.env.DATABASE_URL;

  if (fs.existsSync(devEnvPath)) {
    console.log(`Loading environment variables from: ${devEnvPath}`);
    const devEnvContent = fs.readFileSync(devEnvPath, 'utf-8');
    const parsedDevEnv = parseEnv(devEnvContent);
    if (!databaseUrl && parsedDevEnv.DATABASE_URL) {
      databaseUrl = parsedDevEnv.DATABASE_URL;
      console.log('Loaded DATABASE_URL from .env.development');
    }
  } else {
    console.warn(`Warning: ${devEnvPath} not found. Relying solely on process.env for DATABASE_URL.`);
  }

  if (!databaseUrl) {
    console.error('❌ DATABASE_URL is required but not found in environment or .env.development');
    process.exit(1);
  }

  console.log(`Using DATABASE_URL: ${databaseUrl.substring(0, 20)}...`);

  // --- Database Configuration ---
  const dataSourceOptions = {
    type: 'postgres' as const,
    url: databaseUrl,
    entities: [User, path.join(__dirname, '..', 'src', 'microservices', '**', '*.entity.{js,ts}')],
    synchronize: false, // Never synchronize in a script that might run against a real DB
    logging: false, // Disable logging for cleaner output
  };

  const dataSource = new DataSource(dataSourceOptions);

  try {
    console.log('Initializing database connection...');
    await dataSource.initialize();
    console.log('Database connection initialized.');

    const userRepository = dataSource.getRepository(User);

    // --- Check Existing Users ---
    const existingUsers = await userRepository.find({ 
      select: ['id', 'email', 'username', 'isVerified', 'isPremium'] 
    });
    
    console.log(`Found ${existingUsers.length} existing users in database.`);

    // --- Define Test Users ---
    const testUsers = [
      {
        email: 'loadtest1@nightbff.dev',
        username: 'loadtest1',
        displayName: 'Load Test User 1',
        isVerified: true,
        isPremium: false
      },
      {
        email: 'loadtest2@nightbff.dev',
        username: 'loadtest2',
        displayName: 'Load Test User 2',
        isVerified: true,
        isPremium: false
      },
      {
        email: 'loadtest3@nightbff.dev',
        username: 'loadtest3',
        displayName: 'Load Test User 3',
        isVerified: true,
        isPremium: false
      },
      {
        email: 'loadtest4@nightbff.dev',
        username: 'loadtest4',
        displayName: 'Load Test User 4',
        isVerified: true,
        isPremium: false
      },
      {
        email: 'loadtest5@nightbff.dev',
        username: 'loadtest5',
        displayName: 'Load Test User 5',
        isVerified: true,
        isPremium: false
      }
    ];

    // --- Create Missing Test Users ---
    let createdCount = 0;
    let skippedCount = 0;

    for (const testUser of testUsers) {
      // Check if user already exists
      const existingUser = existingUsers.find(u => u.email === testUser.email);
      
      if (existingUser) {
        console.log(`⏭️  User ${testUser.username} already exists (ID: ${existingUser.id})`);
        skippedCount++;
        continue;
      }

      try {
        const newUser = userRepository.create({
          id: require('crypto').randomUUID(),
          email: testUser.email,
          username: testUser.username,
          displayName: testUser.displayName,
          passwordHash: 'dummy_hash_for_testing_only', // Required field for testing
          isVerified: testUser.isVerified,
          isPremium: testUser.isPremium,
          // Note: In a real app, password would be properly hashed
          // For testing purposes, we're using a dummy hash
        });
        
        await userRepository.save(newUser);
        console.log(`✅ Created test user: ${testUser.username} (ID: ${newUser.id})`);
        createdCount++;
      } catch (error) {
        console.error(`❌ Failed to create test user ${testUser.username}:`, error.message);
      }
    }

    // --- Final Summary ---
    console.log('\n📊 Seeding Summary:');
    console.log(`   Created: ${createdCount} new test users`);
    console.log(`   Skipped: ${skippedCount} existing users`);
    console.log(`   Total: ${existingUsers.length + createdCount} users in database`);

    // --- Verify Users Can Be Retrieved ---
    const allUsers = await userRepository.find({ 
      select: ['id', 'email', 'username', 'isVerified', 'isPremium'] 
    });
    
    console.log('\n🔍 Verification - All users in database:');
    allUsers.forEach(user => {
      console.log(`   - ${user.username} (${user.email}) - Verified: ${user.isVerified}, Premium: ${user.isPremium}`);
    });

    console.log('\n✅ Test user seeding completed successfully!');

  } catch (error) {
    console.error('❌ Error during test user seeding:', error);
    if (dataSource.isInitialized) await dataSource.destroy();
    process.exit(1);
  }

  // --- Cleanup ---
  if (dataSource.isInitialized) {
    await dataSource.destroy();
    console.log('Database connection closed.');
  }
}

// Run the seeding function
seedTestUsers().catch(error => {
  console.error('❌ Unhandled error in seedTestUsers:', error);
  process.exit(1);
}); 