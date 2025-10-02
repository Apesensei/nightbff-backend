# Cache-Manager v6 Migration Log

**Date:** October 2, 2025  
**Migration Type:** Major version upgrade (v5 → v6)  
**Status:** ✅ Completed  
**Commits:** `92edcc2`, `5922811`, `8e7719a`

---

## Context

Upgraded `cache-manager` from v5 to v6 to maintain compatibility with `@nestjs/cache-manager@3.x`, which is required for NestJS 11 support.

### Why This Was Necessary

- **NestJS 11 Requirement**: The backend uses NestJS 11, which requires `@nestjs/cache-manager@3.x`
- **Dependency Conflict**: `@nestjs/cache-manager@3.x` requires `cache-manager@>=6`
- **No Downgrade Path**: Attempting to use cache-manager v5 would force a downgrade to NestJS 10, breaking many dependencies

---

## Changes Made

### Dependencies

```json
{
  "cache-manager": "^5.7.6" → "^6.4.3",
  "@nestjs/cache-manager": "2.2.2" → "3.0.1"
}
```

### Code Changes (16 files)

#### 1. Module Files (5 files)
Replaced deprecated `caching()` function with `createCache()`:
- `app/src/microservices/interest/interest.module.ts`
- `app/src/microservices/event/event.module.ts`
- `app/src/microservices/plan/plan.module.ts`
- `app/src/microservices/event/events.module.ts`
- `app/src/microservices/venue/venue.module.ts`

#### 2. Service/Controller Files (11 files)
Updated `Cache` type import from `cache-manager` to `@nestjs/cache-manager`:
- `venue.service.ts`
- `performance-monitoring.controller.ts`
- `city.controller.ts`
- `plan.controller.ts`
- `venue-cache.service.ts`
- `cache-warming.service.ts`
- `interest-analytics.service.ts`
- `interest.repository.ts`
- `plan-analytics.service.ts`
- `venue-trending.service.ts`
- `plan-trending.service.ts`

#### 3. Service Logic Updates (1 file)
Updated direct store access pattern:
- `venue-trending.service.ts`: Changed `.store` → `.stores[0]` (v6 API change)

#### 4. Test Mocks (1 file)
Updated test mocks to match v6 API:
- `venue-trending.service.spec.ts`: Changed `store: {...}` → `stores: [{...}]`

### API Changes

```typescript
// Before (v5)
import { caching } from 'cache-manager';
const cache = await caching(storeFactory);
if (cache && cache.store) { ... }

// After (v6)
import { createCache } from 'cache-manager';
const cache = createCache({ stores: [keyvInstance] });  // Synchronous!
if (cache && cache.stores[0]) { ... }
```

```typescript
// Type Import Changes
// Before
import type { Cache } from 'cache-manager';

// After
import type { Cache } from '@nestjs/cache-manager';
```

---

## Validation

- ✅ **TypeScript Compilation**: Successful (`npm run build`)
- ✅ **Unit Tests**: All 506 tests passing, 4 skipped (intentional)
- ✅ **Integration Tests**: Passing (with proper mocking for native modules)
- ✅ **CI Workflows**: All jobs passing
  - `ci-backend.yml`: Main test suite ✅
  - `ci-seeder-guard.yml`: Seeder idempotency ✅
  - `nightly-migration-test.yml`: DB migrations ✅
- ✅ **No Behavioral Changes**: Cache functionality identical (Keyv handles TTL, storage, etc.)

---

## Rollback Plan

If critical issues arise in production:

### Option 1: Revert Commits (Recommended)
```bash
# Revert the 3 migration commits
git revert 8e7719a 5922811 92edcc2

# Or hard reset (if not merged to production)
git reset --hard b1932f3
```

### Option 2: Emergency Patch
If specific issues are identified:
1. Identify failing code path
2. Apply targeted fix (likely `.stores[0]` access issue)
3. Deploy hotfix

### Option 3: Full Rollback with Lock File
```bash
cd app
git checkout b1932f3 -- package.json package-lock.json
npm install
npm test  # Verify v5 works
```

**Note**: All v5 code is preserved in git history and can be restored immediately.

---

## Performance Impact

**Measured Metrics:**
- Build time: ~25s (unchanged)
- Test runtime: ~26s (unchanged)
- Redis connection latency: <5ms (unchanged)
- Cache hit rates: 85%+ (unchanged)

**Conclusion**: Zero performance regression. V6 API is purely surface-level.

---

## Related Issues & PRs

- **Migration Commits**: 
  - `92edcc2`: Initial cache-manager@6 upgrade
  - `5922811`: Code refactoring for v6 API
  - `8e7719a`: CI seeder guard fix
- **Upstream Issue**: NestJS 11 requires @nestjs/cache-manager@3.x
- **Documentation**: https://github.com/jaredwray/cacheable#migration-from-v5-to-v6

---

## Lessons Learned

1. **Plan for Breaking Changes**: Major version upgrades require thorough dependency tree analysis
2. **Test Coverage Saves Time**: Our 506 tests caught all regressions immediately
3. **API Surface vs Logic**: V6 only changed the API surface, not the underlying behavior
4. **CI Isolation**: Seeder guard needed test isolation to avoid native module issues

---

## Future Considerations

1. **Monitor v7 Release**: Cache-manager v7 changes return types from `null` to `undefined`
2. **Pino Vulnerability**: fast-redact issue remains (requires `@pact-foundation/pact@9.18.1` breaking change)
3. **Native Modules**: Consider mocking `sharp` conditionally in CI if issues persist

---

**Maintained by:** Backend Team  
**Last Updated:** October 2, 2025

