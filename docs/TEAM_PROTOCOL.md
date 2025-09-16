# Team Protocol: Local/Integration Usage

This protocol makes the new documentation actionable and repeatable.

## Daily flow
1. Choose your stack:
   - Local dev: backend 3001, Postgres 5434 → follow README Quickstart (app/ npm run dev:db, npm run start:dev)
   - Integration: backend 3000, Postgres 5435 → `docker compose -f integration/docker-compose.yaml up -d`
2. Validate with health checks:
   - Local: http://localhost:3001/health | Integration: http://localhost:3000/health
3. If something fails, use docs/TROUBLESHOOTING.md before escalating.

## Ports policy
- Respect docs/PORTS.md. If a reserved port is busy, pick a new free one explicitly (e.g., `HOST_POSTGRES_PORT=5440 ...`).

## PR hygiene
- Use the PR template checklist. Docs-only changes should link to README and relevant docs.

## Integration repo
- Mirror this protocol and link to its README in the integration repo so both sides stay aligned.
