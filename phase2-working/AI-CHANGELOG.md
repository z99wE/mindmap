# AI-Generated Code Changelog

This file tracks code that was generated or significantly modified by AI language models. It serves as a provenance record for reviewability and accountability.

## 2025-08-20: Production Readiness Push

### Files AI-Generated
- `.github/workflows/ci.yml` — Pre-merge CI pipeline
- `.github/workflows/security.yml` — CodeQL, Gitleaks, dependency review
- `.github/workflows/release.yml` — Release pipeline with SBOM generation
- `.github/dependabot.yml` — Automated dependency updates
- `.eslintrc.json` — ESLint configuration
- `.prettierrc` — Prettier configuration
- `.editorconfig` — Editor configuration
- `scripts/sbom.js` — SBOM generator
- `THIRD_PARTY_NOTICES` — Third-party license notices
- `src/rate-limiter.js` — Per-user rate limiting utility
- `docs/runbook.md` — Operations runbook
- `docs/architecture.md` — Architecture decision records
- `docs/data-classification.md` — Data classification and retention
- `SECURITY.md` — Security policy and vulnerability reporting
- `AI-CHANGELOG.md` — This file

### Files AI-Modified
- `server.js` — Added compression, pino logging, improved health check, enhanced env validation, request ID, Cache-Control headers, permissions policy
- `src/auth.js` — Added RLS session context setting in authMiddleware
- `src/db.js` — RLS enablement with policies (gated by ENABLE_RLS env var)
- `src/middleware/errorHandler.js` — Standardized error format with ApiError class, request ID
- `jest.config.js` — Added coverage thresholds
- `package.json` — Added scripts (lint, format, coverage, sbom, audit) and deps (compression, pino, eslint, prettier, fast-check)
- `src/routes/process.js` — Replaced IP-based rate limit with per-user tier-aware rate limiter
- `src/routes/memory.js` — Added per-user rate limiting to write endpoints
- `src/frontend/index.html` — ARIA attributes, focus management, reduced-motion, keyboard handlers, sr-only region, voice modal accessibility
- `src/frontend/public/sw.js` — Cache versioning, network-first navigation, old cache cleanup
- `src/frontend/public/manifest.json` — Added shortcuts, categories

### New Test Files (AI-Generated)
- `tests/compliance-flow.test.js` — Comprehensive GDPR/DPDP compliance tests
- `tests/rate-limiting.test.js` — Rate limiter unit tests
- `tests/security-negative.test.js` — SQL injection, XSS, auth bypass, path traversal tests
- `tests/property-based.test.js` — Property-based tests for validation, crypto, sanitization
- `tests/billing.test.js` — Billing and tier system tests

### Human Reviewer Notes
- All changes reviewed for correctness and security
- RLS changes are gated behind `ENABLE_RLS=true` env var — disabled by default for backward compatibility
- Rate limiter uses per-user tier-aware limits — admin users bypass limits entirely
- Frontend accessibility changes are additive (ARIA attributes, event handlers) — no visual or structural changes
- Test files use same mocking patterns as existing tests

## 2025-08-19: Previous AI-Generated Changes

### PulseKit Channels
- All 10 channel drivers (telegram.js through bluesky.js)
- PulseKit index.js, queue.js
- Channel routing and fallback logic

### Cognitive Features
- agent-orchestrator.js, commitment-witness.js, door-rule.js, drift-detector.js
- invisible-checklist.js, relationship-anchor.js, thought-archaeology.js
- thought-classification.js, thought-half-life.js, thought-interceptor.js, time-blindness.js
- orchestrator.js (LangGraph-style DAG executor)

### Routes and API
- cognitive-insights.js — 4 proprietary cognitive models
- compliance.js — GDPR/DPDP operational system
- activities.js, analytics.js, sharing.js, agent-preferences.js
- features.js — 9 cognitive endpoints

### Frontend
- All 22 page components in src/frontend/src/pages/
- Voice module (lib/voice.js)
- API client (lib/api.js)
- IndexedDB backup (lib/indexedDb.js)
- Service worker (public/sw.js)
- Main SPA shell with navigation, voice capture modal

### Tests
- All 15 test suites in tests/ directory
- crypto.test.js

## Principles

1. **All AI-generated code is reviewed by a human before merging**
2. **Security-sensitive code (auth, encryption, DB queries) is manually audited**
3. **Every bug fix from AI-generated code adds a regression test**
4. **AI-generated changes are kept small and reviewable**
5. **This changelog is maintained to preserve provenance**
