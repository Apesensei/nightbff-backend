# NightBFF – Environment Configuration Manual

> **Single-Source-of-Truth**
> All runtime configuration lives in this directory.  **No other `.env*` files are allowed in the repo.**  CI fails fast if a stray file is committed.

## Directory Contents

| File | Purpose | Loaded When `NODE_ENV` = |
|------|---------|-------------------------|
| `base.env` | Non-secret defaults that apply everywhere (ports, log-levels, feature toggles) | *always* (loaded first) |
| `development.env` | Developer overrides for local `npm start` / `docker-compose.performance.yml` | `development` |
| `test.env` | Settings for Jest & e2e / contract tests | `test` |
| `performance.env` | Heavy-load perf harness (`docker-compose.performance.yml`, k6) | `performance` |
| `integration.env` | CI sandbox stack in `nightbff-integration/` | `integration` |
| `production.env` | Reserved for future prod deployment (empty stub) | `production` |

Secrets **never** belong in the files above.
They are injected at runtime via one of:

* GitHub Actions → `${{ secrets.* }}` → `echo KEY=*** >> production.secrets`  
* Local development → your own untracked `development.secrets` (see template below)

The app bootstrap (`ConfigModule.forRoot`) loads two layers in order:

1. `config/env/base.env`
2. `config/env/${NODE_ENV}.env` (overrides any key from the base layer)

## Adding / Changing Variables

1. Pick the **semantic prefix** (`POSTGRES_`, `REDIS_`, `JWT_`, etc.).  
   Aliases are disallowed – choose one canonical key.
2. Add the key to **both** `base.env` *and* every override that needs a different value.  
   Leave empty (`KEY=`) if not required in that environment.
3. If the variable is secret, add it to the matching `*.secrets` file in your own workstation or in the CI secrets store – **never** commit the value.
4. Run `npx dotenv-linter config/env/*.env` – lint must pass.
5. Commit with message `env: add FOO_BAR toggle (affects <feature>)`.

## Local Secrets Template

```bash
# Save as config/env/development.secrets (git-ignored)
JWT_SECRET=dev-super-secret
POSTGRES_PASSWORD=password123
REDIS_PASSWORD=
```

## CI Guard & Lint

* `.github/workflows/ci-backend.yml` calls `dotenv-linter` and `scripts/ci/env-sprawl-guard.sh` on every push.  
* The guard script fails if any file matching `*.env*` exists **outside** this directory (exception: `app/.env.example`).

## Legacy Files

The old templates in `app/.env.*` have been replaced with banners pointing here.  They will be removed in the next major release.

## FAQ

**Q. How do I override a variable just for a one-off command?**  
A. Prefix the command: `NODE_ENV=performance DB_POOL_SIZE=30 npm run start` – CLI args beat `.env`.

**Q. Can I create a new environment (e.g., `staging`)?**  
Add `staging.env`, update the `envFileMap` in `app/src/data-source.ts` & `app/src/app.module.ts`, and wire a corresponding CI job.

**Q. What about `.env.example`?**  
It remains at repo root as a *human-readable* quick start; actual code never reads it.

---
Happy hacking! – NightBFF Core Platform Team 