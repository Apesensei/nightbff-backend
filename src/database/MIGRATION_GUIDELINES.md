# NightBFF Database Migration Guidelines

## Overview

This document provides practical day-to-day guidelines for working with database migrations in the NightBFF project. These guidelines complement the [MIGRATION_GOVERNANCE.md](./MIGRATION_GOVERNANCE.md) framework established in Phase 2 of the migration system restructure.

## Quick Reference

### Daily Workflow Commands
```bash
# Create a new migration
npm run migration:create --name=add_user_preferences

# Generate migration from entity changes  
npm run migration:generate --name=update_venue_schema

# Run pending migrations
npm run migration:run

# Check migration status
npm run migration:show

# Validate all migrations
npm run migration:validate

# Revert last migration (DANGER)
npm run migration:revert
```

### File Naming Convention
**Format**: `{timestamp}-{PascalCaseDescription}.ts`  
**Examples**:
- `1737844400000-AddUserPreferences.ts`
- `1737844500000-CreateVenueIndexes.ts`
- `1737844600000-UpdateChatPermissions.ts`

## Development Guidelines

### 1. Before Creating Migrations

#### ✅ Pre-Migration Checklist
- [ ] Review existing entity definitions for conflicts
- [ ] Check current database schema in staging/development
- [ ] Verify no pending migrations from other team members
- [ ] Run `npm run migration:validate` to ensure clean state
- [ ] Coordinate with team via Slack #database-changes channel

#### 🔍 Schema Analysis
```bash
# Check current database state
npm run typeorm schema:log

# Compare with entity definitions
npm run typeorm schema:sync --dry-run
```

### 2. Creating Migrations

#### Option A: Generate from Entity Changes (Recommended)
```bash
# After modifying entity files
npm run migration:generate --name=DescriptiveChangeName

# Review generated SQL before proceeding
```

#### Option B: Create Empty Migration Template
```bash
# For complex custom migrations
npm run migration:create --name=DescriptiveChangeName

# Implement up() and down() methods manually
```

#### 🎯 Migration Best Practices

**Keep Migrations Atomic**
- One logical change per migration
- Maximum 50 lines of SQL (split larger changes)
- Test both `up()` and `down()` methods

**Safe SQL Patterns**
```typescript
// ✅ GOOD: Add nullable column first, populate, then make NOT NULL
public async up(queryRunner: QueryRunner): Promise<void> {
    // Step 1: Add nullable column
    await queryRunner.addColumn('users', new TableColumn({
        name: 'email_verified_at',
        type: 'timestamp',
        isNullable: true,
    }));
    
    // Step 2: Populate existing records
    await queryRunner.query(`
        UPDATE users SET email_verified_at = created_at 
        WHERE is_verified = true
    `);
    
    // Step 3: Make NOT NULL (in separate migration if needed)
}

// ❌ AVOID: Adding NOT NULL column without default
await queryRunner.addColumn('users', new TableColumn({
    name: 'required_field',
    type: 'varchar',
    isNullable: false, // Will fail on existing records
}));
```

### 3. Testing Migrations

#### Local Testing Workflow
```bash
# 1. Create test database
createdb nightbff_migration_test

# 2. Run migrations on clean database
NODE_ENV=test npm run migration:run

# 3. Test rollback capability
npm run migration:revert

# 4. Test re-running migrations
npm run migration:run

# 5. Cleanup
dropdb nightbff_migration_test
```

#### Integration Testing
```bash
# Test with production-like data volume
npm run seed:run
npm run migration:run
npm run test:integration
```

### 4. Code Review Process

#### Migration Review Checklist
- [ ] **Naming**: Follows timestamp-PascalCase convention
- [ ] **Safety**: No data loss potential, rollback implemented
- [ ] **Performance**: Indexes added for new queries, considers table size
- [ ] **Compatibility**: Works with current application code
- [ ] **Testing**: Successfully tested on development database

#### Required Approvals
- **Database Admin**: For schema changes affecting core entities
- **DevOps**: For migrations requiring downtime or affecting performance
- **Team Lead**: For all migrations in production releases

### 5. Deployment Guidelines

#### Pre-Deployment Checklist
- [ ] Migration validated with `npm run migration:validate`
- [ ] Tested on staging environment with production data volume
- [ ] Rollback strategy documented and tested
- [ ] Team notified via #deployments channel
- [ ] Backup verification completed

#### Deployment Process
```bash
# 1. Production backup (automated by CI/CD)
# 2. Deploy migration container
# 3. Verify migration completion
# 4. Deploy application changes
# 5. Verify application functionality
```

## Emergency Procedures

### Migration Failure Recovery

#### If Migration Fails During Deployment
1. **Immediate Response**
   ```bash
   # Check migration status
   npm run migration:show
   
   # Review error logs
   docker logs migration_container
   ```

2. **Rollback Process**
   ```bash
   # Option A: Revert migration
   npm run migration:revert
   
   # Option B: Restore from backup (if revert fails)
   # Contact DevOps team immediately
   ```

3. **Post-Incident**
   - Document root cause in incident report
   - Update migration with fix
   - Re-test extensively before re-deployment

### Common Issue Resolution

#### "Migration Already Exists" Error
```bash
# Check existing migrations
npm run migration:show

# If duplicate timestamp, rename file with new timestamp
mv src/database/migrations/1737844400000-*.ts src/database/migrations/$(date +%s)000-NewName.ts
```

#### "Query Failed" During Migration
1. Review SQL syntax in migration file
2. Test query manually in database console
3. Check for table/column name conflicts
4. Verify permissions for migration user

#### Performance Issues with Large Tables
```typescript
// Use batch processing for large data migrations
public async up(queryRunner: QueryRunner): Promise<void> {
    const batchSize = 1000;
    let offset = 0;
    
    while (true) {
        const result = await queryRunner.query(`
            UPDATE large_table 
            SET new_column = calculated_value 
            WHERE id IN (
                SELECT id FROM large_table 
                WHERE new_column IS NULL 
                LIMIT ${batchSize} OFFSET ${offset}
            )
        `);
        
        if (result.affectedRows === 0) break;
        offset += batchSize;
        
        // Add small delay to prevent overwhelming database
        await new Promise(resolve => setTimeout(resolve, 100));
    }
}
```

## Team Communication

### Required Notifications

#### Before Creating Migration
- **Slack #database-changes**: "Planning migration for [feature], affects [tables]"
- **Include**: Timeline, affected tables, estimated downtime

#### Before Deployment
- **Slack #deployments**: "Migration [name] ready for deployment"
- **Include**: Migration summary, rollback plan, contacts

#### After Deployment
- **Slack #deployments**: "Migration [name] completed successfully"
- **Include**: Duration, any issues encountered, next steps

### Documentation Updates

#### When to Update Documentation
- New entity relationships added
- Database schema significantly changed
- New migration patterns introduced
- Performance optimizations implemented

#### Required Updates
- API documentation (if schema affects endpoints)
- Entity relationship diagrams
- Performance benchmarks
- Backup/restore procedures

## Performance Considerations

### Migration Performance Guidelines

#### Index Management
```typescript
// ✅ GOOD: Add index concurrently (PostgreSQL)
await queryRunner.query(`
    CREATE INDEX CONCURRENTLY idx_users_email_verified 
    ON users (email_verified_at) 
    WHERE email_verified_at IS NOT NULL
`);

// ❌ AVOID: Blocking index creation on large tables
await queryRunner.createIndex('users', new TableIndex({
    name: 'idx_users_email_verified',
    columnNames: ['email_verified_at']
}));
```

#### Large Table Modifications
- **Estimate Impact**: Calculate migration time based on table size
- **Use Staging**: Test on production-sized dataset first
- **Consider Alternatives**: Sometimes application-level changes are safer
- **Schedule Downtime**: For breaking changes requiring maintenance window

#### Memory Management
```typescript
// ✅ GOOD: Process large datasets in batches
for (let i = 0; i < totalRecords; i += batchSize) {
    const batch = await queryRunner.query(`
        SELECT * FROM large_table 
        LIMIT ${batchSize} OFFSET ${i}
    `);
    
    // Process batch
    // Clear memory
}

// ❌ AVOID: Loading entire table into memory
const allRecords = await queryRunner.query('SELECT * FROM large_table');
```

## Governance Integration

This document works alongside the [MIGRATION_GOVERNANCE.md](./MIGRATION_GOVERNANCE.md) framework:

- **Governance**: Establishes policies, mandatory procedures, violation prevention
- **Guidelines**: Provides practical implementation, daily workflows, troubleshooting

### Key Governance Reminders
- ✅ **Single Source of Truth**: Backend repository only (enforced by CI/CD)
- ✅ **Validation Required**: All migrations must pass `npm run migration:validate`
- ✅ **No Custom Scripts**: Use standard TypeORM CLI commands only
- ✅ **Duplication Prevention**: Automated checks in CI pipeline

## Resources

### References
- [TypeORM Migration Documentation](https://typeorm.io/migrations)
- [PostgreSQL Best Practices](https://wiki.postgresql.org/wiki/Don%27t_Do_This)
- [Database Migration Patterns](https://martinfowler.com/articles/evodb.html)

### Team Contacts
- **Database Admin**: @database-team (Slack)
- **DevOps Lead**: @devops-team (Slack)
- **Architecture Review**: @architecture-team (Slack)

### Tools
- **Migration Validator**: `npm run migration:validate`
- **Schema Diff**: `npm run typeorm schema:log`
- **Performance Monitor**: Check Grafana database metrics during migrations

---

**Last Updated**: Phase 5 Migration System Restructure  
**Version**: 1.0.0  
**Next Review**: After first production deployment with new system 