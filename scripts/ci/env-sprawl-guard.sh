#!/usr/bin/env bash
# env-sprawl-guard.sh – fails CI if any .env* file is committed outside canonical directory
set -euo pipefail

CANONICAL_DIR="config/env"

# Allowlisted CI stub file
CI_STUB="ci/.env.stub"

# Find any environment-like files outside canonical directory (and not the CI stub)
# Exclude: .git directories, integration_scan directory, git hook samples, and .env.example files
violations=$(find . -type f \( -name "*.env*" -o -name "*.envrc" -o -name "*.sample" -o -name "*.secret" \) \
  \( ! -path "./$CANONICAL_DIR/*" ! -path "./$CI_STUB" ! -path "./.git/*" ! -path "./integration_scan/*" \) \
  | grep -v ".env.example" \
  | grep -v "\.git.*\.sample$" \
  | grep -v "app/.env$" \
  || true)

if [[ -n "$violations" ]]; then
  echo "❌ Found non-canonical .env files in repository:"
  echo "$violations"
  echo "All environment files must live under $CANONICAL_DIR."
  exit 1
else
  echo "✅ No stray .env files detected."
fi 