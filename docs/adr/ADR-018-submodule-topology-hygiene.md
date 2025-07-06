# ADR-018: Submodule Topology & Hygiene

**Status:** Accepted  
**Date:** 2025-07-05  
**Deciders:** Platform Team  
**Technical Story:** [Cyclic Submodule CI Failure Resolution](https://github.com/nightbff/integration/issues/71)

## Context

During integration testing, the CI pipeline failed with a cyclic submodule reference error:
```
fatal: No url found for submodule path 'app/nightbff-integration' in .gitmodules
Failed to recurse into the nested submodules of app
```

**Root Cause Analysis:**
- The backend repository (`app/`) accidentally contained an orphan submodule directory `nightbff-integration/`
- This directory existed without a corresponding `.gitmodules` entry
- When the integration repository tried to initialize submodules recursively, it failed on the orphan reference
- This created a cyclic dependency: integration repo → backend repo → integration repo

## Decision

We establish **strict submodule topology invariants** with automated enforcement:

### 1. **Topology Invariant**
```
ONLY the integration repository may reference backend/frontend as submodules.
Backend and frontend repositories MUST NEVER contain submodule references to the integration repository.
```

### 2. **Prevention Mechanisms**

#### A. CI Guard-Rails
- **Integration CI**: Add submodule verification step after checkout
- **Backend CI**: Add nested submodule hygiene check before tests
- **Frontend CI**: Add nested submodule hygiene check before tests

#### B. Developer Workflow Guards
- **Pre-commit hooks**: Prevent accidental submodule additions
- **Postinstall scripts**: Auto-install hooks on `npm install`

#### C. Runtime Validation
- **Submodule status checks**: Fail on orphan submodules lacking URLs
- **Recursive initialization**: Validate all submodules are properly configured

### 3. **Implementation Details**

#### Integration CI Guard-Rail
```yaml
- name: Verify submodules initialisable
  run: git submodule update --init --recursive --depth=1
```

#### Backend CI Guard-Rail
```yaml
- name: Ensure no nested submodules
  run: |
    set -euo pipefail
    if git submodule--helper list | grep -q "nightbff-integration"; then
      echo "::error::Integration repo must not appear as submodule inside backend"
      exit 1
    fi
    # Fail on any submodule lacking a url
    git submodule status --recursive | while read _path; do
      name=$(echo $_path | awk '{print $2}')
      url=$(git config -f .gitmodules --get submodule.$name.url || true)
      [ -z "$url" ] && { echo "::error::Submodule '$name' missing url"; exit 1; }
    done
```

#### Pre-commit Hook
```bash
#!/bin/sh
if git diff --cached --name-only | grep -q '^nightbff-integration/'; then
  echo "⛔  Do not add the integration repo as a sub-module."
  echo "    Integration repo should reference backend, not vice versa."
  exit 1
fi
```

## Consequences

### Positive
- **Eliminates cyclic submodule failures**: CI will never fail due to orphan submodules
- **Clear topology boundaries**: Developers understand the unidirectional dependency flow
- **Automated prevention**: Multiple layers of protection prevent accidental violations
- **Fast feedback**: Pre-commit hooks catch issues before they reach CI
- **Zero technical debt**: No workarounds or patches, just proper architecture

### Negative
- **Additional CI steps**: Slight increase in CI execution time (~5-10 seconds)
- **Developer setup**: Requires running `npm install` to install hooks
- **Maintenance overhead**: Guard-rails need updating if repository structure changes

### Neutral
- **Documentation burden**: This ADR and integration guide updates
- **Team training**: Developers need awareness of topology rules

## Compliance

### Validation Matrix
| Check | Expected Result |
|-------|----------------|
| `git submodule update --init --recursive` in backend | ✅ Completes successfully |
| `git submodule update --init --recursive` in frontend | ✅ Completes successfully |
| `git submodule update --init --recursive` in integration | ✅ Completes successfully |
| Backend CI pipeline | ✅ Green |
| Frontend CI pipeline | ✅ Green |
| Integration CI pipeline | ✅ Green |
| `git grep -R "nightbff-integration" -- ':!*.md'` in backend | ❌ No matches |
| `git grep -R "nightbff-integration" -- ':!*.md'` in frontend | ❌ No matches |

### Rollback Plan
- Previous backend commit tagged as `pre-submodule-scrub` for 30-day rollback capability
- Integration repository can reset submodule pointers if issues arise
- All changes are additive (guard-rails) and can be disabled without breaking functionality

## References
- [HYBRID_INTEGRATION_DEV_PLAN.md §3 Repository Topology](../HYBRID_INTEGRATION_DEV_PLAN.md#3-repository-topology)
- [Git Submodules Documentation](https://git-scm.com/docs/gitsubmodules)
- [Blueprint xx: Sustainable Fix Implementation](../DOCKER_ENVIRONMENT_ANALYSIS.md)

## Implementation Timeline
- **2025-07-05**: ADR approved and guard-rails implemented
- **2025-07-06**: Team notification and training
- **2025-07-12**: Full validation matrix execution
- **2025-08-05**: 30-day rollback window expires 