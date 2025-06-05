const { Client } = require('pg');
const { v4: uuidv4 } = require('uuid');

/**
 * Performance Test User Seeder
 * 
 * Creates test users required for performance testing in the local PostgreSQL database.
 * These users will be used by K6 performance tests for authentication.
 */

const TEST_USERS = [
  {
    email: 'user1@test.com',
    username: 'testuser1',
    displayName: 'Test User 1',
  },
  {
    email: 'user2@test.com',
    username: 'testuser2',
    displayName: 'Test User 2',
  },
  {
    email: 'user3@test.com',
    username: 'testuser3',
    displayName: 'Test User 3',
  },
  // Add a few more for comprehensive testing
  {
    email: 'admin@test.com',
    username: 'testadmin',
    displayName: 'Test Admin',
  },
  {
    email: 'premium@test.com',
    username: 'premiumuser',
    displayName: 'Premium Test User',
  },
];

async function seedPerformanceUsers() {
  console.log('🌱 Starting Performance Test User Seeding...');
  
  // Database connection using performance environment variables
  const client = new Client({
    host: process.env.DB_HOST || 'postgres_perf',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_DATABASE || 'defaultdb',
    user: process.env.DB_USERNAME || 'admin',
    password: process.env.DB_PASSWORD || 'uFR44yr69C4mZa72g3JQ37GX',
  });

  try {
    await client.connect();
    console.log('✅ Connected to PostgreSQL database');

    // Check if users table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      );
    `);
    
    if (!tableCheck.rows[0].exists) {
      console.log('❌ Users table does not exist. Please run migrations first.');
      return;
    }

    console.log('📊 Found users table, proceeding with seeding...');

    let created = 0;
    let skipped = 0;

    for (const userData of TEST_USERS) {
      try {
        // Check if user already exists
        const existingUser = await client.query(
          'SELECT id FROM users WHERE email = $1 OR username = $2',
          [userData.email, userData.username]
        );

        if (existingUser.rows.length > 0) {
          console.log(`⏭️  User ${userData.email} already exists, skipping...`);
          skipped++;
          continue;
        }

        // Create new user
        const userId = uuidv4();
        const now = new Date().toISOString();

        await client.query(`
          INSERT INTO users (
            id, email, username, display_name, password_hash,
            is_verified, is_premium, is_age_verified, is_online,
            status, roles, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
          )
        `, [
          userId,
          userData.email,
          userData.username,
          userData.displayName,
          'performance_mode_no_hash_needed', // In performance mode, password is validated by config
          true,  // is_verified
          userData.email.includes('premium') ? true : false, // is_premium
          true,  // is_age_verified  
          false, // is_online
          'active', // status
          userData.email.includes('admin') ? ['admin', 'user'] : ['user'], // roles
          now,   // created_at
          now    // updated_at
        ]);

        console.log(`✅ Created user: ${userData.email} (${userData.displayName})`);
        created++;

      } catch (error) {
        console.error(`❌ Failed to create user ${userData.email}:`, error.message);
      }
    }

    console.log('\n🎉 Performance user seeding completed!');
    console.log(`📊 Summary: ${created} created, ${skipped} skipped`);
    
    // Verify users were created
    const userCount = await client.query('SELECT COUNT(*) FROM users WHERE email LIKE \'%@test.com\'');
    console.log(`🔍 Total test users in database: ${userCount.rows[0].count}`);

  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    throw error;
  } finally {
    await client.end();
    console.log('🔌 Database connection closed');
  }
}

// Run the seeder
if (require.main === module) {
  seedPerformanceUsers()
    .then(() => {
      console.log('✅ Seeding process completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Seeding process failed:', error);
      process.exit(1);
    });
}

module.exports = { seedPerformanceUsers }; 