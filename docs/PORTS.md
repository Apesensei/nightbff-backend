# Port Policy

Reserved host ports and ownership:

- Local Dev: backend 3001, Postgres 5434, Redis 6379
- Integration: backend 3000, Postgres 5435, Metro 8081
- Performance: Postgres suggested starting at 5436 (set `HOST_POSTGRES_PORT` explicitly)

Notes:
- Fixed ports avoid drift after reboots and prevent EADDRINUSE.
- If a reserved port is occupied, pick another free port and export it inline for compose, e.g.:
  - `HOST_POSTGRES_PORT=5440 docker compose -f performance-testing/docker/docker-compose.performance.yml up -d`
