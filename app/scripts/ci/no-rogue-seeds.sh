#!/usr/bin/env bash
set -euo pipefail

# Fails CI if legacy seed-admin-user files are present in the repo history

rogue=$(git ls-files | grep -E "seed-admin-user\\.ts$" || true)

if [[ -n "$rogue" ]]; then
  echo "❌ Rogue seeder files detected. The following files must be deleted:" >&2
  echo "$rogue" >&2
  exit 1
fi

echo "✅ No rogue seed scripts detected." 