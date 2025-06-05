const { Client } = require('pg');
const { v4: uuidv4 } = require('uuid');

/**
 * Comprehensive Performance Test User Seeder
 * 
 * Creates 100+ loadtest users required for comprehensive performance testing.
 * These users will be used by K6 comprehensive performance tests for authentication.
 * 
 * Generated Users:
 * - loadtest0@nightbff.dev through loadtest99@nightbff.dev (100 users)
 * - admin-loadtest@nightbff.dev (1 admin user)
 * 
 * All users use password: "password123" (matches PERFORMANCE_AUTH_PASSWORD)
 */

async function seedComprehensiveLoadtestUsers() {
  console.log('🌱 Starting Comprehensive Loadtest User Seeding...');
  console.log('📊 Target: 100 loadtest users + 1 admin user = 101 total users');
  
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

    console.log('📊 Found users table, proceeding with comprehensive seeding...');

    let created = 0;
    let skipped = 0;

    // Generate 100 loadtest users (loadtest0 through loadtest99)
    console.log('👥 Creating loadtest users (loadtest0@nightbff.dev through loadtest99@nightbff.dev)...');
    
    for (let i = 0; i < 100; i++) {
      const userData = {
        email: `loadtest${i}@nightbff.dev`,
        username: `loadtest${i}`,
        displayName: `Load Test User ${i}`,
      };

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

        // Create new loadtest user
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
          false, // is_premium (regular users)
          true,  // is_age_verified  
          false, // is_online
          'active', // status
          ['user'], // roles (regular user)
          now,   // created_at
          now    // updated_at
        ]);

        created++;
        
        // Log progress every 25 users
        if ((i + 1) % 25 === 0) {
          console.log(`✅ Progress: Created ${i + 1}/100 loadtest users`);
        }

      } catch (error) {
        console.error(`❌ Failed to create user ${userData.email}:`, error.message);
      }
    }

    // Create admin user for background job testing
    console.log('👑 Creating admin user (admin-loadtest@nightbff.dev)...');
    
    const adminUserData = {
      email: 'admin-loadtest@nightbff.dev',
      username: 'admin_loadtest',
      displayName: 'Admin Load Test User',
    };

    try {
      // Check if admin user already exists
      const existingAdmin = await client.query(
        'SELECT id FROM users WHERE email = $1 OR username = $2',
        [adminUserData.email, adminUserData.username]
      );

      if (existingAdmin.rows.length > 0) {
        console.log(`⏭️  Admin user ${adminUserData.email} already exists, skipping...`);
        skipped++;
      } else {
        // Create new admin user
        const adminUserId = uuidv4();
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
          adminUserId,
          adminUserData.email,
          adminUserData.username,
          adminUserData.displayName,
          'performance_mode_no_hash_needed', // In performance mode, password is validated by config
          true,  // is_verified
          false, // is_premium 
          true,  // is_age_verified  
          false, // is_online
          'active', // status
          ['admin', 'user'], // roles (admin + user)
          now,   // created_at
          now    // updated_at
        ]);

        console.log(`✅ Created admin user: ${adminUserData.email} (${adminUserData.displayName})`);
        created++;
      }

    } catch (error) {
      console.error(`❌ Failed to create admin user ${adminUserData.email}:`, error.message);
    }

    console.log('\n🎉 Comprehensive loadtest user seeding completed!');
    console.log(`📊 Summary: ${created} created, ${skipped} skipped`);
    console.log(`🎯 Target achievement: ${created}/101 users created`);
    
    // Verify users were created
    const loadtestUserCount = await client.query('SELECT COUNT(*) FROM users WHERE email LIKE \'%@nightbff.dev\'');
    const totalUserCount = await client.query('SELECT COUNT(*) FROM users');
    
    console.log(`🔍 Loadtest users in database: ${loadtestUserCount.rows[0].count}`);
    console.log(`🔍 Total users in database: ${totalUserCount.rows[0].count}`);
    
    if (parseInt(loadtestUserCount.rows[0].count) >= 100) {
      console.log('✅ SUCCESS: Sufficient loadtest users created for comprehensive testing');
    } else {
      console.log('⚠️  WARNING: Less than 100 loadtest users found - some tests may fail');
    }

  } catch (error) {
    console.error('❌ Comprehensive seeding failed:', error.message);
    throw error;
  } finally {
    await client.end();
    console.log('🔌 Database connection closed');
  }
}

// Run the comprehensive seeder
if (require.main === module) {
  seedComprehensiveLoadtestUsers()
    .then(() => {
      console.log('✅ Comprehensive seeding process completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Comprehensive seeding process failed:', error);
      process.exit(1);
    });
}

module.exports = { seedComprehensiveLoadtestUsers }; 