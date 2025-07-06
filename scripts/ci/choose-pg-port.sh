#!/usr/bin/env bash
# Resolve a free host port for Postgres and export HOST_POSTGRES_PORT
# Strategy: start at 5434, iterate upwards until a free port is found.
# If HOST_POSTGRES_PORT is already defined, we honour it.
set -euo pipefail

if [[ -n "${HOST_POSTGRES_PORT:-}" ]]; then
  echo "HOST_POSTGRES_PORT preset to $HOST_POSTGRES_PORT"
  exit 0
fi

START=5434
END=5500 # 66 candidate ports – plenty for local dev / CI runners
for ((p=START; p<=END; p++)); do
  if ! lsof -iTCP:"$p" -sTCP:LISTEN >/dev/null 2>&1; then
    export HOST_POSTGRES_PORT="$p"
    echo "Chosen free HOST_POSTGRES_PORT=$p"
    # If running under GitHub Actions or similar, propagate var
    if [[ -n "${GITHUB_ENV:-}" ]]; then
      echo "HOST_POSTGRES_PORT=$p" >> "$GITHUB_ENV"
    fi
    exit 0
  fi
done

echo "❌ No free host port for Postgres found in range ${START}-${END}" >&2
exit 1

# If executed (not sourced), print the export so caller can eval it
if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
  echo "export HOST_POSTGRES_PORT=$HOST_POSTGRES_PORT"
fi 