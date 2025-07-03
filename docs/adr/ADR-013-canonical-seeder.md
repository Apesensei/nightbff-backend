# ADR-013: Canonical Migration & Seeding Pipeline

Date: 2025-07-03

## Status
Accepted

## Context
Historically the NightBFF codebase contained two parallel seeding paths:

1. Stand-alone TS script `seed-admin-user.ts` (duplicated in backend and integration repos).
2. NestJS-aware `SeederModule` executed via `scripts/run-seeder.ts`.

The legacy script hard-coded obsolete env paths (`performance-testing/config/.env.performance`) and relied on deprecated `DB_*` variables, causing the *migrator* container to hang in CI when it failed.  Drift between the two implementations also introduced the risk of schema mismatch and duplicate data.

## Decision
We adopt **a single, authoritative pipeline** for both migrations and seed data:

* Migrations: `node dist/scripts/migrate.js` (TypeORM CLI wrapper).
* Seeding:    `node dist/scripts/run-seeder.js` (boots `SeederModule`).

These commands are exposed via NPM aliases:

```bash
npm run db:migrate   # Apply migrations
npm run db:seed      # Seed admin user – idempotent
```

All docker-compose stacks and CI jobs invoke these aliases; no TypeScript sources are compiled inside runtime containers.

A CI guard (`scripts/ci/no-rogue-seeds.sh`) fails the build if any `seed-admin-user.ts` resurfaces.

## Consequences
* Zero duplication – easier maintenance and on-boarding.
* Idempotent seeder ensures CI can run database setup repeatedly without unique-constraint failures.
* Guard script enforces compliance automatically.
* Integration & performance stacks are unblocked; migrator container exits quickly.

## Alternatives Considered
* Keep both scripts and selectively execute based on `NODE_ENV`.  Rejected: complexity, still prone to drift.
* Replace TypeORM migrations with Prisma.  Might happen in the future but outside current scope.

## Follow-ups
* Move tooling to `tools/` package for clearer intent (future housekeeping).
* Monitor connection pool metrics via `postgres_exporter` after big data imports. 