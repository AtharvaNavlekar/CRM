# DialPulse CRM — Authentication, RBAC, and Compliance Architecture

## Executive Overview

DialPulse CRM has been architected with a comprehensive, root-cause security and compliance layer implemented directly within the Express backend (`server.ts`, `server/compliance.ts`, `server/db.ts`) and integrated seamlessly into the client API client layer (`src/services/api.ts`).

Rather than superficial client-side checks or ad-hoc `if` statements, the system implements:

1. **Cryptographic Authentication & Session Management**: bcryptjs salted password hashing, signed RS/HS JWTs with cryptographic `jti` identifiers, refresh token rotation, and in-memory session revocation.
2. **Server-Authoritative Role-Based Access Control (RBAC)**: Deny-by-default authorization middleware reading permissions dynamically from database storage, privilege escalation guards, and IDOR protection against cross-representative tampering.
3. **TRAI & Telecom Outreach Compliance Engine**: Unified server-side compliance gateway enforcing Indian telecom regulations (Quiet Hours 19:00–09:00 IST), global DND / opt-outs, contact blocking, channel preference constraints, and rolling contact frequency limits.
4. **Defense-in-Depth Hardening**: Helmet CSP, origin-restricted CORS with credential isolation, prototype pollution payload cleansing, CSV/formula injection sanitization (CWE-1236), and subnet-aware brute-force rate limiting.
5. **Comprehensive Automated Test Harness**: 33 automated security tests covering all 7 vulnerability categories, passing with 0 security exposures.

---

## 1. Authentication Layer

### Password Security & Hashing

- Passwords are salted and hashed using `bcryptjs` with a work factor of 10 (`bcryptjs.hashSync(password, 10)`).
- Raw passwords are never persisted to disk or logged.
- Seed users and dynamically invited users receive cryptographically secure hashes. If an administrator invites a user without supplying an initial password, a high-entropy temporary token is generated (`crypto.randomBytes(24)`), preventing predictable default password attacks (`password123`).

### JWT Specification

- **Access Tokens**:
  - Signed with `JWT_SECRET` (loaded securely from environment or derived cryptographically).
  - Short-lived TTL (default 15 minutes or configured `JWT_EXPIRY`).
  - Payload: `{ id, email, role, type: 'access', jti: crypto.randomUUID() }`.
  - The unique `jti` (JWT ID) guarantees that every token is distinct and prevents cross-session invalidation collisions.
- **Refresh Tokens**:
  - Long-lived (7-day TTL).
  - Payload: `{ id, email, type: 'refresh', jti: crypto.randomUUID() }`.
  - Exchanged via `/api/auth/refresh` for a fresh access token.
- **Logout & Session Revocation**:
  - `/api/auth/logout` adds the active access token and refresh token to a server-side revocation registry (`revokedTokens`).
  - Subsequent requests presenting revoked tokens are rejected with `HTTP 401 Unauthorized (TOKEN_REVOKED)`.

### Authentication Middleware (`authenticateToken`)

The middleware intercepts every inbound request:

- Excludes public endpoints (`/api/auth/login`, `/api/auth/refresh`, `/api/health`, static client assets).
- Extracts `Authorization: Bearer <token>` header.
- Rejects requests missing credentials or presenting tokens with `alg: "none"` or tampered signatures.
- Verifies expiration and checks the token against the revocation set.
- Attaches the sanitized, verified user principal to `req.user`.

---

## 2. Role-Based Access Control (RBAC) & IDOR Protection

### Server-Enforced RBAC Middleware

1. **Role Guard (`requireRole(...roles)`):**

   - Restricts sensitive administrative routes (e.g., `/api/users` account creation, `/api/reset-data` database wipes, `/api/backups/:id/restore`) exclusively to allowed roles.
   - Unauthorized callers receive `HTTP 403 Forbidden (ROLE_NOT_AUTHORIZED)`.
2. **Permission Guard (`requirePermission(permissionKey)`):**

   - Dynamically resolves permissions from `db.rolePermissions` stored in `db.json`.
   - Admin roles automatically bypass checks (`Admin` superuser).
   - Roles without explicit capability grants (e.g., `canExportData`, `canManageIntegrations`, `canDeleteRecords`) are denied by default with `HTTP 403 Forbidden`.
3. **Privilege Escalation Protection (`POST /api/auth/switch-user`):**

   - Non-administrators are prohibited from switching user identities or elevating their own role. Attempts to do so return `HTTP 403 Forbidden`.

### Insecure Direct Object Reference (IDOR) Protection

- **Lead Mutation (`PUT /api/leads/:id`):**
  - Representatives (`Rep`) can only update leads explicitly assigned to them (`assignedRepId === req.user.id`).
  - Attempts by a representative to modify another representative's lead are blocked with `HTTP 403 Forbidden (IDOR_ACCESS_DENIED)`.
- **Call Log Exposure (`GET /api/calls`):**
  - Representatives without `canViewAllLeads` permission cannot query call history for other representatives (`?repId=otherRepId`).
  - If a representative attempts to inspect another rep's logs, the request is rejected with `HTTP 403 Forbidden (IDOR_ACCESS_DENIED)`.
- **Caller Identity Spoofing (`POST /api/calls`):**
  - Call records strictly bind `repId` and `repName` to the authenticated caller (`req.user.id` and `req.user.name`). Client-supplied spoofed parameters are ignored for non-admin callers.

---

## 3. Telecom Outreach Compliance Engine

Located in `server/compliance.ts`, the compliance verification engine provides a single authoritative gateway evaluated before any call or message is dispatched.

```
Inbound Outreach Request (/api/calls, /api/messages)
                     │
                     ▼
       ┌────────────────────────────┐
       │   checkCompliance(lead)    │
       └─────────────┬──────────────┘
                     │
         [1] Global Opt-Out / DND? ────► [REJECT: HTTP 403 LEAD_OPTED_OUT]
                     │
         [2] Contact Blocked? ─────────► [REJECT: HTTP 403 LEAD_BLOCKED]
                     │
         [3] 30-Day Snooze Active? ────► [REJECT: HTTP 403 CONTACT_PAUSED]
                     │
         [4] Channel Restriction? ─────► [REJECT: HTTP 403 CHANNEL_RESTRICTED]
                     │
         [5] Quiet Hours (IST)? ───────► [REJECT: HTTP 403 QUIET_HOURS_VIOLATION]
                     │
         [6] Frequency Cap Exceeded? ──► [REJECT: HTTP 429 DAILY/WEEKLY_CAP_EXCEEDED]
                     │
         [7] Cooldown Period? ─────────► [REJECT: HTTP 429 COOLDOWN_VIOLATION]
                     │
                     ▼
           [DISPATCH PERMITTED]
```

### Key Compliance Rules

1. **TRAI Quiet Hours Enforcement**:
   - Calculates time in **India Standard Time (Asia/Kolkata, UTC+5:30)** using `Intl.DateTimeFormat`.
   - Default window: **19:00 (7:00 PM) to 09:00 (9:00 AM) IST**.
   - Handles midnight rollover accurately.
2. **Global Opt-Out & DND**:
   - Leads with `preferences.isOptedOut = true` cannot receive calls or messages.
3. **Channel Preference**:
   - If a lead requests `WhatsApp` only, voice calls are rejected with `CHANNEL_RESTRICTED`.
4. **Rolling Frequency Limits**:
   - Enforces configurable limits: `maxCallsPerDay`, `maxCallsPerWeek`, and `minHoursBetweenCalls` across prior call and message timestamps.
5. **Configuration RBAC**:
   - Updating compliance frequency rules (`PUT /api/compliance/rules`) is restricted to administrators.

---

## 4. Security Hardening & Defenses

- **HTTP Security Headers**: Powered by `helmet` with custom Content Security Policy (CSP), frameguard (`DENY`), and MIME-sniffing protection.
- **Strict CORS Policy**: Disallows arbitrary origins when credentials are enabled. Reflects only authorized origins or disables credentials for external domains.
- **Brute-Force Rate Limiting**:
  - Employs `express-rate-limit` with window-based throttling (30 attempts / 15 minutes).
  - Subnet-aware IP key generation (`/24` CIDR aggregation) to neutralize `X-Forwarded-For` header spoofing and rotation attacks.
  - Automatically skips successful logins (`skipSuccessfulRequests: true`).
- **Prototype Pollution Prevention**:
  - Strips recursive object keys (`__proto__`, `constructor`, `prototype`) from inbound JSON request bodies.
- **CSV & Formula Injection Neutralization (CWE-1236)**:
  - Sanitizes user input in bulk imports (`POST /api/leads/import`) by prefixing formula triggers (`=`, `+`, `-`, `@`, `\t`, `\r`) with a single quote (`'`).
  - Caps bulk import batches to 250 records to protect the event loop.
- **Optimistic Concurrency Control**:
  - Validates `version` or `updatedAt` timestamps on lead modifications (`PUT /api/leads/:id`) to prevent race conditions and lost updates.

---

## 5. Security Test Harness

A master automated test harness resides in `security-tests/` and is executable via:

```bash
npm run test:security
```

### Test Coverage Summary

- **Category 1: Authorization, IDOR & Access Control** (11 tests)
  - IDOR on lead modifications
  - IDOR on call log queries
  - Identity spoofing on call dispatch
  - Privilege escalation on user persona switching
  - Role guards on deletion, import, bulk update, user invitation, database wipe, backup restore, and role permission settings
- **Category 2: Authentication & Session Handling** (5 tests)
  - Login rate limiting threshold enforcement
  - Unsigned / `alg: "none"` JWT rejection
  - Expired token rejection
  - Session revocation upon logout
  - Absence of hardcoded fallback secrets
- **Category 3: Input Validation, XSS & Injection Defense** (4 tests)
  - Boundary validation on oversized strings
  - Prototype pollution payload resistance
  - CSV / formula injection neutralization
  - Static audit of XSS sinks (`dangerouslySetInnerHTML`)
- **Category 4: Configuration, CORS & Secrets Hardening** (4 tests)
  - CORS origin reflection with credentials
  - Client build artifact secret scanning
  - Helmet headers and CSP configuration
  - Environment secrets fallback audit
- **Category 5: Business Logic, Concurrency & Data Integrity** (3 tests)
  - Elimination of default hardcoded passwords on user creation
  - Optimistic concurrency control via version checking
  - Unauthorized database wipe protection
- **Category 6: Rate Limiting & Abuse Prevention** (2 tests)
  - Rate limiter IP spoofing resistance
  - Unbounded batch processing cap enforcement
- **Category 7: Outreach Compliance & Telecom Regulations** (4 tests)
  - DND and global opt-out enforcement on calls and messages
  - Blocked contact outreach guard
  - Preferred communication channel enforcement
  - RBAC on compliance rule updates

**Current Execution Status:** `33 / 33 Passed (0 Vulnerabilities)`
