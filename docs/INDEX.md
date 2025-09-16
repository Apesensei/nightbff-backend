# NightBFF Integration Documentation Index

## Overview
This document provides a centralized index of all documentation in the NightBFF Integration repository.

## Core Documentation

### Development & Setup
- [Local Development Setup](./LOCAL_DEVELOPMENT_SETUP.md) - Complete local development environment setup
- [Team Protocol](./TEAM_PROTOCOL.md) - Team collaboration guidelines and protocols

### CI/CD & Infrastructure
- [Branch Protection Setup](./BRANCH_PROTECTION_SETUP.md) - GitHub branch protection configuration
- [Renovate Setup](./RENOVATE_SETUP.md) - Automated dependency update configuration
- [Security Audit Implementation](./SECURITY_AUDIT_IMPLEMENTATION.md) - **NEW** - Security audit CI integration

### Technical Debt & Fixes
- [TDL-001 Fix Summary](./TDL-001-FIX-SUMMARY.md) - Technical debt list item 1
- [TDL-003 Fix Summary](./TDL-003-FIX-SUMMARY.md) - Technical debt list item 3
- [TDL-004 Fix Summary](./TDL-004-FIX-SUMMARY.md) - Technical debt list item 4
- [TDL-005 Fix Summary](./TDL-005-FIX-SUMMARY.md) - Technical debt list item 5
- [TDL-006 Security Audit Implementation](./TDL-006-SECURITY-AUDIT-IMPLEMENTATION.md) - **NEW** - Security audit implementation summary

## Backend Documentation

### Core Backend
- [Backend README](../backend/app/README.md) - Main backend documentation
- [Developer Handoff Guide](../backend/app/DEVELOPER_HANDOFF_GUIDE.md) - Developer onboarding guide
- [Frontend Integration Guide](../backend/app/FRONTEND_INTEGRATION_GUIDE.md) - Frontend integration instructions

### Security & Environment
- [Secure Environment](../backend/docs/SECURE_ENV.md) - Environment security guidelines
- [Environment Configuration](../backend/config/env/README.md) - Environment setup documentation

### Database & Migrations
- [Migration Guidelines](../backend/src/database/MIGRATION_GUIDELINES.md) - Database migration procedures
- [Migration Governance](../backend/src/database/MIGRATION_GOVERNANCE.md) - Migration management policies

### Microservices
- [Auth Service](../backend/app/src/microservices/auth/README.md) - Authentication service documentation
- [Chat Service](../backend/app/src/microservices/chat/README.md) - Chat functionality documentation
- [Event Service](../backend/app/src/microservices/event/README.md) - Event management documentation
- [Interest Service](../backend/app/src/microservices/interest/README.md) - Interest matching documentation
- [Notification Service](../backend/app/src/microservices/notification/README.md) - Notification system documentation
- [Premium Service](../backend/app/src/microservices/premium/README.md) - Premium features documentation
- [User Service](../backend/app/src/microservices/user/README.md) - User management documentation
- [Venue Service](../backend/app/src/microservices/venue/README.md) - Venue management documentation

## Frontend Documentation

### Core Frontend
- [Frontend README](../nightbff-frontend/README.md) - Main frontend documentation
- [Handoff Summary](../nightbff-frontend/docs/HANDOFF_SUMMARY.md) - Frontend handoff documentation

## Architecture Decision Records (ADRs)

### Backend ADRs
- [ADR-013: Canonical Seeder](../backend/docs/adr/ADR-013-canonical-seeder.md)
- [ADR-016: Environment Contract](../backend/docs/adr/ADR-016-env-contract.md)
- [ADR-018: Submodule Topology Hygiene](../backend/docs/adr/ADR-018-submodule-topology-hygiene.md)

## Project Management

### PRD Documentation
- [Project Overview](../backend/PRD DOC/project-overview.md)
- [Requirements](../backend/PRD DOC/requirements.md)
- [Technical Stack](../backend/PRD DOC/tech-stack.md)
- [User Flow](../backend/PRD DOC/user-flow.md)
- [Implementation Plan](../backend/PRD DOC/implementation.md)
- [Project Structure](../backend/PRD DOC/project-structure.md)
- [Features](../backend/PRD DOC/feautures.md)

### Status & Reports
- [Blueprint Phase Completion](../BLUEPRINT_XX_PHASE_COMPLETION.md)
- [Blueprint Final Report](../BLUEPRINT_XX_FINAL_REPORT.md)
- [CI Pipeline Status Checker](../backend/EVERGREEN_CI_PIPELINE_STATUS_CHECKER.md)
- [Hybrid Integration Dev Plan](../backend/HYBRID_INTEGRATION_DEV_PLAN.md)

## Security Documentation

### Security Implementation
- [Security Audit Implementation](./SECURITY_AUDIT_IMPLEMENTATION.md) - **NEW** - Comprehensive security audit documentation
- [TDL-006 Security Audit](./TDL-006-SECURITY-AUDIT-IMPLEMENTATION.md) - **NEW** - Security audit implementation summary

### Security Status
- **Current Security Level**: 🟢 PRODUCTION READY
- **Vulnerability Status**: 5 low-severity vulnerabilities (acceptable)
- **Security Coverage**: Real-time CI scanning active
- **Next Steps**: HTTPS implementation, additional hardening

## Quick Reference

### Common Commands
```bash
# Local development
npm run dev:db          # Start local database
npm run start:dev       # Start backend server

# Integration testing
docker compose up -d    # Start integration stack
npm run test           # Run tests

# Security audit
npm audit              # Check vulnerabilities
npm audit fix          # Fix vulnerabilities
```

### Health Checks
- Integration backend: `GET http://localhost:3000/health`
- Local backend: `GET http://localhost:3001/health`

### Important Files
- CI Configuration: `.github/workflows/integration-ci.yml`
- Security Audit: `docs/SECURITY_AUDIT_IMPLEMENTATION.md`
- Environment Setup: `backend/config/env/`
- Database Migrations: `backend/src/database/`

## Documentation Standards

### Update Guidelines
1. **New Features**: Document in appropriate service README
2. **Security Changes**: Update security documentation
3. **CI Changes**: Update CI documentation
4. **Architecture Changes**: Create ADR

### Documentation Structure
- **README files**: Service-specific documentation
- **docs/**: Centralized documentation
- **TDL-XXX**: Technical debt implementation summaries
- **ADR-XXX**: Architecture decision records

---

**Last Updated**: September 4, 2025  
**Maintained By**: Development Team  
**Review Cycle**: Monthly