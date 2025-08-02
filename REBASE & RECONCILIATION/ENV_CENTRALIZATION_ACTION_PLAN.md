# 🌐 NIGHTBFF ENVIRONMENT CENTRALIZATION – ACTION PLAN & GUIDING PRINCIPLES

**Date:** 2025-07-20  
**Owner:** saeidrafiei  
**Status:** READY FOR EXECUTION  
**Audience:** All NightBFF engineers, CI/CD maintainers, and reviewers

---

## **1. Guiding Principles**

- **Single Source of Truth:** All environment configuration must live in `@/config/env/`. No stray `.env` files or ad-hoc exports.
- **Explicit, Not Implicit:** Every script that needs envs must load them explicitly, not rely on shell state or CI magic.
- **Idempotency:** Env loader must never override already-set `process.env` values (unless explicitly allowed).
- **Fail Loud, Not Silent:** Missing or misconfigured envs should cause immediate, clear errors.
- **Peer-Reviewable:** All changes must be documented, justified, and reviewed—even if solo.
- **Automated Enforcement:** Pre-commit/CI checks must enforce loader usage and prevent drift.
- **Documentation-Driven:** Every change is reflected in onboarding docs and runbooks.

---

## **2. Why Centralize Env Loading?**

- **Eliminates “works on my machine” bugs** by ensuring all scripts (migrate, seed, test, etc.) load envs the same way.
- **Future-proofs CI/CD** by making env loading explicit and testable.
- **Reduces technical debt** by removing ad-hoc, script-specific hacks.
- **Enables rapid onboarding**—new devs and scripts follow one clear pattern.

---

## **3. Action Plan (Step-by-Step)**

### **Step 1: Audit All Script Entry Points**
- Inventory all scripts in `app/scripts/`, `integration_scan/backend/app/scripts/`, and any direct Node entrypoints in Docker/CI.
- List all scripts that are run directly (not via app bootstrap).

### **Step 2: Implement Central Env Loader**
- Create `scripts/load-env.ts` (or `.js`) that:
  - Loads `config/env/base.env` and the correct `${NODE_ENV}.env` using `dotenv`.
  - Does **not** override already-set `process.env` values unless explicitly allowed.
  - Logs which env file is loaded for traceability.
- Add clear comments and usage instructions at the top.

### **Step 3: Update All Scripts to Use Loader**
- At the top of every direct Node script (migrate, seed, etc.):
  ```ts
  import '../scripts/load-env';
  // or
  require('../scripts/load-env');
  ```
- Remove any ad-hoc env loading or manual exports.

### **Step 4: Test All Scripts Locally and in CI**
- Run all updated scripts locally and in CI to ensure envs are loaded as expected.
- Confirm that missing envs cause clear, actionable errors.

### **Step 5: Add Automated Enforcement**
- Add a pre-commit/CI check that scans for the loader import in all scripts in `scripts/`.
- Fail the check if any script is missing the loader.

### **Step 6: Update Documentation**
- Update `config/env/README.md` and onboarding docs to reflect the new standard.
- Add a section to `MIGRATION_GOVERNANCE.md` about env loading policy.

### **Step 7: Announce and Monitor**
- Announce the change in all team channels.
- Monitor CI and local dev for any regressions or confusion.
- Schedule a retro after rollout to capture lessons learned.

---

## **4. Risk Analysis & Mitigations**

| Risk                        | Probability | Impact | Mitigation                       |
|-----------------------------|-------------|--------|-----------------------------------|
| Missed script update        | LOW         | Script fails | Audit + CI check          |
| Loader overrides CI envs    | LOW         | Script fails | Idempotent loader         |
| Drift in future scripts     | LOW         | Script fails | Pre-commit/CI check       |
| Onboarding confusion        | LOW         | Slow devs   | Update docs, announce     |
| CI breakage                 | LOW         | Fast fail   | Test all scripts before merge |

---

## **5. Success Criteria**
- [ ] All scripts (migrate, seed, test, etc.) load envs via the central loader.
- [ ] No stray `.env` files or manual exports in the repo.
- [ ] CI and local runs behave identically for all scripts.
- [ ] Pre-commit/CI check enforces loader usage.
- [ ] Documentation is up to date and clear.
- [ ] No regressions in CI or local dev after rollout.

---

## **6. References & Further Reading**
- [dotenv NPM docs](https://www.npmjs.com/package/dotenv)
- [Node 20+ env-file support caveats](https://www.dotenv.org/blog/2023/10/28/node-20-6-0-includes-built-in-support-for-env-files.html)
- [TypeORM migration best practices](https://typeorm.io/migrations)
- [NightBFF config/env/README.md](../config/env/README.md)

---

**This is the “no assumptions, no surprises” action plan for environment centralization. Every step is explicit, justified, and peer-reviewable.**

If you want, I can generate the actual loader utility and a checklist for the audit. 

---

## Verified Script Entrypoint Audit & Loader Import Checklist

This section documents the reverified audit of all direct Node/TS scripts in both `app/scripts/` and `integration_scan/backend/app/scripts/` for environment loader centralization. Every entry is based on actual file reads, not just prior assumptions.

### Scripts That Need Loader Import (and Current Status)

| Script Path                        | Type         | Loads Env? | Loader Present? | Notes                |
|------------------------------------|--------------|------------|-----------------|----------------------|
| migrate.ts                         | migration    | ❌         | ❌              | Needs loader import  |
| run-seeder.ts                      | seeder       | ❌         | ❌              | Needs loader import  |
| seed-smoke.ts                      | seeder       | ❌         | ❌              | Needs loader import  |
| seed-loadtest-data.ts              | seeder       | ❌         | ❌ (uses dotenv directly) | Should use loader for consistency |
| seed-loadtest-data-performance.ts  | seeder       | ❌         | ❌ (uses dotenv directly) | Should use loader for consistency |
| validate-migrations.ts             | validator    | ❌         | ❌              | Needs loader import  |
| migration-analysis.js              | analysis     | ❌         | ❌              | Needs loader import  |
| verify-platform-binaries.js        | check        | ❌         | ❌              | Needs loader import  |
| validate-env.js                    | validator    | ❌         | ❌ (uses dotenv directly) | Should use loader for consistency |
| seed-performance-users.js          | seeder       | ❌         | ❌              | Needs loader import  |
| seed-comprehensive-loadtest-users.js| seeder      | ❌         | ❌              | Needs loader import  |
| seed-loadtest-user-interests.js    | seeder       | ❌         | ❌              | Needs loader import  |
| cache-warm-for-performance-tests.js| util         | ❌         | ❌              | Needs loader import  |
| regenerate-loadtest-user-ids.js    | util         | ❌         | ❌              | Needs loader import  |
| generate-loadtest-tokens.js        | util         | ❌         | ❌              | Needs loader import  |
| generate-perf-tokens.ts            | util         | ❌         | ❌              | Needs loader import  |

**(All above are present in both `app/scripts/` and `integration_scan/backend/app/scripts/`.)**

#### Scripts That Do NOT Need Loader Import
- `setup-hooks.sh`, `migration-smoke.sh`, `create-deployment-package.sh`, and other shell scripts: **N/A** (not Node entrypoints)
- Data files: **N/A**
- Any script only run via NestJS bootstrap: **N/A**

#### Special Cases
- Some scripts (e.g., `seed-loadtest-data.ts`, `seed-loadtest-data-performance.ts`, `validate-env.js`) currently use `dotenv` directly.  
  **Recommendation:** Remove direct `dotenv` usage and use the loader for consistency and maintainability.

### Loader Import Checklist

Add `import './load-env';` (TS) or `require('./load-env');` (JS) at the top of every script in the above list, in both locations. Remove any direct `dotenv` usage from these scripts. Test each script locally and in CI. Mark each as complete in the checklist below.

```markdown
| Script Path                        | app/scripts/ | integration_scan/backend/app/scripts/ | Loader Import | Tested Locally | CI Pass | Notes |
|------------------------------------|--------------|---------------------------------------|---------------|---------------|---------|-------|
| migrate.ts                         | [ ]          | [ ]                                   | [ ]           | [ ]           | [ ]     |       |
| run-seeder.ts                      | [ ]          | [ ]                                   | [ ]           | [ ]           | [ ]     |       |
| seed-smoke.ts                      | [ ]          | [ ]                                   | [ ]           | [ ]           | [ ]     |       |
| seed-loadtest-data.ts              | [ ]          | [ ]                                   | [ ]           | [ ]           | [ ]     | Remove direct dotenv |
| seed-loadtest-data-performance.ts  | [ ]          | [ ]                                   | [ ]           | [ ]           | [ ]     | Remove direct dotenv |
| validate-migrations.ts             | [ ]          | [ ]                                   | [ ]           | [ ]           | [ ]     |       |
| migration-analysis.js              | [ ]          | [ ]                                   | [ ]           | [ ]           | [ ]     |       |
| verify-platform-binaries.js        | [ ]          | [ ]                                   | [ ]           | [ ]           | [ ]     |       |
| validate-env.js                    | [ ]          | [ ]                                   | [ ]           | [ ]           | [ ]     | Remove direct dotenv |
| seed-performance-users.js          | [ ]          | [ ]                                   | [ ]           | [ ]           | [ ]     |       |
| seed-comprehensive-loadtest-users.js| [ ]         | [ ]                                   | [ ]           | [ ]           | [ ]     |       |
| seed-loadtest-user-interests.js    | [ ]          | [ ]                                   | [ ]           | [ ]           | [ ]     |       |
| cache-warm-for-performance-tests.js| [ ]          | [ ]                                   | [ ]           | [ ]           | [ ]     |       |
| regenerate-loadtest-user-ids.js    | [ ]          | [ ]                                   | [ ]           | [ ]           | [ ]     |       |
| generate-loadtest-tokens.js        | [ ]          | [ ]                                   | [ ]           | [ ]           | [ ]     |       |
| generate-perf-tokens.ts            | [ ]          | [ ]                                   | [ ]           | [ ]           | [ ]     |       |
```

---

**Instructions:**
- Add the loader import at the top of each script.
- Remove any direct `dotenv` usage.
- Test each script locally and in CI.
- Mark each as complete in the checklist.
- Peer review all changes.

--- 

---

## CI Enforcement: Centralized Env Loader

A CI check script (`.github/scripts/check-env-loader.js`) scans all `package.json` files for direct Node script invocations and ensures they use `--require ./dist/scripts/load-env.js`.

- **If any script is missing the loader, CI will fail with a clear error.**
- **To add new scripts or workspaces:** Update the `PKG_PATHS` array in the check script.
- **Reviewers:** Always check for the loader flag in new or modified scripts.
- **Onboarding:** New team members must use the preload pattern for all direct Node scripts.

This guarantees long-term enforcement and prevents drift or accidental bypass of the env loader standard. 