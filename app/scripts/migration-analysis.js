const fs = require('fs');
const path = require('path');

// Migration paths to scan
const migrationPaths = [
  './src/database/migrations',
  '../nightbff-integration/app/app/src/database/migrations'
];

console.log('🚨 MIGRATION SYSTEM CRITICAL ASSESSMENT');
console.log('=====================================');
console.log('🔧 CTO-Level Technical Analysis Starting...\n');

function scanMigrations() {
  const migrations = [];
  
  for (const migrationPath of migrationPaths) {
    const fullPath = path.resolve(migrationPath);
    console.log(`📁 Scanning: ${fullPath}`);
    
    if (fs.existsSync(fullPath)) {
      const files = fs.readdirSync(fullPath)
        .filter(f => f.endsWith('.ts') || f.endsWith('.js'))
        .map(f => {
          const filePath = path.join(fullPath, f);
          const stats = fs.statSync(filePath);
          return {
            file: f,
            path: filePath,
            size: stats.size,
            pathType: migrationPath.includes('nightbff-integration') ? 'integration' : 'backend'
          };
        });
      
      migrations.push(...files);
      console.log(`   📄 Found ${files.length} migration files`);
    } else {
      console.log(`   ⚠️  Path does not exist: ${fullPath}`);
    }
  }
  
  return migrations;
}

function analyzeMigrations(migrations) {
  const issues = [];
  
  // 1. CRITICAL: Check for exact duplicates
  const fileMap = new Map();
  migrations.forEach(migration => {
    const key = migration.file;
    if (!fileMap.has(key)) {
      fileMap.set(key, []);
    }
    fileMap.get(key).push(migration);
  });
  
  let duplicateCount = 0;
  fileMap.forEach((duplicates, fileName) => {
    if (duplicates.length > 1) {
      duplicateCount++;
      issues.push({
        type: 'DUPLICATE',
        severity: 'CRITICAL',
        message: `Exact duplicate migration file: ${fileName}`,
        details: `Found in ${duplicates.length} locations: ${duplicates.map(d => d.pathType).join(', ')}`,
        file: fileName
      });
    }
  });
  
  // 2. CRITICAL: Check for large files
  migrations.forEach(migration => {
    const sizeKB = migration.size / 1024;
    if (migration.size > 100000) { // 100KB
      issues.push({
        type: 'LARGE_FILE',
        severity: 'CRITICAL',
        message: `Massive migration file (${Math.round(sizeKB)}KB) - unmaintainable`,
        details: `File size: ${Math.round(sizeKB)}KB`,
        file: migration.file
      });
    } else if (migration.size > 50000) { // 50KB
      issues.push({
        type: 'LARGE_FILE',
        severity: 'WARNING',
        message: `Large migration file (${Math.round(sizeKB)}KB)`,
        details: `File size: ${Math.round(sizeKB)}KB`,
        file: migration.file
      });
    }
  });
  
  // 3. CRITICAL: Check for .skip files
  migrations.forEach(migration => {
    if (migration.file.includes('.skip')) {
      issues.push({
        type: 'BROKEN_CHAIN',
        severity: 'CRITICAL',
        message: `Skipped migration indicates broken chain: ${migration.file}`,
        details: 'Migration chain is broken',
        file: migration.file
      });
    }
  });
  
  // 4. WARNING: Check for seed data
  migrations.forEach(migration => {
    if (migration.file.toLowerCase().includes('seed') || 
        migration.file.includes('9999999') ||
        migration.file.toLowerCase().includes('test')) {
      issues.push({
        type: 'SEED_DATA',
        severity: 'WARNING',
        message: `Seed data in migration: ${migration.file}`,
        details: 'Should be moved to seeds/ directory',
        file: migration.file
      });
    }
  });
  
  // 5. CRITICAL: Repository structure violation
  const backendCount = migrations.filter(m => m.pathType === 'backend').length;
  const integrationCount = migrations.filter(m => m.pathType === 'integration').length;
  
  if (backendCount > 0 && integrationCount > 0) {
    issues.push({
      type: 'STRUCTURE_VIOLATION',
      severity: 'CRITICAL',
      message: 'Migrations exist in both repositories - violates single source of truth',
      details: `Backend: ${backendCount} files, Integration: ${integrationCount} files`,
      file: 'Repository Structure'
    });
  }
  
  return issues;
}

// Execute analysis
try {
  const migrations = scanMigrations();
  console.log(`\n📊 Total migrations found: ${migrations.length}`);
  
  const issues = analyzeMigrations(migrations);
  
  if (issues.length === 0) {
    console.log('\n✅ ASSESSMENT COMPLETE: No critical migration issues detected');
  } else {
    console.log(`\n🚨 CRITICAL ISSUES DETECTED: ${issues.length} problems found\n`);
    
    const critical = issues.filter(i => i.severity === 'CRITICAL');
    const warnings = issues.filter(i => i.severity === 'WARNING');
    
    console.log(`🔴 CRITICAL ISSUES (${critical.length}):`);
    critical.forEach(issue => {
      console.log(`   🔴 ${issue.type}: ${issue.message}`);
      console.log(`      File: ${issue.file}`);
      console.log(`      Details: ${issue.details}`);
      console.log('');
    });
    
    console.log(`⚠️  WARNING ISSUES (${warnings.length}):`);
    warnings.forEach(issue => {
      console.log(`   ⚠️  ${issue.type}: ${issue.message}`);
      console.log(`      File: ${issue.file}`);
      console.log(`      Details: ${issue.details}`);
      console.log('');
    });
    
    console.log('=====================================');
    console.log('🎯 CTO IMMEDIATE ACTIONS REQUIRED:');
    console.log('1. STOP: Halt all database changes immediately');
    console.log('2. URGENT: Remove duplicated migrations from integration repo');
    console.log('3. CRITICAL: Establish backend repo as single source of truth');
    console.log('4. REQUIRED: Implement MIGRATION_RESTRUCTURE_PLAN.md');
    console.log('=====================================');
    
    // Summary statistics
    const duplicates = critical.filter(i => i.type === 'DUPLICATE').length;
    const largeFiles = issues.filter(i => i.type === 'LARGE_FILE').length;
    const brokenChains = critical.filter(i => i.type === 'BROKEN_CHAIN').length;
    
    console.log('\n📈 DAMAGE ASSESSMENT SUMMARY:');
    console.log(`   🔴 Duplicate migrations: ${duplicates}`);
    console.log(`   📁 Large/massive files: ${largeFiles}`);
    console.log(`   💔 Broken migration chains: ${brokenChains}`);
    console.log(`   🏗️  Repository structure violations: ${critical.filter(i => i.type === 'STRUCTURE_VIOLATION').length}`);
    
    process.exit(critical.length > 0 ? 2 : 1);
  }
} catch (error) {
  console.error('❌ ASSESSMENT FAILED:', error.message);
  process.exit(3);
} 