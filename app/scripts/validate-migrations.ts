import { MigrationValidator } from '../src/database/utils/migration-validator.js';

async function runValidation() {
  console.log('🚨 MIGRATION SYSTEM CRITICAL ASSESSMENT');
  console.log('=====================================');
  console.log('🔧 CTO-Level Technical Analysis Starting...\n');
  
  const validator = new MigrationValidator();
  
  try {
    const issues = await validator.validate();
    
    if (issues.length === 0) {
      console.log('✅ ASSESSMENT COMPLETE: No critical migration issues detected');
      process.exit(0);
    } else {
      console.log(`🚨 CRITICAL ISSUES DETECTED: ${issues.length} problems found\n`);
      
      // Group by severity
      const critical = issues.filter(i => i.severity === 'critical');
      const warnings = issues.filter(i => i.severity === 'warning');
      const info = issues.filter(i => i.severity === 'info');
      
      console.log(`🔴 CRITICAL ISSUES (${critical.length}):`);
      critical.forEach(issue => {
        console.log(`   🔴 ${issue.type.toUpperCase()}: ${issue.message}`);
        console.log(`      File: ${issue.file}`);
        if (issue.details) {
          console.log(`      Details: ${JSON.stringify(issue.details, null, 6)}`);
        }
        console.log('');
      });
      
      console.log(`⚠️  WARNING ISSUES (${warnings.length}):`);
      warnings.forEach(issue => {
        console.log(`   ⚠️  ${issue.type.toUpperCase()}: ${issue.message}`);
        console.log(`      File: ${issue.file}`);
        console.log('');
      });
      
      console.log('=====================================');
      console.log('🎯 CTO RECOMMENDATIONS:');
      console.log('1. IMMEDIATE: Stop all database changes until migration system is fixed');
      console.log('2. URGENT: Implement migration system restructure per MIGRATION_RESTRUCTURE_PLAN.md');
      console.log('3. CRITICAL: Remove duplicate migrations from integration repository');
      console.log('4. REQUIRED: Establish single source of truth in backend repository');
      console.log('=====================================');
      
      process.exit(critical.length > 0 ? 2 : 1);
    }
  } catch (error) {
    console.error('❌ ASSESSMENT FAILED:', error);
    process.exit(3);
  }
}

// Execute validation
runValidation(); 