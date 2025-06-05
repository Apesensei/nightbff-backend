const { Client } = require('pg');

/**
 * Seed User-Interest Relationships for Performance Tests
 * 
 * CRITICAL FIX: Creates realistic user-interest relationships for loadtest users
 * 
 * ROOT CAUSE: Performance tests failing because loadtest users have NO interests assigned
 * EVIDENCE: 175 users exist, 23 interests exist, but 0 user_interests relationships
 * 
 * SOLUTION: Assign 3-7 random interests to each loadtest user for realistic testing
 */

async function seedLoadtestUserInterests() {
  console.log('🎯 Starting Loadtest User-Interest Relationship Seeding...');
  
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5434,
    database: process.env.DB_DATABASE || 'defaultdb',
    user: process.env.DB_USERNAME || 'admin',
    password: process.env.DB_PASSWORD || 'uFR44yr69C4mZa72g3JQ37GX',
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    // 1. Get all loadtest users
    console.log('🔍 Querying loadtest users...');
    const usersQuery = `
      SELECT id, email, username 
      FROM users 
      WHERE email LIKE 'loadtest%@nightbff.dev' 
      ORDER BY email
    `;
    
    const usersResult = await client.query(usersQuery);
    console.log(`📋 Found ${usersResult.rows.length} loadtest users`);
    
    if (usersResult.rows.length === 0) {
      console.log('❌ No loadtest users found. Run seed-comprehensive-loadtest-users.js first');
      return;
    }

    // 2. Get all available interests
    console.log('🎨 Querying available interests...');
    const interestsQuery = `
      SELECT id, name, icon
      FROM interests 
      WHERE is_active = true
      ORDER BY sort_order, name
    `;
    
    const interestsResult = await client.query(interestsQuery);
    console.log(`🎯 Found ${interestsResult.rows.length} active interests`);
    
    if (interestsResult.rows.length === 0) {
      console.log('❌ No interests found. Check interest seed data.');
      return;
    }

    // 3. Clear existing user interests for loadtest users (if any)
    console.log('🧹 Clearing existing loadtest user interests...');
    const clearQuery = `
      DELETE FROM user_interests 
      WHERE user_id IN (
        SELECT id FROM users WHERE email LIKE 'loadtest%@nightbff.dev'
      )
    `;
    const clearResult = await client.query(clearQuery);
    console.log(`🗑️ Cleared ${clearResult.rowCount} existing relationships`);

    // 4. Create realistic user-interest relationships
    console.log('💫 Creating user-interest relationships...');
    
    let totalRelationshipsCreated = 0;
    const interestIds = interestsResult.rows.map(row => row.id);
    
    for (const user of usersResult.rows) {
      // Each user gets 3-7 random interests for realistic variety
      const numInterests = Math.floor(Math.random() * 5) + 3; // 3-7 interests
      
      // Randomly select interests for this user (no duplicates)
      const shuffledInterests = [...interestIds].sort(() => Math.random() - 0.5);
      const selectedInterests = shuffledInterests.slice(0, numInterests);
      
      // Insert user-interest relationships
      for (const interestId of selectedInterests) {
        try {
          await client.query(`
            INSERT INTO user_interests (id, user_id, interest_id, created_at)
            VALUES (gen_random_uuid(), $1, $2, NOW())
          `, [user.id, interestId]);
          
          totalRelationshipsCreated++;
        } catch (error) {
          console.error(`❌ Failed to create relationship for user ${user.email}, interest ${interestId}:`, error.message);
        }
      }
      
      // Log progress every 25 users
      if (totalRelationshipsCreated % 100 === 0) {
        console.log(`⚡ Created ${totalRelationshipsCreated} relationships...`);
      }
    }

    // 5. Update interest usage counts for cache effectiveness
    console.log('📊 Updating interest usage counts...');
    
    const updateUsageQuery = `
      UPDATE interests 
      SET usage_count = (
        SELECT COUNT(*) 
        FROM user_interests ui 
        WHERE ui.interest_id = interests.id
      )
      WHERE id IN (
        SELECT DISTINCT interest_id FROM user_interests
      )
    `;
    
    const updateResult = await client.query(updateUsageQuery);
    console.log(`📈 Updated usage counts for ${updateResult.rowCount} interests`);

    // 6. Verify the data creation
    console.log('🔍 Verifying created relationships...');
    
    const verifyQuery = `
      WITH loadtest_stats AS (
        SELECT 
          COUNT(*) as total_relationships,
          COUNT(DISTINCT ui.user_id) as users_with_interests,
          COUNT(DISTINCT ui.interest_id) as interests_used
        FROM user_interests ui
        JOIN users u ON ui.user_id = u.id
        WHERE u.email LIKE 'loadtest%@nightbff.dev'
      ),
      avg_stats AS (
        SELECT ROUND(AVG(user_interest_count), 2) as avg_interests_per_user
        FROM (
          SELECT COUNT(*) as user_interest_count
          FROM user_interests ui
          JOIN users u ON ui.user_id = u.id
          WHERE u.email LIKE 'loadtest%@nightbff.dev'
          GROUP BY ui.user_id
        ) user_counts
      )
      SELECT ls.*, av.avg_interests_per_user
      FROM loadtest_stats ls
      CROSS JOIN avg_stats av
    `;
    
    const verifyResult = await client.query(verifyQuery);
    const stats = verifyResult.rows[0];

    // 7. Success summary
    console.log('\n🎉 User-Interest Relationship Seeding Complete!');
    console.log(`✅ Total relationships created: ${totalRelationshipsCreated}`);
    console.log(`✅ Users with interests: ${stats.users_with_interests}/${usersResult.rows.length}`);
    console.log(`✅ Interests being used: ${stats.interests_used}/${interestsResult.rows.length}`);
    console.log(`✅ Average interests per user: ${stats.avg_interests_per_user}`);
    
    console.log('\n📊 Expected Cache Performance Improvement:');
    console.log(`🔥 User interest cache hit rate: 0% → >80% (realistic test data available)`);
    console.log(`⚡ Interest service algorithms: Will have real data to process`);
    console.log(`🚀 Performance tests: Will exercise actual cached user relationships`);

  } catch (error) {
    console.error('❌ User-interest seeding failed:', error.message);
    console.error(error.stack);
  } finally {
    await client.end();
    console.log('🔌 Disconnected from database');
  }
}

// Execute if run directly
if (require.main === module) {
  seedLoadtestUserInterests().catch(console.error);
}

module.exports = { seedLoadtestUserInterests }; 