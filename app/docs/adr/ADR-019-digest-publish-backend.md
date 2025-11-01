# ADR-019: Digest-Driven Backend Image Publishing

## Status
Accepted

## Context
NightBFF backend needs to publish Docker images to GHCR with immutable digest references for integration testing. The integration repo must consume images by digest to ensure reproducible builds and avoid tag-based drift.

## Decision
Implement a GitHub Actions workflow that:
1. Builds and pushes backend Docker images to `ghcr.io/apesensei/nightbff-backend`
2. Tags images with `int-<short-sha>` pattern for traceability
3. Signs images with cosign (keyless)
4. Generates SBOM with syft
5. Exposes `workflow_call` with outputs: `image` (tag) and `digest` (sha256)
6. Uses `GITHUB_TOKEN` for authentication (OIDC, no PATs)

## Implementation
- Workflow: `.github/workflows/build-publish-backend.yml`
- Permissions: `contents: read`, `packages: write`, `id-token: write`
- Image signing: cosign v2.2.4 (keyless)
- SBOM: syft (SPDX-JSON format, uploaded as artifact)
- Outputs: Available via `workflow_call` for orchestrator consumption

## Consequences
### Positive
- Immutable image references via digest
- Reproducible integration tests
- Supply chain security (signing + SBOM)
- No PAT token management required

### Negative
- Integration must consume digests, not tags
- Slight increase in workflow complexity

## References
- Plan: `docs/plans/Digest.plan.md`
- Workflow: `.github/workflows/build-publish-backend.yml`

