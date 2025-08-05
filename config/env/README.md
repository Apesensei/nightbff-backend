# NightBFF Environment Configuration

## Centralized Environment Loader (2025-07-20)

**All direct Node scripts must load environment variables via the centralized loader.**

### Usage Pattern

- For any script run from compiled JS (dist/):
  ```sh
  node --require ./dist/scripts/load-env.js dist/scripts/migrate.js
  ```
- For npm scripts, ensure the `--require ./dist/scripts/load-env.js` flag is present in `package.json`.
- Do **not** manually import `dotenv` or load envs in individual scripts.

### Why?
- Guarantees all scripts (migrate, seed, validate, etc.) load envs from `config/env/`.
- Eliminates “works on my machine” bugs.
- Future-proofs CI/CD and onboarding.

### Troubleshooting
- If you see missing env errors, check that the loader is required in your script invocation.
- If you run scripts directly, always use the preload flag.
- For TypeScript scripts run with `ts-node`, use:
  ```sh
  ts-node --require ./scripts/load-env scripts/seed-loadtest-data.ts
  ```

### Enforcement
- CI will fail if scripts are missing the loader (see .github/scripts/check-env-loader.js).

---

For more, see [ENV_CENTRALIZATION_ACTION_PLAN.md](../../REBASE & RECONCILIATION/ENV_CENTRALIZATION_ACTION_PLAN.md) 