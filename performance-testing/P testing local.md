# NightBFF Performance Testing Environment & Progressive Coverage Plan

## ✅ **CI/CD STABILITY RESOLVED - MIGRATION & SEEDING ARCHITECTURE OVERHAULED** ✅
**Environment:** `migrator` service in `docker-compose.performance.yml`
**Status:** ROOT CAUSE IDENTIFIED AND RESOLVED - CI/CD pipeline unblocked.
**Date:** 2025-06-30

---

### **🎯 PROBLEM SUMMARY**
The CI/CD pipeline was persistently failing due to a cascade of errors within the `migrator` service. The service would either fail to find migration files, fail to connect to the database, or crash during the database seeding step with `MODULE_NOT_FOUND` or `EntityMetadataNotFoundError` errors. This blocked all performance testing and deployment validation.

### **🔬 FORENSIC INVESTIGATION & ROOT CAUSE ANALYSIS**
A deep, multi-day investigation revealed several interacting root causes:
1.  **Non-Existent Seeder Script:** The primary cause of the `MODULE_NOT_FOUND` errors was that the old `run-migration.js` script was attempting to execute a non-existent file: `smoke.seeder.ts`.
2.  **Fragile Execution Environment:** The old method of using `ts-node` directly in a production Docker container for seeding was brittle and suffered from pathing and module resolution issues.
3.  **Incorrect Entity/Migration Paths:** The `data-source.ts` file had incorrect glob patterns that failed to locate the compiled JavaScript migration files in the `dist/` directory after a build.
4.  **Flawed Dependency Injection:** The seeder script was not running within a proper NestJS application context, leading to `UnknownDependenciesException` and `EntityMetadataNotFoundError` because the `UserRepository` could not be injected with its `DataSource`.
5.  **Inconsistent Docker Configuration:** Multiple, conflicting `docker-compose` files, credential mismatches between the application and the database container, and a lack of healthchecks created an unstable environment where services would attempt to connect before the database was ready.

### **🔧 ARCHITECTURAL SOLUTION IMPLEMENTED**
A comprehensive, 3-phase plan was executed to replace the fragile scripts with a robust, industry-standard NestJS-native architecture.

**Phase 1: Robust Seeding Structure**
- A new `SeederModule` and `SeederService` were created within the NestJS application (`app/src/database/seeds/`).
- This encapsulates all seeding logic and correctly uses NestJS Dependency Injection to provide repositories (`UserRepository`, `AgeVerificationRepository`) to the service, eliminating dependency errors.

**Phase 2: Reliable Runner & Docker Integration**
- A new NestJS-native runner script, `run-seeder.ts`, was created to bootstrap a headless application context and reliably execute the `SeederService`.
- The `docker-compose.performance.yml` was updated to first run migrations using the standard TypeORM CLI and then execute the new, compiled `run-seeder.js` script.

**Phase 3: Docker Environment Hardening & Cleanup**
- All disparate `docker-compose` files (`infra`, `app`, etc.) were consolidated into a single, authoritative `docker-compose.performance.yml`.
- A `healthcheck` was added to the `postgres_perf` service, and the `migrator` was configured with `depends_on` to ensure it only starts after the database is fully ready, preventing all connection errors.
- All old, fragile, and redundant scripts (`run-migration.js`, `data-source.script.ts`) were deleted.

### **✅ FINAL VALIDATION**
The new architecture was validated with a complete teardown and rebuild of the Docker environment. The `migrator` service now executes flawlessly:
1.  Waits for the database to be healthy.
2.  Runs all TypeORM migrations successfully.
3.  Executes the seeder, which correctly creates the admin user.
4.  Exits with a success code.

**The CI/CD pipeline is now stable, reliable, and unblocked.**

---

</rewritten_file>