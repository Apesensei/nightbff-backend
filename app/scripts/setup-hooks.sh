#!/bin/bash
# Setup Git hooks for NightBFF Backend
# Prevents accidental addition of integration repo as submodule

set -euo pipefail

HOOKS_DIR=".git/hooks"
PRE_COMMIT_HOOK="$HOOKS_DIR/pre-commit"

echo "�� Setting up Git hooks for NightBFF Backend..."

# Ensure hooks directory exists
mkdir -p "$HOOKS_DIR"

# Create pre-commit hook
cat > "$PRE_COMMIT_HOOK" << 'HOOK_EOF'
#!/bin/sh
# NightBFF Backend Pre-commit Hook
# Prevents cyclic submodule references

if git diff --cached --name-only | grep -q '^nightbff-integration/'; then
  echo "⛔  Do not add the integration repo as a sub-module."
  echo "    Integration repo should reference backend, not vice versa."
  echo "    See: HYBRID_INTEGRATION_DEV_PLAN.md §3 Repository Topology"
  exit 1
fi

# Check for any orphan submodules without URLs
if [ -f .gitmodules ]; then
  git submodule status --recursive | while read _path; do
    name=$(echo $_path | awk '{print $2}')
    url=$(git config -f .gitmodules --get submodule.$name.url || true)
    if [ -z "$url" ]; then
      echo "⛔  Submodule '$name' is missing URL in .gitmodules"
      echo "    This creates orphan submodules that break CI"
      exit 1
    fi
  done
fi
HOOK_EOF

# Make hook executable
chmod +x "$PRE_COMMIT_HOOK"

echo "✅ Pre-commit hook installed successfully"
echo "   Location: $PRE_COMMIT_HOOK"
echo "   Purpose: Prevents cyclic submodule references"
