# Secure Environment & Secrets Mapping

This document records **where each sensitive value lives** and how it reaches the running NightBFF services.  It is intended for platform engineers, SREs and security reviewers.

| Logical Variable | Source of Truth (GitHub Secret / AWS) | Injected In | Notes |
|------------------|----------------------------------------|-------------|-------|
| `POSTGRES_PASSWORD` | `GH_SECRET_POSTGRES_PASSWORD` | All CI jobs, ECS task definition | Rotated quarterly via GitHub Actions secret-rotation workflow. |
| `JWT_SECRET` | `GH_SECRET_JWT_SECRET` | CI, Runtime containers | 32-byte base64 string. |
| `SUPABASE_KEY` | `AWS/SSM Parameter /prod/supabase/key` | Runtime (ECS task bootstrap) | Never exposed in CI; stub value in `ci/.env.stub`. |
| `REDIS_PASSWORD` | `GH_SECRET_REDIS_PASSWORD` | Runtime only | Redis is not exposed publicly; still authenticated. |
| `GOOGLE_MAPS_API_KEY` | `AWS Secrets Manager` | Runtime only | Provided to services that require geocoding. |

> 📜 **Principles**
> 1. **No secrets in Git** – Every committed value must be a dummy.
> 2. **Single Source** – Exactly one upstream location (GitHub Secret _or_ AWS secret).  If duplication is required, a nightly sync job enforces parity.
> 3. **Least Privilege** – CI jobs only receive _test-grade_ secrets that cannot access production data.

## CI Runtime Flow
```
Checkout → cat ci/.env.stub >> $GITHUB_ENV → Load GH secrets for job → npm ci → npm run env:lint
```

The stub file guarantees schema validation; GH secrets upgrade any dummy values where stronger auth is needed (e.g. contract tests hitting mock Supabase).

## Rotation Playbook
1. Generate new value (length & entropy per secret-type table).
2. Update GitHub Secret (or AWS Parameter) ➟ label `rotated-YYYYMMDD`.
3. Re-deploy integration branch; verify tests.
4. Delete previous secret after 48 hours.

---
For questions, contact **Platform Security** (Slack #platform-sec). 