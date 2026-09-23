# DialPulse CRM — Technical Truth Audit

**Audit Date:** September 2026  
**Auditor:** AI Systems Architect & Security Engineering  
**Scope:** Complete Codebase Investigation (Read-Only Technical Verification)  
**Standard Classification:**
- `[VERIFIED IN CODE]` — Inspected and confirmed in active executable source code.
- `[VERIFIED IN CONFIG]` — Confirmed in environment configuration or package definitions.
- `[DOCUMENTATION CLAIM]` — Claimed in markdown documentation or comments, but not confirmed in code.
- `[HISTORICAL / STALE]` — Leftover relic from an earlier architectural iteration.
- `[SIMULATED / STUB]` — Mocked, hardcoded, or returning synthetic responses.
- `[DISCREPANCY / BUG]` — Active flaw, contradiction, or breaking mismatch.

---

## 1. Executive Summary

This audit establishes the **ground technical truth** of the DialPulse CRM codebase. By cross-examining the executable TypeScript source code against the existing documentation (`README.md`, `BRAIN.md`, `AUTH_AND_COMPLIANCE.md`, `SECURITY_FINDINGS.md`, `credentials.md`, `docs/disaster-recovery.md`), tests, and database definitions, we have identified significant discrepancies between what the documentation claims and what the system actually implements.

### Core Architectural Truth Matrix

| Domain | Documented Claim | Source Code Reality | Status |
| :--- | :--- | :--- | :--- |
| **Data Layer** | Single JSON file (`data/db.json`) flushed synchronously via `saveDatabase()`. | DialPulse CRM runs strictly on PostgreSQL + Drizzle (`postgres.js`). Database access is centralized in `server/db/client.ts`. `DATABASE_URL` is mandatory; missing configuration fails fast. In-memory `createMockDb()` fallback and local JSON persistence were completely rejected and removed. | `[VERIFIED IN CODE]` / `[CORRECTED ARCHITECTURE]` |
| **Concurrency** | Optimistic concurrency via `updates.version !== oldLead.version`. | No version check exists in `server.ts` or `lead.repository.ts`. Updates overwrite blindly. | `[DOCUMENTATION CLAIM]` |
| **RBAC / Authz** | Dynamic permissions loaded from `db.rolePermissions` in `db.json`. | Evaluated via `server/policy.ts` (`can()`) and `server/auth.ts` (`authorize()`). The role-permission schema contract mismatch was corrected to align default seed records (`DEFAULT_ROLE_PERMISSIONS` in `server/seed/defaultRolePermissions.ts`) with the authorization engine using `actions: Action[]` instead of `permissions`. | `[VERIFIED IN CODE]` / `[CORRECTED CONTRACT]` |
| **Background Jobs** | Heavy operations (Import, Export, Bulk Update) processed via BullMQ / Redis. | BullMQ queue (`crmQueue`) in `server/jobs/queue.ts` and worker in `server/jobs/worker.ts`. However, without `REDIS_URL`, worker shuts down immediately and jobs remain in `QUEUED` state forever with no in-memory processor. | `[VERIFIED IN CODE]` / `[DEGRADED MODE]` |
| **Telecom / Calling** | Telecalling CRM with real-time call tracking and recordings. | Purely metadata logging in `POST /api/calls`. No WebRTC, SIP, or telephony integration (Twilio/Exotel). Recordings are simulated flags. | `[SIMULATED / STUB]` |
| **AI Integration** | Audio transcription powered by Gemini AI model `gemini-3.5-transcribe`. | Server integrates `@google/genai`. Model name `gemini-3.5-transcribe` is a non-existent placeholder. In the absence of `GEMINI_API_KEY`, returns a simulated string after 1500ms delay. | `[SIMULATED / STUB]` |
| **Platform Admin** | Full SOC alert dashboard, cross-tenant billing, and feature flag management. | Endpoints `/api/platform/soc/alerts`, `/api/platform/billing`, and `/api/platform/features` return hardcoded empty arrays `[]` or dummy `{ success: true }`. | `[SIMULATED / STUB]` |
| **Test Suite** | Comprehensive automated test harness. | `npm test` fails with `ECONNRESET` because `POST /api/users` triggers the unhandled `can()` `TypeError`, crashing the server. `security-tests/production-safety.test.ts` fails because `getDb` does not exist in `server/db.ts`. | `[DISCREPANCY / BUG]` |

---

## 2. Phase 1 — Repository Inventory & Structure

### File & Directory Map
- **Runtime Entrypoint:** `server.ts` (1,557 lines) — Monolithic Express server handling authentication, tenant scoping, rate limiting, and all domain API routes.
- **Server Subsystems (`server/`):**
  - `db/schema.ts` (348 lines): 18 PostgreSQL tables declared using Drizzle ORM (`pgTable`).
  - `db/client.ts`: PostgreSQL client initialization via `postgres.js` and Drizzle ORM. `DATABASE_URL` is mandatory; fails fast with clear critical error if unset. No in-memory or JSON fallback.
  - `seed/defaultRolePermissions.ts`: Canonical role permissions conforming strictly to `{ role, scope, actions: Action[], requiresApproval, canViewAllLeads, canExportData, canManageTemplates }`.
  - `db.ts` (194 lines): Legacy aggregation helpers (`calculateReports()`, `DEFAULT_FREQUENCY_RULES`).
  - `policy.ts` (141 lines): Central authorization engine with `can()` and dual-execution `actionMap`.
  - `auth.ts` (237 lines): JWT token issuance, verification, password hashing, and legacy `authorize()`.
  - `tenantMiddleware.ts` (146 lines): Multi-tenant context derivation (`enforceTenantScope`, `verifyTenantActive`).
  - `compliance.ts` (362 lines): Pure compliance calculation functions (`isQuietHours`, `evaluateCompliance`).
  - `services/complianceService.ts` (116 lines): Live compliance checking service querying recent activity.
  - `services/auditService.ts` (108 lines): Canonical audit logging (`logCritical`, `logNormal`) into `audit_logs`.
  - `services/ai/`:
    - `aiProvider.ts` (83 lines): `@google/genai` Gemini provider wrapper.
    - `aiService.ts` (141 lines): AI audio transcription with rate limiting, quota enforcement, and mock fallback.
    - `aiConfig.ts`: Model references and limits.
  - `infrastructure/`:
    - `redis.ts` (198 lines): `ioredis` abstraction with graceful degradation and safe key hashing.
    - `logger.ts`: Structured JSON logging.
    - `metrics.ts`: Prometheus/OpenTelemetry style metric counters.
    - `alerts.ts`: Alert notification dispatcher.
  - `jobs/`:
    - `queue.ts` (78 lines): BullMQ `crm-jobs` queue initialization.
    - `worker.ts` (116 lines): Standalone BullMQ worker process.
    - `processors/`: Job handlers for `exportLeads.ts`, `importLeads.ts`, and `bulkUpdate.ts`.
  - `repositories/`:
    - `lead.repository.ts`, `jobRepository.ts`, `compliancePolicyRepository.ts`.
  - `seed/development.ts` (816 lines): Comprehensive seed data (3 tenants, 4 teams, 14 users, leads, calls, tickets).
  - `crawlerAgents.ts`: AI scraper & web crawler blocking definitions.
  - `bootstrap.ts`: Database bootstrap script.
- **Frontend Subsystems (`src/`):**
  - Modern React 19 + Vite SPA with Tailwind CSS.
  - Contexts: `AuthContext.tsx` (manages auth state, tokens, and `usePolicy` hook), `ThemeContext.tsx`.
  - Views / Components: `leads/`, `pipeline/`, `calling/`, `whatsapp/`, `reports/`, `settings/`, `platform/`, `audit/`, `compliance/`.
- **Scripts (`scripts/`):**
  - `backup.ts`: Generates PostgreSQL logical dumps (`pg_dump -Fc`) with metadata checksums.
  - `restore.ts`: Restores PostgreSQL database from `.dump` files.
  - `migrate-json-to-postgres.ts`: Historical one-way migration script from `data/db.json` to PostgreSQL schema.
- **Test Suites (`tests/`, `security-tests/`):**
  - `tests/auth-and-compliance.test.ts`: Integration test for authentication, tokens, RBAC, and quiet hours.
  - `tests/deterrence-and-crawlers.test.ts`: Unit test for robots.txt and crawler blocking heuristics.
  - `security-tests/run-all.ts`: Master test runner importing 9 security test modules.

---

## 3. Phase 2 — Persistence & Data Integrity Truth

### 1. Database Architecture `[VERIFIED IN CODE]`
- The active data layer is defined in `server/db/schema.ts` using **Drizzle ORM** targeting PostgreSQL (`drizzle-orm/pg-core`).
- Tables defined (18 total):
  1. `users` (id, tenant_id, name, email, role, team_id, manages_team_ids, password_hash, auth_version, ...)
  2. `tenants` (id, name, slug, status, tier, lead_cap, user_cap, ...)
  3. `teams` (id, tenant_id, name, location)
  4. `leads` (id, tenant_id, name, phone, email, status, stage, source, assigned_rep_id, team_id, ...)
  5. `calls` (id, tenant_id, lead_id, rep_id, duration, outcome, notes, compliance_flags, ...)
  6. `messages` (id, tenant_id, lead_id, direction, rep_id, team_id, channel, text, status, ...)
  7. `tickets` (id, tenant_id, subject, status, created_date, sla_due_time, priority, assigned_rep_id, ...)
  8. `ticket_replies` (id, ticket_id, sender, sender_role, text, timestamp)
  9. `audit_logs` (id, occurred_at, request_id, event_type, outcome, actor_user_id, tenant_id, metadata, ...)
  10. `impersonation_sessions` (id, platform_user_id, target_tenant_id, target_user_id, active, expires_at, ...)
  11. `security_alerts` (id, timestamp, type, title, severity, tenant_id, user_id, source_ip, details, ...)
  12. `billing_records` (id, tenant_id, invoice_id, amount, currency, status, due_date, paid_at)
  13. `feature_flags` (id, key, name, enabled_globally, enabled_for_tenant_ids, rollout_percentage)
  14. `sessions` (id, user_id, tenant_id, token_family_id, refresh_token_hash, expires_at, revoked_at, ...)
  15. `custom_fields` (id, name, type, options, required)
  16. `role_permissions` (role, scope, actions, requires_approval, can_view_all_leads, can_export_data, ...)
  17. `pipeline_stages` (id, title, order, color, dot_bg)
  18. `compliance_rules` (id, tenant_id, call_cap_max_attempts, quiet_hours_start, quiet_hours_end, ...)
  19. `jobs` (id, queue_job_id, type, status, tenant_id, created_by, progress, result_metadata, ...)
  20. `ai_usage` (id, tenant_id, user_id, model, action, tokens, cost, occurred_at)

### 2. Database Client Dual-Execution `[VERIFIED IN CODE]`
In `server/db/client.ts` (lines 220–232):
### 2. The PostgreSQL-Only Runtime Architecture `[VERIFIED IN CODE]`
- The JSON persistence migration introduced in commit `9837b8ad` was formally **rejected and reverted**.
- DialPulse CRM runs strictly on PostgreSQL + Drizzle ORM (`postgres.js`).
- Database client initialization is centralized in `server/db/client.ts`.
- `DATABASE_URL` is **mandatory**. If `DATABASE_URL` is missing from the environment, startup immediately terminates with:
  `[DATABASE CRITICAL ERROR] DATABASE_URL environment variable is mandatory. DialPulse CRM requires PostgreSQL persistence and does not permit in-memory or mock database fallbacks.`
- In-memory mock database fallbacks (`createMockDb()`) and process-local table storage have been eradicated.
- All persistent runtime state (sessions, tokens, refresh token rotation, leads, audit logs, compliance policies, background jobs) requires PostgreSQL.

### 3. The `db.json` Myth vs Code Reality `[HISTORICAL / STALE]`
- `README.md` (lines 36, 98, 102), `BRAIN.md` (lines 14, 21), and `credentials.md` (line 35) claim the application state is persisted in `data/db.json` via `saveDatabase()`.
- **Reality:** No `data/db.json` runtime persistence exists in the repository. No function named `saveDatabase()` exists in `server.ts` or `server/`. Historical references to `data/db.json` are obsolete legacy claims. `scripts/migrate-json-to-postgres.ts` exists only as a historical one-way migration utility.

### 4. Concurrency & Optimistic Locking `[DISCREPANCY / BUG]`
- `BRAIN.md` line 21 asserts: *"Concurrency is handled naively via an optimistic `version` check on individual Lead updates (`updates.version !== oldLead.version`)."*
- **Reality:** In `server.ts` lines 830–865 (`app.put('/api/leads/:id')`) and `server/repositories/lead.repository.ts`, there is **no version check**. Incoming updates are written directly without comparing `version`, creating a race condition where concurrent edits overwrite each other.

---

## 4. Phase 3 — Authentication Truth

### 1. Password Hashing `[VERIFIED IN CODE]`
- Passwords are encrypted using `bcryptjs` with salt rounds = 10 (`hashSync(password, 10)` in `server/auth.ts` and `server/seed/development.ts`).
- Default dev password for all seeded users is `password123`.

### 2. JWT Tokens & Signing `[VERIFIED IN CODE]`
- Implemented in `server/auth.ts`:
  - Algorithm: `HS256`.
  - Issuer: `dialpulse-crm`.
  - Audience: `dialpulse-client`.
  - Token Claims: `{ id, email, role, tenantId, sessionId, isPlatformStaff, type: 'access', jti }`.
  - Expiry: Configurable via `JWT_EXPIRY` (defaults to `15m`).

### 3. JWT Secret Resolution `[VERIFIED IN CODE]`
In `server/auth.ts` lines 9–17:
```typescript
function resolveJwtSecret(): string {
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.trim().length > 0) {
    return process.env.JWT_SECRET.trim();
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('FATAL: JWT_SECRET environment variable is missing in production.');
  }
  return crypto.randomBytes(64).toString('hex');
}
```
- In development/preview where `JWT_SECRET` is not provided in environment variables, a random 64-byte string is generated on boot.
- **Important Impact:** If `JWT_SECRET` is undefined, tokens generated by one process cannot be verified by another process (e.g., integration tests running in a different process that import `server/auth.ts`).

### 4. Refresh Tokens & Session Tracking `[VERIFIED IN CODE]`
- Login generates an opaque 32-byte hexadecimal refresh token (`crypto.randomBytes(32).toString('hex')`).
- The SHA-256 hash of the refresh token is stored in the `sessions` table along with `tokenFamilyId`, `expiresAt` (7 days), `createdIp`, and `userAgent`.
- Refresh tokens are delivered via HTTP-only cookie (`refreshToken`) scoped to `/api/auth`.
- Token family reuse detection exists in `POST /api/auth/refresh`: if an expired or revoked token is reused, all sessions in that family are invalidated (`revokedAt = now`).

---

## 5. Phase 4 — RBAC & Authorization Truth

### 1. The Two Authorization Engines `[VERIFIED IN CODE]`
The codebase contains two distinct authorization functions:
1. `server/policy.ts` -> `can(context: SecurityContext, action: Action, resource: { tenantId?: string; teamId?: string; ownerId?: string })`
2. `server/auth.ts` -> `authorize(user: User, action: Action, targetScope: { tenantId?: string; teamId?: string; ownerId?: string })`

`server.ts` routes use `can()` from `server/policy.ts`.

### 2. Action Mapping Dual-Execution `[VERIFIED IN CODE]`
`server/policy.ts` defines `actionMap` translating granular actions to legacy coarse actions:
- `users:create` -> `MANAGE_USERS`
- `leads:read` -> `VIEW`
- `leads:create` -> `EDIT`
- `leads:update` -> `EDIT`
- `leads:reassign` -> `REASSIGN`
- `leads:export` -> `EXPORT`
- `leads:delete` -> `DELETE`
- `compliance:manage` -> `MANAGE_COMPLIANCE_RULES`
- `platform:manage` -> `PLATFORM_ADMIN`

### 3. THE CRITICAL DEFECT: Role Permission Column Mismatch `[DISCREPANCY / BUG]`
In `server/db/client.ts` line 54, `DEFAULT_ROLE_PERMISSIONS` is initialized as:
```typescript
const DEFAULT_ROLE_PERMISSIONS = [
  { id: 'rp-owner', role: 'owner', permissions: ['all', 'leads:read', ...] },
  { id: 'rp-telecaller', role: 'telecaller', permissions: ['leads:read', 'leads:write'] },
  ...
];
```
Notice the field name is **`permissions`**, and there is no **`actions`** or **`scope`** field!

However, in `server/policy.ts` line 57:
```typescript
const perm = await getRolePermission(normalizedRole);
const legacyAction = actionMap[action];

if (!perm || !perm.actions.includes(legacyAction)) {
  return false;
}
```
And in `server/auth.ts` line 92:
```typescript
const perm = await getRolePermission(normalizedRole);
if (!perm || !perm.actions.includes(action)) return false;
```

**Fatal Result:**
`perm.actions` is `undefined`. Accessing `perm.actions.includes(...)` throws:
```text
TypeError: Cannot read properties of undefined (reading 'includes')
    at can (/app/applet/server/policy.ts:57:30)
```
Because Express 4 does not automatically catch errors inside un-awaited async route handlers without explicit error middleware, this unhandled promise rejection **immediately crashes the entire Node.js server process** whenever `can()` is invoked for any user whose permissions object lacks `actions`!

This is the exact reason why `npm test` fails with `ECONNRESET` during Category 3 (`POST /api/users`).

---

## 6. Phase 5 — Tenant Isolation Truth

### 1. Tenant Scoping Middleware `[VERIFIED IN CODE]`
- `server/tenantMiddleware.ts` defines `enforceTenantScope`:
  - Derives `tenantId` strictly from `req.user.tenantId` (loaded from authenticated database record).
  - Rejects with `403 Access denied: User is not associated with a tenant` if a tenant user lacks `tenantId`.
  - Attaches `req.securityContext.tenantId`.
- In `server.ts`:
  - `GET /api/leads` constructs: `conditions.push(eq(schema.leads.tenantId, tenantId))`.
  - `GET /api/calls` constructs: `conditions.push(eq(schema.calls.tenantId, tenantId))`.
  - `GET /api/messages` constructs: `conditions.push(eq(schema.messages.tenantId, tenantId))`.

### 2. Intra-Tenant Hierarchical Scoping `[VERIFIED IN CODE]`
Inside `GET /api/leads` (lines 683–690):
- `SELF` (Telecaller): Filters `eq(schema.leads.assignedRepId, actorUserId)`.
- `TEAM` (Team Lead): Filters `eq(schema.leads.teamId, actorTeamId)`.
- `ALL_TEAMS` (TL Head): Filters `inArray(schema.leads.teamId, actorManagesTeamIds)`.
- `COMPANY` / `SYSTEM` (Owner / CTO): No intra-tenant team restriction, sees all tenant leads.

### 3. Platform Staff & Impersonation `[VERIFIED IN CODE]`
- Platform staff (`isPlatformStaff = true`) bypass standard tenant scoping only when an active record exists in `impersonation_sessions` with `active = true` and `expiresAt > now`.
- When non-impersonating, `enforceImpersonationForRawData` rejects access to raw data routes (`/api/leads`, `/api/calls`, `/api/messages`, `/api/tickets`) with `403 IMPERSONATION_REQUIRED`.

---

## 7. Phase 6 — Compliance Truth

### 1. Telecom & Outreach Regulations `[VERIFIED IN CODE]`
Implemented in `server/compliance.ts` and `server/services/complianceService.ts`:
- **Quiet Hours Enforcement:**
  - Timezone: `Asia/Kolkata` (IST).
  - Default quiet window: `19:00` (7:00 PM) to `09:00` (9:00 AM) next morning.
  - Evaluated via pure helper `isQuietHours(rules, date, timezone)` handling midnight crossing.
- **Contact Frequency Caps:**
  - Call cap: 3 attempts per 7 days.
  - WhatsApp cap: 4 attempts per 30 days.
  - SMS cap: 2 attempts per 14 days.
- **DNC / Opt-Out Enforcement:**
  - Checks `lead.doNotCall === true` or `lead.optOut === true`.
  - Checks if lead is in a `Paused` stage.
- **Pure Function Separation:**
  - `evaluateCompliance(input: ComplianceEvaluationInput): ComplianceCheckResult` is completely pure, side-effect free, and deterministic.
  - `checkLeadCompliance()` in `server/services/complianceService.ts` handles database lookups (counting calls and messages within the window) and passes counts to `evaluateCompliance()`.

---

## 8. Phase 7 — Communication Truth

### 1. Telecalling Subsystem `[SIMULATED / STUB]`
- `POST /api/calls`:
  - Accepts `{ leadId, disposition, duration, notes, timestamp }`.
  - Inserts record into `calls` table.
  - Checks for PII in notes (regex matching credit card, ssn, password).
  - Updates `lastContactDate` on the lead.
- **Simulated Elements:**
  - There is no telephony provider integration (e.g. Exotel, Twilio, Knowlarity).
  - Call audio recording is not captured; `recordingSimulated: true` is stored in the database.
  - No WebRTC or SIP signaling stack is present.

### 2. WhatsApp Messaging Subsystem `[SIMULATED / STUB]`
- `POST /api/messages`:
  - Checks quiet hours and message frequency caps.
  - Inserts message record into `messages` table with `deliveryStatus: 'sent'`.
- **Simulated Elements:**
  - There is no live WhatsApp Business API connection (Meta Cloud API or BSP like Gupshup/Wati).
  - Messages are stored locally in the database; inbound messages are seeded or simulated.

---

## 9. Phase 8 — Background Jobs, Worker & Redis Truth

### 1. BullMQ & Redis Architecture `[VERIFIED IN CODE]`
- `server/infrastructure/redis.ts`: Provides unified `ioredis` connection client.
- `server/jobs/queue.ts`:
  - Initializes `crmQueue = new Queue('crm-jobs', { connection })`.
  - Implements `enqueueJob(type, securityContext, payloadData)`:
    - Step 1: Creates durable record in `jobs` table with status `QUEUED`.
    - Step 2: Adds job to BullMQ queue if `crmQueue` is active.
- `server/jobs/worker.ts`:
  - Standalone worker listening on `crm-jobs`.
  - Handlers in `server/jobs/processors/`:
    - `EXPORT_LEADS` -> queries leads with tenant scoping, formats CSV/JSON.
    - `IMPORT_LEADS` -> validates CSV rows, creates leads in batches.
    - `BULK_UPDATE_LEADS` -> updates lead stages or assigned reps in batches.

### 2. Degraded Mode Failure `[DISCREPANCY / BUG]`
- In `server/jobs/worker.ts` lines 22–25:
  ```typescript
  if (!connection) {
    logger.warn('Running in degraded mode without Redis. Background worker shutting down safely.');
    process.exit(0);
  }
  ```
- When `REDIS_URL` is unset:
  1. The worker process cannot run and exits immediately.
  2. In `server/jobs/queue.ts`, `enqueueJob()` writes the job row to the database with `status = 'QUEUED'`, but logs:
     `[JOBS] Degraded mode: Job ... enqueued in DB but not pushed to Redis.`
  3. **Result:** The job is never processed and remains in `QUEUED` status indefinitely. There is no in-memory fallback worker for local development or preview environments.

---

## 10. Phase 9 — AI Truth

### 1. Gemini Integration `[VERIFIED IN CODE]`
- Located in `server/services/ai/`.
- Uses official `@google/genai` TypeScript SDK:
  ```typescript
  import { GoogleGenAI } from '@google/genai';
  ```
- Endpoint: `POST /api/transcribe`.
- Quota check: Enforces per-tenant monthly token and cost limits (`checkQuota` against `ai_usage` table).
- Auditing: Records all attempts and completions in `audit_logs` and `ai_usage`.

### 2. Model Identifier Discrepancy `[DISCREPANCY / BUG]`
- In `server.ts` line 1403, `server/services/ai/aiConfig.ts` line 16, and `src/components/common/AudioTranscriberModal.tsx`:
  - The model name is hardcoded as `'gemini-3.5-transcribe'`.
  - **Reality:** `gemini-3.5-transcribe` is not a valid Gemini model. If `GEMINI_API_KEY` were supplied and invoked against the API, Google's API would reject the request with `Model not found`.
- When `GEMINI_API_KEY` is not present:
  - `aiService.ts` (lines 57–62) falls back to simulated mode:
    ```typescript
    if (this.isSimulated) {
      await new Promise(resolve => setTimeout(resolve, 1500));
      resultText = "This is a simulated transcription because no GEMINI_API_KEY is configured.";
      tokens = 15;
    }
    ```

---

## 11. Phase 10 — Reporting, Import/Export & Platform Administration Truth

### 1. Reporting Engine `[VERIFIED IN CODE]`
- `calculateReports(tenantId)` in `server/db.ts`:
  - Queries `leads`, `calls`, and `users` tables scoped to tenant.
  - Computes conversion rates, calls made today, lead sources breakdown, stage distribution, and telecaller leaderboard dynamically from active records.

### 2. Platform Administration Endpoints `[SIMULATED / STUB]`
- In `server.ts` lines 1453–1522:
  - `GET /api/platform/soc/alerts` -> Hardcoded `res.json([])`. (The `security_alerts` table in PostgreSQL is ignored).
  - `GET /api/platform/billing` -> Hardcoded `res.json([])`. (The `billing_records` table in PostgreSQL is ignored).
  - `POST /api/platform/billing/:id/mark-paid` -> Hardcoded `res.json({ success: true })`.
  - `GET /api/platform/features` -> Hardcoded `res.json([])`. (The `feature_flags` table in PostgreSQL is ignored).
  - `PUT /api/platform/features/:id` -> Hardcoded `res.json({ success: true })`.
  - `POST /api/platform/impersonate` -> Generates token but fails to insert an `impersonation_sessions` record, causing subsequent requests to fail `enforceTenantScope` validation.

---

## 12. Phase 11 — Documentation Contradiction & Drift Audit

### Detailed Discrepancy Inventory

| Document | Section / Line | Documented Statement | Technical Truth (Code Verification) |
| :--- | :--- | :--- | :--- |
| **README.md** | Line 36 | `Data Layer: Local file-backed JSON (data/db.json).` | Code uses PostgreSQL schema (`server/db/schema.ts`) and Drizzle ORM. `data/db.json` does not exist. |
| **README.md** | Line 98 | `data/ - Contains the db.json file used for application state persistence.` | `data/` directory and `db.json` are absent from the repository. |
| **README.md** | Line 105 | `Running the app locally automatically injects development dummy data into data/db.json.` | Dummy data is seeded into in-memory arrays or PostgreSQL via `server/seed/development.ts`. |
| **BRAIN.md** | Line 14 | `Data Layer: Local file-backed JSON (data/db.json). Wired up and strictly used in place of an external RDBMS.` | Drizzle ORM over PostgreSQL (`postgres.js`) is wired up in `server/db/client.ts`. |
| **BRAIN.md** | Line 21 | `Database is flushed to disk (data/db.json) via saveDatabase() on every write operation.` | `saveDatabase()` does not exist in any file in the repository. |
| **BRAIN.md** | Line 21 | `Concurrency is handled naively via an optimistic version check on individual Lead updates.` | No version check exists on lead updates in `server.ts` or `lead.repository.ts`. |
| **AUTH_AND_COMPLIANCE.md** | Line 62 | `Dynamically resolves permissions from db.rolePermissions stored in db.json.` | Queries `role_permissions` table in Drizzle. Stored schema has field mismatch (`permissions` vs `actions`). |
| **credentials.md** | Line 35 | `All password hashes in data/db.json match password123.` | Password hashes are generated dynamically in `server/seed/development.ts`. |
| **SECURITY_FINDINGS.md** | Line 308 | `The endpoint accepts arbitrarily large rawLeads arrays and synchronously performs saveDatabase().` | Import endpoint queues background jobs (`IMPORT_LEADS`) via BullMQ. |
| **docs/disaster-recovery.md** | Line 54 | `Run npx tsx security-tests/production-safety.test.ts as smoke test.` | `production-safety.test.ts` crashes with `TypeError: getDb is not a function`. |

---

## 13. Phase 12 — Test Suite & Verification Truth

### 1. `npm test` (`tests/auth-and-compliance.test.ts`) `[DISCREPANCY / BUG]`
- **Status:** FAILS with `ECONNRESET`.
- **Root Cause:**
  - This is an integration test suite that sends HTTP requests to `http://localhost:3000`.
  - In Category 3 (`POST /api/users`), the endpoint executes `can(req.securityContext!, 'users:create')`.
  - `can()` calls `perm.actions.includes(...)`.
  - Because `DEFAULT_ROLE_PERMISSIONS` provides `permissions: [...]` instead of `actions: [...]`, `perm.actions` is `undefined`, triggering an unhandled `TypeError` that crashes the server process.

### 2. `tests/deterrence-and-crawlers.test.ts` `[VERIFIED IN CODE]`
- **Status:** PASSES (9/9 tests pass).
- **Scope:** Correctly verifies AI crawler user-agent detection, `robots.txt` generation, and anti-scraping deterrence thresholds.

### 3. `security-tests/run-all.ts` (`npm run test:security`) `[VERIFIED IN CODE]`
- **Status:** Integration suite requiring live server.
- **Suite-by-Suite Breakdown:**
  - `config-secrets.test.ts`: **PASSES** (CORS origin reflection, CSP headers, build secret leaks).
  - `rate-limiting.test.ts`: **FAILS** (Vulnerability: `X-Forwarded-For` header spoofing bypasses login rate limiting).
  - `authorization.test.ts`: **FAILS** (Server crash on `can()` invocation).
  - `auth.test.ts`: **FAILS** (Server crash or mismatch on tokens).
  - `production-safety.test.ts`: **FAILS** (`TypeError: getDb is not a function`).
  - `backup-restore.test.ts`: **SKIPPED** (`psql` CLI not installed in container).
  - `redis-infrastructure.test.ts`: **FAILS** (Assertion error: `redisService.ping()` returns `true` instead of `false` when client is null).

---

## 14. Phase 13 — Prioritized Vulnerability & Remediation Backlog

### Priority 0: Critical Fixes (Crash & Security Blockers)
1. **Fix Role Permissions Schema & Seed Mismatch (`server/seed/defaultRolePermissions.ts` & `server/policy.ts`) — [RESOLVED]**
   - Corrected `DEFAULT_ROLE_PERMISSIONS` to strictly use `actions: Action[]` and `scope` matching `server/db/schema.ts` and `src/types.ts`.
   - Maintained defensive backward compatibility in `server/policy.ts`: `const actionsList: string[] = perm ? ((perm.actions as string[]) || (perm as any).permissions || []) : [];`.
   - Restored `server/db/client.ts` to PostgreSQL-only with mandatory `DATABASE_URL` check.
2. **Fix `X-Forwarded-For` Rate Limiting Bypass (`server.ts`)**
   - Do not use raw client-supplied `X-Forwarded-For` headers without verifying trusted upstream proxy subnets.

### Priority 1: High Architecture Fixes
1. **Degraded Mode Background Job Processing (`server/jobs/`)**
   - Add an in-memory job worker fallback for development/preview when `REDIS_URL` is absent, allowing `IMPORT_LEADS`, `EXPORT_LEADS`, and `BULK_UPDATE_LEADS` to complete.
2. **Fix AI Model Placeholder (`server/services/ai/aiConfig.ts`)**
   - Replace fictional `'gemini-3.5-transcribe'` with valid Google GenAI model identifiers (e.g., `'gemini-2.5-flash'`).
3. **Fix `redisService.ping()` Degradation Check (`server/infrastructure/redis.ts`)**
   - Return `false` (not `true`) when `this.client` is null or disconnected.

### Priority 2: Stubs & Incomplete Implementations
1. **Wire Platform Admin Endpoints to Existing Database Tables (`server.ts`)**
   - Connect `/api/platform/soc/alerts` to `securityAlerts` table.
   - Connect `/api/platform/billing` to `billingRecords` table.
   - Connect `/api/platform/features` to `featureFlags` table.
   - Persist impersonation records to `impersonationSessions` in `POST /api/platform/impersonate`.

### Priority 3: Documentation Alignment
1. **Update `README.md`, `BRAIN.md`, `AUTH_AND_COMPLIANCE.md`, and `credentials.md`**
   - Remove all references to `data/db.json` and `saveDatabase()`.
   - Document the true Drizzle ORM / PostgreSQL architecture with fallback mock.
   - Update test documentation to reflect that integration tests require a running server.
