# NightBFF Backend – Local & Integration Guide

This repository hosts the NightBFF backend and local integration harness. Use this README as the canonical quickstart for Local Development, Integration testing, and Performance experiments.

## Stacks at a glance
- Local Dev: backend 3001, Postgres 5434, Redis 6379
- Integration: backend 3000, Postgres 5435, Metro 8081
- Performance: dedicated compose; recommend Postgres host port 5436+

## Quickstart
- Local DB (from `app/`):
  - `npm run dev:db`  # Postgres 5434, Redis 6379
- Local backend (from `app/`):
  - `npm run start:dev`  # binds 3001
- Integration stack (from repo root):
  - `docker compose -f integration/docker-compose.yaml up -d`
  - Backend health: http://localhost:3000/health
- Performance stack (from repo root):
  - `HOST_POSTGRES_PORT=5436 docker compose -f performance-testing/docker/docker-compose.performance.yml up -d`

## Useful health checks
- Integration backend: `GET http://localhost:3000/health`
- Local backend: `GET http://localhost:3001/health`

## References
- `HYBRID_INTEGRATION_DEV_PLAN.md`
- `EVERGREEN_CI_PIPELINE_STATUS_CHECKER.md`
- ADRs under `docs/adr/`
- Frontend integration guides under `app/`

# NightBFF Backend – Local & Integration Guide

This repository hosts the NightBFF backend and local integration harness. Use this README as the canonical quickstart for Local Development, Integration testing, and Performance experiments.

## Stacks at a glance
- Local Dev: backend 3001, Postgres 5434, Redis 6379
- Integration: backend 3000, Postgres 5435, Metro 8081
- Performance: dedicated compose; recommend Postgres host port 5436+

## Quickstart
- Local DB (from `app/`):
  - `npm run dev:db`  # Postgres 5434, Redis 6379
- Local backend (from `app/`):
  - `npm run start:dev`  # binds 3001
- Integration stack (from repo root):
  - `docker compose -f integration/docker-compose.yaml up -d`
  - Backend health: http://localhost:3000/health
- Performance stack (from repo root):
  - `HOST_POSTGRES_PORT=5436 docker compose -f performance-testing/docker/docker-compose.performance.yml up -d`

## Useful health checks
- Integration backend: `GET http://localhost:3000/health`
- Local backend: `GET http://localhost:3001/health`

## References
- `HYBRID_INTEGRATION_DEV_PLAN.md`
- `EVERGREEN_CI_PIPELINE_STATUS_CHECKER.md`
- ADRs under `docs/adr/`
- Frontend integration guides under `app/`

