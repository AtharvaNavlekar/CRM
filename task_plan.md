# DialPulse CRM Recovery Plan

## Goal

Bring the existing Steps 1–16 implementation into one runnable, testable, and secure architecture before starting Step 17.

## Current Phase

Phase 2 — frontend/API contract repair.

## Non-negotiable guardrails

- Do not begin Step 17 or add product features during this recovery.
- PostgreSQL is the only durable business-data store; Redis is shared transient infrastructure; workers remain a separate process.
- Do not weaken authentication, tenant isolation, authorization, compliance, auditing, or CORS to make the UI work.
- Every phase ends with an automated check and a real browser/API check where applicable.

## Execution order

### Phase 1 — Establish a reproducible baseline

- Commit, stash, or explicitly preserve the current uncommitted `server.ts` login error-handling changes and untracked `test-pg.js` before changing unrelated code.
- Document exact local prerequisites without committing `.env`: Node version, PostgreSQL URL, Redis URL, JWT secret, ports, migration command, seed/bootstrap command.
- Create isolated development and test database names; never point tests at a shared or production database.
- Record baseline outcomes for `npm run lint`, `npm run build`, `npm test`, `npm run test:security`, API startup, worker startup, and browser routes.

**Exit criteria:** a new developer can provision dependencies and reproduce every failure from documented commands.

**Current findings:** Node `v25.2.1`; `.env` has only `DATABASE_URL`; no `TEST_DATABASE_URL`, `REDIS_URL`, or `JWT_SECRET` is configured. Existing API and Vite processes are listening on ports 3000 and 5173. The working tree contains user changes to `server.ts` and untracked `test-pg.js`; they must not be overwritten.

### Phase 2 — Repair the compile and frontend/API contract

- Resolve the TypeScript errors in `SettingsView.tsx`: either restore secure, supported settings APIs or remove the obsolete UI controls. Do not leave UI actions that call `resetData`, backups, or other deleted endpoints.
- Define typed request/response contracts for settings, reports, jobs, auth, leads, calls, messages, tickets, and compliance.
- Replace `any`/legacy compatibility calls at the boundary before changing business behavior.
- Make `npm run lint` mandatory in CI and do not accept a Vite-only build as proof of correctness.

**Exit criteria:** `npm run lint` passes; every visible UI action has a real supported API contract or is intentionally unavailable.

**Progress:** Removed the unsafe JSON-era "Reset Sample Data" UI control, which targeted a deleted API and caused the TypeScript failure. `npm run lint` now passes. The remaining settings mutations still return `Not implemented in v2`; they will be redesigned after tenant-scoped settings storage is established in Phase 4.

### Phase 3 — Make runtime architecture explicit

- Keep development as two controlled processes: Vite UI on `5173`, Express API on `3000`; retain the Vite `/api` proxy.
- Decide and implement one production model: recommended is Express serving `dist/` after API routes, with an SPA fallback for non-`/api` routes.
- Add a static asset path, `index.html` fallback, and correct API-first route ordering; `/api/*` must never return the SPA HTML.
- Add scripts and README instructions for `dev`, API-only, UI-only, worker, production start, migrations, and bootstrap.
- Verify `GET /` is not expected on API port in development, but does work after `npm start` in production.

**Exit criteria:** dev UI/API/worker responsibilities are clear; production `/`, deep links, refreshes, and API routes work.

### Phase 4 — Finish the PostgreSQL migration and remove false sources of truth

- Audit each remaining `server/db.ts`, legacy type, seed, and compatibility reference.
- Remove unused JSON-era concepts; retain only pure utility code that is renamed and covered by tests.
- Make all repository methods tenant-scoped by default; do not expose `findAll()` access paths without an explicit platform-only use case.
- Replace frontend mock seed state with API-backed feature state, beginning with leads and dashboard data; mock data belongs only in Storybook/demo/test fixtures.
- Correct report generation (`await calculateReports(tenantId)`) and scope it to the caller’s tenant.
- Provide an explicit local development seed command that populates PostgreSQL only; production uses bootstrap/admin provisioning, never demo users.

**Exit criteria:** no production endpoint reads JSON, in-memory mock data, or unscoped repository results; the UI visibly renders PostgreSQL data.

### Phase 5 — Restore the canonical security model

- Remove every `tenant-apex` fallback from request authorization and compliance decisions. Missing tenant context must deny access except for explicitly defined platform metadata operations.
- Define a single policy middleware/service entry point and migrate direct role comparisons into policy capabilities.
- Complete impersonation as a database-backed session: create, approve/reason, expiry, actor/acting-as/target fields, audit event, tenant context, and revocation/end flow. Never merely mint a replacement identity token.
- Ensure platform staff cannot list or modify tenant raw data without a valid active impersonation session.
- Restrict dynamic permissions: keep system/platform capabilities immutable and tightly protect tenant-configurable permissions.

**Exit criteria:** tenant-isolation, policy, platform-staff, and impersonation invariant tests pass for every protected resource family.

### Phase 6 — Make sessions, compliance, Redis, and jobs operationally safe

- Test login against an explicit PostgreSQL development account created by the seed/bootstrap flow; do not rely on hard-coded `password123` test identities.
- Verify access-token validation, refresh-token rotation/replay detection, cookie configuration, logout revocation, and restart behavior.
- Change compliance activity-count failures from fail-open to a safe, observable behavior: deny/retry for outbound contact when the required data store is unavailable.
- Decide Redis availability policy. For production, readiness should fail without Redis if rate limiting/jobs depend on it. For local development, disabled jobs must report `503`/unavailable rather than creating permanently stalled work.
- Start API and worker independently; test export/import/bulk-update lifecycle from queue through durable job status.

**Exit criteria:** authenticated browser flow works; compliance does not permit outreach on dependency failure; jobs either complete or fail visibly and safely.

### Phase 7 — Replace stale tests and documentation

- Replace the port-dependent, mutable legacy test runner with isolated integration tests that boot the app and own their PostgreSQL/Redis fixtures.
- Add contract and invariant tests: tenant A never sees tenant B; client-supplied tenant fields never alter scope; missing context denies; impersonation retains the real actor; unrelated concurrent writes persist; SPA fallback excludes APIs.
- Add test coverage for production static serving, login/refresh/logout, settings contracts, reports, queue unavailable behavior, and compliance dependency failure.
- Update README, BRAIN.md, AUTH_AND_COMPLIANCE.md, architecture diagrams, and operational runbooks only after tests pass. Remove obsolete JSON/security claims.
- Audit tracked `credentials.md` and all history-facing assets for secrets or realistic customer data; remove/rotate safely if anything sensitive is found.

**Exit criteria:** full test suite is green against isolated services; documentation matches deployed behavior; no unsubstantiated security claims remain.

### Phase 8 — Release readiness checkpoint

- Run lint, unit tests, integration/security tests, production build, production server, browser smoke tests, and worker smoke tests in a clean environment.
- Verify health/readiness endpoints, logs, metrics access controls, backup/restore drill, and rollback path.
- Review migration, test results, security invariants, and environment configuration before accepting the recovery work.
- Commit in focused phases; do not push secrets, runtime data, database dumps, tokens, or customer records.

**Exit criteria:** all prior phases complete, evidence recorded, and Step 17 can begin safely.

## Priority rule

Fix in this order: compilation and API contract → runtime/production serving → PostgreSQL/UI truth → authorization/tenant/impersonation → sessions/compliance/jobs → tests/docs → release readiness.
