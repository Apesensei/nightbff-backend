# Environment Contracts (Backend)

Canonical environment schema required by the NightBFF backend in CI and integration.

## Variables
- NODE_ENV: integration|test|development
- POSTGRES_HOST: db or localhost
- POSTGRES_PORT: 5432
- POSTGRES_USER: admin
- POSTGRES_PASSWORD: (GitHub Secret)
- POSTGRES_DB: nightbff_integration_db
- REDIS_HOST: redis or localhost
- REDIS_PORT: 6379
- JWT_SECRET: (GitHub Secret; min 32 chars)
- DISABLE_EXTERNAL_APIS: true

## Health endpoints
- Backend: GET /health → 200

## Enforcement
- `npm run env:lint` validates schema; fails on missing/invalid values.
- ADR‑016: forbid legacy DB_* variables; use POSTGRES_* consistently.
