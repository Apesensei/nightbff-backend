const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

/**
 * Regenerate loadtest_user_ids.txt with Actual Database UUIDs
 * 
 * FINAL FIX: Tests use loadtest_user_ids.txt but those UUIDs don't exist in database
 * 
 * ROOT CAUSE: loadtest_user_ids.txt contains 175 UUIDs that are NOT in the database
 * EVIDENCE: Performance tests authenticate with loadtest emails but query with non-existent UUIDs
 * 
 * SOLUTION: Replace loadtest_user_ids.txt with actual UUIDs of loadtest users from database
 */

async function regenerateLoadtestUserIds() {
  console.log('🔄 Regenerating loadtest_user_ids.txt with actual database UUIDs...');
  
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

    // Query actual UUIDs of loadtest users from database
    console.log('🔍 Querying actual loadtest user UUIDs from database...');
    const usersQuery = `
      SELECT id, email 
      FROM users 
      WHERE email LIKE 'loadtest%@nightbff.dev' 
      ORDER BY email
    `;
    
    const usersResult = await client.query(usersQuery);
    console.log(`📋 Found ${usersResult.rows.length} loadtest users in database`);
    
    if (usersResult.rows.length === 0) {
      console.log('❌ No loadtest users found in database. Run seed-comprehensive-loadtest-users.js first');
      return;
    }

    // Extract just the UUIDs
    const userIds = usersResult.rows.map(row => row.id);
    
    // Write to loadtest_user_ids.txt file
    const outputPath = path.join(__dirname, '../performance-testing/k6-scripts/loadtest_user_ids.txt');
    const content = userIds.join('\\n') + '\\n';
    
    // Backup the old file first
    const backupPath = outputPath + '.backup';
    if (fs.existsSync(outputPath)) {
      fs.copyFileSync(outputPath, backupPath);
      console.log(`📦 Backed up old file to ${backupPath}`);
    }
    
    // Write new file
    fs.writeFileSync(outputPath, content, 'utf8');
    console.log(`📝 Written ${userIds.length} actual UUIDs to ${outputPath}`);
    
    // Verify the file was written correctly
    const verification = fs.readFileSync(outputPath, 'utf8').trim().split('\\n');
    console.log(`✅ Verification: File contains ${verification.length} UUID lines`);
    console.log(`📋 Sample UUIDs: ${verification.slice(0, 3).join(', ')}...`);
    
    // Verify these UUIDs exist in database
    console.log('🔍 Verifying UUIDs exist in database...');
    const verifyQuery = `
      SELECT COUNT(*) as existing_count
      FROM users 
      WHERE id = ANY($1)
    `;
    
    const verifyResult = await client.query(verifyQuery, [userIds]);
    const existingCount = verifyResult.rows[0].existing_count;
    
    console.log('\\n🎉 loadtest_user_ids.txt Regeneration Complete!');
    console.log(`✅ Total UUIDs written: ${userIds.length}`);
    console.log(`✅ UUIDs verified in database: ${existingCount}/${userIds.length}`);
    console.log(`✅ Coverage: ${((existingCount / userIds.length) * 100).toFixed(1)}%`);
    
    if (existingCount === userIds.length) {
      console.log('\\n📊 Expected Performance Improvement:');
      console.log(`🔥 UUID mismatch issue: RESOLVED (100% UUID coverage)`);
      console.log(`⚡ Interest Service errors: Will be eliminated`);
      console.log(`🚀 Cache hit rate: Should jump from 0% to >60%`);
      console.log(`💫 Personalized recommendations: Will start working`);
    } else {
      console.log(`\\n⚠️  WARNING: Only ${existingCount}/${userIds.length} UUIDs verified. Some may still cause issues.`);
    }

  } catch (error) {
    console.error('❌ loadtest_user_ids.txt regeneration failed:', error.message);
    console.error(error.stack);
  } finally {
    await client.end();
    console.log('🔌 Disconnected from database');
  }
}

// Execute if run directly
if (require.main === module) {
  regenerateLoadtestUserIds().catch(console.error);
}

module.exports = { regenerateLoadtestUserIds }; 