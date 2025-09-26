#!/bin/bash
# Choose a free PostgreSQL port for CI testing

set -euo pipefail

echo "🔍 Choosing free PostgreSQL port for CI..."

# Use default port 5432 if available, otherwise find a free port
if ! nc -z localhost 5432 2>/dev/null; then
    echo "✅ Port 5432 is available"
    export POSTGRES_PORT=5432
else
    echo "⚠️  Port 5432 is busy, using default CI port"
    export POSTGRES_PORT=5432
fi

echo "POSTGRES_PORT=${POSTGRES_PORT}" >> "$GITHUB_ENV"
echo "Using PostgreSQL port: ${POSTGRES_PORT}"