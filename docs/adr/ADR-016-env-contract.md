# ADR-016 Environment Contract Enforcement

Date: 2025-07-03

## Status
Accepted

## Context
Historically the project supported two competing sets of database variables:

* **POSTGRES_* (12-factor recommended)** – canonical naming shipped in Docker images.
* **DB_* (legacy)** – carry-over from early prototype scripts.

The duality caused silent mis-configuration in CI; `migrator` containers locked up whenever *both* families were present.  After consolidating env files we still needed an automated guard-rail so the anti-pattern never returns.

## Decision
1.  Define a single authoritative schema (Zod) at `app/src/config/env.schema.ts`.
2.  **Fail-fast** at service bootstrap if any forbidden `DB_HOST|DB_PORT|DB_USERNAME|DB_PASSWORD|DB_DATABASE` variables are detected.  Pool-tuning keys (e.g. `DB_POOL_SIZE`) remain allowed.
3.  Provide a CLI helper `npm run env:lint` so CI and developers get the same validation.
4.  Wire `validateEnv()` into *all* entry points (`src/data-source.ts`, `src/data-source.cli.ts`).
5.  Harden GitHub workflows via two new steps:
   ```yaml
   - name: Validate environment variables
     run: npm run env:lint

   - name: Block deprecated DB_* variables
     run: |
       if grep -R --line-number -e '^DB_' config/env app/.env.*; then exit 1; fi
   ```

## Consequences
* Any re-introduction of forbidden vars will surface within seconds in local `npm install`, Docker build, or GitHub Actions.
* The contract is documented and version-controlled; future changes require editing this ADR.
* CI pipelines include a single-source validation script, eliminating drift.
* Developer ergonomics improve – error message explicitly lists the offending keys.

## Alternatives Considered
* **Soft-warning at runtime** – rejected; errors might stay hidden until production.
* **Helm chart enforcement only** – rejected; wouldn't protect dev or CI paths.
* **Pre-commit git hook** – additive but cannot replace server-side CI guard.

## Postgres Host-Port Strategy
To avoid local port collisions the host→container mapping is now **opt-in**.

```yaml
ports:
  - "${HOST_POSTGRES_PORT}:5432"   # set by choose-pg-port.sh
```

A helper script `scripts/ci/choose-pg-port.sh` picks the first free port in the
`5434-5500` range and exports `HOST_POSTGRES_PORT` (also writes to `$GITHUB_ENV`
inside CI).  Developers can source the script or rely on workflows to invoke
it automatically:

```bash
bash scripts/ci/choose-pg-port.sh && \
  docker compose -f performance-testing/docker/docker-compose.performance.yml up
```

If the variable is left undefined the compose command errors out with a clear
message, preventing silent random allocations.

---
"Errors should never pass silently – unless explicitly silenced." ― *The Zen of Python* 