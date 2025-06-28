# Migration Governance Framework
**NightBFF Backend - Database Migration Management**

## 📋 Overview
This document establishes the governance framework for database migrations across the NightBFF monorepo to prevent duplication and ensure data integrity.

## 🎯 Core Principles

### 1. Single Source of Truth
- **Backend repository** (`app/src/database/migrations/`) is the **ONLY** location for migrations
- Integration repository **MUST NOT** contain migration files
- All repositories reference backend migrations through configuration

### 2. Migration Creation Process
```bash
# ✅ CORRECT: Create migrations only in backend
cd app/
npm run migration:create -- CreateNewFeature

# ❌ WRONG: Never create migrations in integration repo
cd nightbff-integration/app/app/
npm run migration:create -- CreateNewFeature  # FORBIDDEN
```

### 3. Naming Convention
- Format: `{timestamp}-{PascalCaseDescription}.ts`
- Use descriptive names explaining the change
- Avoid generic names like "Update" or "Fix"

## 🔧 Technical Implementation

### Backend Configuration
- Migrations located: `src/database/migrations/`
- Configuration: `src/database/config/data-source.ts`
- CLI scripts available via `package.json`

### Integration Repository Configuration
- **NO** local migrations directory
- References backend via: `../../app/src/database/migrations/`
- Updated in: `nightbff-integration/app/app/src/data-source.ts`

## 🚫 Prohibited Actions

### NEVER DO:
1. Create migration files in integration repository
2. Copy migration files between repositories
3. Modify migration files after they've been applied to production
4. Create migrations with generic or unclear names
5. Include seed data in migration files

## ✅ Required Actions

### ALWAYS DO:
1. Run `npm run migration:validate` before deployments
2. Create migrations only in backend repository
3. Use descriptive migration names
4. Test migrations in development environment first
5. Document breaking changes in migration comments

## 🔍 Validation Process

### Pre-Deployment Checklist
```bash
# 1. Validate migration structure
npm run migration:validate

# 2. Test migration execution
npm run migration:run --dry-run

# 3. Verify integration repo configuration
grep -r "migrations" ../nightbff-integration/app/app/src/data-source.ts
```

### Continuous Integration
- Migration validator runs on every PR
- Blocks deployment if duplicates detected
- Validates naming conventions automatically

## 🚨 Emergency Procedures

### If Duplicates Are Detected
1. **STOP** all deployments immediately
2. Run `npm run migration:validate` for detailed analysis
3. Follow consolidation procedure:
   - Backup affected migrations
   - Remove duplicates from integration repo
   - Update integration data-source configuration
   - Validate single source of truth

### Rollback Procedure
1. Use TypeORM revert: `npm run migration:revert`
2. Check database state consistency
3. Update application deployments
4. Validate integration points

## 📊 Monitoring & Metrics

### Key Indicators
- Zero duplicate migrations across repositories
- Migration execution success rate > 99%
- Average migration file size < 10KB
- Zero seed data violations

### Alerting Thresholds
- **CRITICAL**: Duplicate migrations detected
- **WARNING**: Migration file > 50KB
- **WARNING**: Seed data detected in migration

## 🤝 Team Responsibilities

### Developers
- Create migrations only in backend
- Follow naming conventions
- Test migrations locally
- Document breaking changes

### DevOps
- Monitor migration execution
- Maintain CI validation pipeline
- Ensure backup procedures
- Coordinate emergency responses

### Tech Leads
- Review migration PRs
- Approve breaking changes
- Maintain governance documentation
- Escalate governance violations

## 📚 Reference

### Related Documents
- `MIGRATION_RESTRUCTURE_PLAN.md` - Overall restructure strategy
- `src/database/README.md` - Technical implementation details
- TypeORM Documentation - Official migration guide

### Tools
- `migration-validator.ts` - Automated validation tool
- Package scripts in `package.json`
- Integration CI pipeline configurations

---

**⚠️ CRITICAL**: This governance framework is **MANDATORY** for all team members. Violations will result in deployment blocks and required remediation.

**Last Updated**: June 2024
**Next Review**: September 2024 