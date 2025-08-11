# Troubleshooting

## Backend cannot bind (EADDRINUSE)
- Symptom: "EADDRINUSE: address already in use" on 3000/3001.
- Check who holds the port:
  - `lsof -nP -iTCP -sTCP:LISTEN | egrep ':(3000|3001)'`
- Resolution:
  - Integration uses 3000. Run local backend on 3001.

## DB ECONNREFUSED in Local Dev
- Symptom: TypeORM retries to `127.0.0.1:<port>` and fails.
- Check Postgres mapping:
  - `docker ps | egrep 'nightbff_postgres_local'`
  - Expect `0.0.0.0:5434->5432/tcp`
- Resolution:
  - Ensure `POSTGRES_PORT=5434` in `app/config/env/development.env` and re-run `npm run dev:db`.

## Quick health checks
- Integration backend: `curl -s http://localhost:3000/health`
- Local backend: `curl -s http://localhost:3001/health`
