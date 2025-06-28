# NightBFF Database Migration Guidelines

## Overview

Practical day-to-day guidelines complementing [MIGRATION_GOVERNANCE.md](./MIGRATION_GOVERNANCE.md).

## Quick Reference

### Daily Commands
```bash
npm run migration:create --name=add_user_preferences
npm run migration:generate --name=update_venue_schema
npm run migration:run
npm run migration:show
npm run migration:validate
npm run migration:revert  # DANGER
```

### Naming Convention
**Format**: `{timestamp}-{PascalCaseDescription}.ts`
**Examples**: `1737844400000-AddUserPreferences.ts`

## Best Practices

### Before Creating Migrations
- [ ] Run `npm run migration:validate` 
- [ ] Check existing schemas
- [ ] Coordinate with team

### Migration Safety
- One logical change per migration
- Test both up() and down() methods
- Use nullable columns first, populate, then NOT NULL

### Code Review
- [ ] Naming follows convention
- [ ] No data loss potential
- [ ] Performance considerations
- [ ] Rollback tested

## Governance Integration

Works with MIGRATION_GOVERNANCE.md framework:
- ✅ **Single Source of Truth**: Backend repository only
- ✅ **Validation Required**: All migrations validated
- ✅ **Standard Tools**: TypeORM CLI only
- ✅ **No Duplicates**: CI/CD enforcement

## Emergency Procedures

### Migration Failure
1. Check status: `npm run migration:show`
2. Review logs: `docker logs migration_container`
3. Rollback: `npm run migration:revert`
4. Contact DevOps if backup restore needed

---
**Phase 5 Migration System Restructure**
