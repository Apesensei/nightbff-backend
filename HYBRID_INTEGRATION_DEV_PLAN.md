# 📘 NightBFF ‑ Hybrid Frontend/Backend Integration Plan

> **Document ID:** NBF-INT-2025-06-Hybrid-v1.0  
> **Effective Date:** 2025-06-17  
> **Owners:** Backend Platform Team & iOS Frontend Team  
> **Status:** Approved ✅  (See RULE 4 [GitHub Workflow Procedures])

---

## 1. Executive Summary
NightBFF adopts a **Hybrid Integration Strategy** combining **(a) short-lived integration branches in each canonical repo** with **(b) a dedicated `
nightbff-integration` test repository**.

This maximises team autonomy (separate release cadences) while providing an isolated, disposable sandbox for cross-team QA, performance benchmarking and end-to-end (E2E) automation.

---

## 2. Guiding Principles
1. **Fail-Fast, Isolate Risk** – Integration happens in a staging sandbox, never on production trunks.  
2. **Single Source of Truth per Domain** – Backend & Frontend each keep authoritative `main` branches.  
3. **Short-Lived Integration Branches** – Must merge or be deleted < **5 days**.  
4. **Automated Verification** – Every push executes unit, contract & load tests (see §7).  
5. **Rollback-First Mindset** – Releases are only as safe as the ease of reversion (see §10).

### 2.a Architecture Context Map
> **System Boundaries & Interaction Patterns**  
> (Generated per *Context-First Analysis Rule*)

```mermaid
flowchart TD
    subgraph Mobile App (iOS)
        A[React-Native Layer] --> B[apiService.ts]
        B -->|REST+JWT| C[Backend API Gateway]
    end

    subgraph Backend Monolith (NestJS)
        C --> D[Auth MS]
        C --> E[Plan MS]
        C --> F[Chat MS]
        C --> G[Venue MS]
    end

    D -->|PostgreSQL| P[(Auth DB)]
    E -->|PostgreSQL| Q[(Plan DB)]
    F -->|Redis PubSub| R[(Redis Cluster)]
    G -->|PostgreSQL| S[(Venue DB)]
```
*Historical footprint:* Previous "supabase-only" POC was abandoned due to latency & vendor lock-in (Feb 2025 ADR-012).

---

## 3. Repository Topology
```
nightbff-backend   (this repo)              nightbff-ios-frontend
 ├─ main                                   ├─ main
 │                                          │
 │   feature/*                              │   feature/*
 │   hotfix/*                               │   hotfix/*
 │                                          │
 └─ integration/<YYMMDD>─<topic> ◄────┐     └─ integration/<YYMMDD>─<topic> ◄─┐
                                      │                                        │
                                      └────────► nightbff-integration ◄────────┘
                                            (Docker-compose sandbox)
```
*Each integration branch mirrors its counterpart across repos and is referenced by the dedicated test repo as a Git sub-module.*

> **🚨 CRITICAL TOPOLOGY INVARIANT**  
> **ONLY** the `nightbff-integration` repository may reference backend/frontend as submodules.  
> Backend and frontend repositories **MUST NEVER** contain submodule references to the integration repository.  
> This prevents cyclic submodule failures that break CI. See [ADR-018](docs/adr/ADR-018-submodule-topology-hygiene.md) for enforcement mechanisms.

---

## 4. Branching Workflow
| Phase | Backend Action | Frontend Action | CI Event |
|-------|----------------|-----------------|-----------|
| **0** Kick-off | Create `integration/YYMMDD-ios-sync` from latest `main`. | Same. | GitHub Action builds images & tags `:int-<sha>`. |
| **1** Dev Sync | Implement contracts & push daily. | Consume/adjust. | Unit & contract tests run on both repos. |
| **2** Integration Repo | PR to `nightbff-integration` updates sub-module SHAs + docker-compose versions. | — | E2E Cypress + k6 load tests. |
| **3** QA Green | All tests ✅ , QA sign-off. | — | Version bump ↗ `vX.Y.Z-rc`. |
| **4** Merge | Fast-forward merge → canonical `main` on both repos. | Same. | Release workflow publishes Docker images + TestFlight build. |
| **5** Cleanup | Delete integration branches in ≤24 h. | Same. | Auto-trigger in GitHub Action. |
| **Defect Triage Order** | colspan=4 | **Priority Sorting (Impact Prioritisation Heuristic):** 1) Largest change-set, 2) Connected services ×2, 3) Staleness |

#### 4.a RACI Matrix
| Activity | Backend | Frontend | DevOps | QA |
|----------|---------|----------|--------|----|
| Create integration branch | R/A | R | C | – |
| Update sub-modules in `nightbff-integration` | R | C | A | – |
| CI failures triage | R | R | A | C |
| Performance benchmarks | C | – | R | A |
| Merge to `main` | A | A | C | R |
| Cleanup branches | R | R | A | – |

---

## 5. Dedicated Integration Repository (`nightbff-integration`)
* **Purpose:** Provide hermetic docker-compose stack (Postgres, Redis, Backend API, Mobile emulator containers) for black-box tests.
* **Structure:**
  * `docker-compose.yaml` – references backend & frontend images via **`int-<sha>`** tags.
  * `tests/` – Cypress E2E, Postman integration suites, k6 load scripts.
  * `.github/workflows/` – CI matrix (linux/arm64) executing §7 tests.
* **Lifecycle:** New branch per integration cycle, auto-deleted after merge.

---

## 6. Versioning & Tagging
* **Semantic Versioning** (`MAJOR.MINOR.PATCH`).
* Integration images tagged `int-<branch-sha>`; release candidates `vX.Y.Z-rcN`; production `vX.Y.Z`.
* Git tags signed (`-s`) and pushed from CI pipeline only.

---

## 7. Continuous Integration Pipeline (per repo)
1. **Static Analysis** – ESLint / SwiftLint, Prettier, SonarQube.
2. **Unit Tests** – Jest (backend), XCTest (iOS) with ≥90 % coverage gate.
3. **Contract Tests** – Pact flows verifying request/response schemas.
4. **Build & Package** – Multi-arch Docker buildx (backend) / Xcode archive (iOS).
5. **Publish to GHCR** – Image `nightbff/backend:int-<sha>`; artifact upload.
6. **Notify Integration Repo** – Dispatch event triggers integration CI run.
7. **Performance Benchmarks** – k6 scripts ensure **p95 < 250 ms**, error-rate < **0.1 %**, throughput ≥ **200 RPS**.

---

## 8. Environment Configuration
| Environment | Base URL | Auth Mode | Notes |
|-------------|----------|-----------|-------|
| **Local Dev** | `http://localhost:3000/api` | `local` | `.env.development` |
| **Integration** | `http://backend:int:3000/api` (Docker net alias) | `local` | `.env.integration` |
| **Staging** | `https://staging.api.nightbff.com` | `supabase` | Secrets from GH OIDC → AWS KMS |
| **Prod** | `https://api.nightbff.com` | `supabase` | Blue/Green deploy via ECS |

Frontend `src/utils/apiService.ts` consumes `REACT_NATIVE_CONFIG.API_BASE_URL` provided by Fastlane lane `set-env`.

**Env-Var Contract Template:** See `/app/.env.example` and `/nightbff-integration/.env.integration.example` – *both files are single source of truth; any new variable requires a PR to update templates and CI secret injection.*

*Port-Collision Note:* Default backend port `3000`. Override via `PORT` env to avoid **EADDRINUSE** when multiple local stacks run.

---

## 9. Code Quality & Review Gates
* **2 approvals** required (`CODEOWNERS` enforced).  
* **Status checks:** CI green, coverage ≥90 %, Snyk, Dependabot PRs auto-merged after pass.  
* **Architecture Decision Records (ADR)** committed for changes diverging >40 % from patterns (*Pattern Enforcement Gate – User Rule 6*).

---

## 10. Release, Rollback & Hotfix
1. **Release Candidate** built from `main` SHA, deployed to staging.
2. **Smoke, load & exploratory tests** pass ⇒ tag `vX.Y.Z` & promote.
3. **Rollback**: `deploy rollback --env=prod --to-tag vX.Y.(Z-1)` (one-command).  
4. Hotfix branches off `main` ⇒ pull request ⇒ cherry-pick into ongoing integration branch if required.
5. **Database Rollback:** Use `yarn db:migrate:down --to <prev_version>` followed by `deploy rollback` if schema change is implicated.  
6. **Feature-flag Kill Switch:** All new contracts guarded via LaunchDarkly flag `integration_<feature>` to disable instantly.

---

## 11. Monitoring & Observability
* **Backend:** Prometheus metrics (`/api/performance/metrics`), Loki logs, Sentry errors.  
* **Mobile:** Firebase Crashlytics, Sentry React-Native.  
* **Synthetic E2E:** Checkly probes hitting `/health` & critical flows.

---

## 12. Security & Secrets Management
* Secrets injected via **GitHub OIDC → AWS Secrets Manager**.  
* No `.env` secrets committed; `.env.example` only.  
* SBOM generated with Syft; scanned via Grype.

---

## 13. Risk Register & Mitigations
| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Integration branch drift >5 days | Medium | Merge Conflicts | Daily rebase automation via GitHub Action. |
| Test repo build flakiness | Low | Delay | Dedicated runner cache + nightly reliability jobs. |
| Secrets leak in mobile logs | Low | High | Interceptors scrub tokens; CI static analysis. |
| Silent JWT expiry → infinite 401 loop | Medium | High | Prometheus alert on 401 surge; frontend shows re-login modal; backend returns `WWW-Authenticate` header. |

---

## 14. Glossary
* **Integration Branch** – Short-lived branch in canonical repo for cross-team work.  
* **Dedicated Test Repo** – Stand-alone repo spinning up full stack for QA automation.

---

## 15. References
* RULE 2 [DEV Workflow Guidelines].md  
* RULE 4 [GitHub Workflow Procedures].md  
* [Graphite Guide – Syncing Branches](https://graphite.dev/guides/how-to-sync-git-branch-with-main)  
* GeeksforGeeks – *How to Connect Front-End and Back-End*  
* Medium – *Streamlining Backend-Frontend Integration*  

---

## 16. Change-log
| Version | Date | Author | Notes |
|---------|------|--------|-------|
| 1.0 | 2025-06-17 | Platform Team | Initial draft |
| 1.1 | 2025-06-17 | Platform Team | Added context map, RACI, thresholds, rule-ref fix |

---

> _"Integrate early, integrate often, integrate safely."_ – NightBFF Engineering Doctrine 