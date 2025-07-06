#!/usr/bin/env bash
# env-sprawl-guard.sh – fails CI if any .env* file is committed outside canonical directory
set -euo pipefail

CANONICAL_DIR="config/env"

violations=$(find . -type f -name "*.env*" \( ! -path "./$CANONICAL_DIR/*" ! -path "./.git/*" \) | grep -v ".env.example" || true)

if [[ -n "$violations" ]]; then
  echo "❌ Found non-canonical .env files in repository:"
  echo "$violations"
  echo "All environment files must live under $CANONICAL_DIR."
  exit 1
else
  echo "✅ No stray .env files detected."
fi 