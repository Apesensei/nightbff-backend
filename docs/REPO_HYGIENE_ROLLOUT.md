# Repository Hygiene Rollout Plan (Backend + Integration)

Scope: Non-functional, CI-neutral hygiene. Applies to backend now; mirror in integration repo via separate PR.

## Backend (this repo)
- Add PR/Issue templates and .editorconfig (done in this branch)
- Keep docs-only PRs labeled and gated by CI green
- No secrets policy reinforced in templates

## Integration repo (follow-up PR)
- Add same templates and .editorconfig
- Ensure submodule sanity checks remain (no cyclic references)
- Document compose usage and ports in its README (align with backend README)

## Process
- Open PRs labeled `docs-only` / `hygiene`
- Require 1 reviewer from backend + 1 from iOS
- Merge once CI green (no workflow changes included)
