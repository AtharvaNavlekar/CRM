# DialPulse CRM — Internal Data & Privacy Specification

> **Document Classification:** Internal Technical & Privacy Specification  
> **Target Audience:** Legal Counsel, Compliance Officers, Security Engineers, DPO  
> **Source Target:** DialPulse CRM Production Codebase (`/server.ts`, `/server/`, `/src/types.ts`)  
> **Auditing Standard:** Read-Only Codebase Inspection  
> **Document Status:** Complete & Authoritative  
> **Classification Legend:**
> - `[VERIFIED IN CODE]` — Explicitly implemented in application source code.
> - `[VERIFIED IN CONFIG]` — Configured in environment templates, package configurations, or system headers.
> - `[VERIFIED IN DOCUMENTATION]` — Documented in architectural specifications or test harness reports.
> - `[HISTORICAL]` — Documented in prior security reviews or legacy prototypes, subsequent changes noted.
> - `[UNKNOWN]` — Cannot be determined solely from repository source code; requires infrastructure or business determination.

---

## 1. Document Scope, Architecture & Audit Methodology

### 1.1 Scope of Audit
This document details the actual, verifiable data handling practices, tenant isolation mechanisms, authentication and authorization frameworks, compliance gates, external subprocessor connections, and privacy lifecycle of DialPulse CRM. `[VERIFIED IN CODE]`

DialPulse CRM operates as a high-velocity, compliance-first Customer Relationship Management platform engineered primarily for Indian SMB sales, telecalling, and customer support operations. The platform unifies lead pipelines, multi-channel outreach (telephony and WhatsApp), support ticketing, reporting analytics, and automated regulatory guardrails. `[VERIFIED IN CODE]`

### 1.2 Architectural Profile
- **Runtime Environment:** Node.js (v20+ LTS) running Express 4.21.2 backend combined with React 19 / Vite 6 SPA frontend. `[VERIFIED IN CODE]`
- **Data Persistence Layer:** Drizzle ORM managing a typed PostgreSQL database schema (`/server/db/schema.ts`). In local development mode, an in-memory mock client mimics relational constraints. `[VERIFIED IN CODE]`
- **Background Processing Engine:** BullMQ distributed queue powered by Redis (`/server/jobs/`), running dedicated worker processors for asynchronous lead exports, bulk imports, and batch updates. `[VERIFIED IN CODE]`
- **Hosting & Perimeter Context:** Designed for containerized ingress (Google Cloud Run / Kubernetes / Nginx reverse proxy) operating behind `trust proxy: 1` with strict HTTP security headers via Helmet. `[VERIFIED IN CODE]`

---

## 2. Comprehensive Data Inventory & Field Classifications

The application schema defines multiple database entities handling Personal Identifiable Information (PII), sensitive credentials, operational records, and telemetry:

### 2.1 User Accounts (`users` Table)
*Represents system operators, telecallers, team managers, administrators, and platform operators.* `[VERIFIED IN CODE]`

| Field Name | Type | Classification | Privacy Sensitivity | Purpose & Storage Mode |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `text` (PK) | Pseudonymous Identifier | Low | Internal user identifier (`usr-*` or UUID). Plaintext. `[VERIFIED IN CODE]` |
| `tenant_id` | `text` (FK) | Organizational Identifier | Low | Foreign key to tenant boundary. Plaintext. `[VERIFIED IN CODE]` |
| `name` | `text` | PII (Direct) | Medium | User's full name. Plaintext. `[VERIFIED IN CODE]` |
| `email` | `text` (Unique) | PII (Direct) | High | User login identity & notifications. Lowercased, plaintext. `[VERIFIED IN CODE]` |
| `password_hash` | `text` | Sensitive Credential | Critical | Password verification. Salted bcryptjs (work factor 10). Plaintext password never stored. `[VERIFIED IN CODE]` |
| `role` | `text` | RBAC Metadata | Medium | Hierarchical role (`telecaller`, `tl`, `tl_head`, `it`, `owner`, `cto`, platform roles). `[VERIFIED IN CODE]` |
| `team_id` | `text` | Organizational Metadata | Low | Scopes user to specific departmental team. Plaintext. `[VERIFIED IN CODE]` |
| `manages_team_ids` | `jsonb` | RBAC Metadata | Low | Array of team IDs supervised by `tl_head`. Plaintext. `[VERIFIED IN CODE]` |
| `title` | `text` | Professional Data | Low | Corporate job title. Plaintext. `[VERIFIED IN CODE]` |
| `phone` | `text` | PII (Direct) | High | User contact telephone. Plaintext. `[VERIFIED IN CODE]` |
| `auth_version` | `integer` | Security Metadata | Low | Incremented to invalidate active JWT tokens on credential reset. `[VERIFIED IN CODE]` |
| `is_platform_staff` | `boolean` | Privilege Flag | High | Indicates super-administrative platform operator status. `[VERIFIED IN CODE]` |

### 2.2 Customer Leads (`leads` Table)
*Represents external prospective customers and end-user contacts contacted by telecallers.* `[VERIFIED IN CODE]`

| Field Name | Type | Classification | Privacy Sensitivity | Purpose & Storage Mode |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `text` (PK) | Entity Identifier | Low | Lead record ID (`ld-*` or UUID). Plaintext. `[VERIFIED IN CODE]` |
| `tenant_id` | `text` (FK) | Tenant Boundary Key | Low | Enforces strict multi-tenant isolation. Plaintext. `[VERIFIED IN CODE]` |
| `name` | `text` | PII (Direct) | Medium | Lead contact person or entity name. Plaintext. `[VERIFIED IN CODE]` |
| `phone` | `text` | PII (Direct) | Critical | Primary E.164 phone number used for telephony/WhatsApp. Plaintext. `[VERIFIED IN CODE]` |
| `email` | `text` | PII (Direct) | High | Customer email address. Optional, plaintext. `[VERIFIED IN CODE]` |
| `source` | `text` | Commercial Metadata | Low | Lead generation channel (e.g., Organic, Referral, CSV). Plaintext. `[VERIFIED IN CODE]` |
| `notes` | `text` | Unstructured PII | High | Interaction history, conversation summaries, telecaller notes. Plaintext. `[VERIFIED IN CODE]` |
| `stage` | `text` | Pipeline Status | Low | Sales funnel status (`New`, `Contacted`, `Qualified`, `Won`, `Lost`). Plaintext. `[VERIFIED IN CODE]` |
| `priority` | `text` | Operational Metadata | Low | `Low`, `Medium`, `High`, `Urgent`. Plaintext. `[VERIFIED IN CODE]` |
| `assigned_rep_id` | `text` | Operational Metadata | Low | User ID of assigned telecaller. Plaintext. `[VERIFIED IN CODE]` |
| `team_id` | `text` | Organizational Metadata | Low | Team identifier for intra-tenant scoping. Plaintext. `[VERIFIED IN CODE]` |
| `version` | `integer` | Concurrency Metadata | Low | Monotonic version for optimistic locking. `[VERIFIED IN CODE]` |
| `custom_fields` | `jsonb` | Unstructured / Custom | Variable | Tenant-defined key-value attributes. Can contain arbitrary customer data. Plaintext. `[VERIFIED IN CODE]` |
| `is_opted_out` | `boolean` | Regulatory Preference | High | Global DND / opt-out flag. Plaintext. `[VERIFIED IN CODE]` |
| `is_paused_30_days` | `boolean` | Regulatory Preference | Medium | Temporary communication pause indicator. Plaintext. `[VERIFIED IN CODE]` |
| `blocked_reason` | `text` | Regulatory Preference | Medium | Reason for inclusion on Do-Not-Contact list. Plaintext. `[VERIFIED IN CODE]` |
| `preferences` | `jsonb` | Regulatory / Channel | High | Structured preferences: channel restrictions, pause expiry, fatigue cap status. Plaintext. `[VERIFIED IN CODE]` |
| `contact_attempts_7d` | `jsonb` | Compliance Counters | Low | Rolling 7-day contact attempts across call, WhatsApp, and SMS. Plaintext. `[VERIFIED IN CODE]` |

### 2.3 Call Interactions (`calls` Table)
*Represents outbound and inbound telephonic interaction records.* `[VERIFIED IN CODE]`

| Field Name | Type | Classification | Privacy Sensitivity | Purpose & Storage Mode |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `text` (PK) | Entity Identifier | Low | Call record ID (`call-*`). `[VERIFIED IN CODE]` |
| `tenant_id` | `text` (FK) | Tenant Boundary Key | Low | Foreign key to tenant. `[VERIFIED IN CODE]` |
| `lead_id` | `text` (FK) | Foreign Entity Key | Low | Target lead identifier. `[VERIFIED IN CODE]` |
| `rep_id` | `text` (FK) | Foreign Entity Key | Low | Authenticated user making the call. `[VERIFIED IN CODE]` |
| `rep_name` | `text` | Operational PII | Low | Cached name of the caller. `[VERIFIED IN CODE]` |
| `outcome` | `text` | Operational Metadata | Low | Call disposition (e.g., `Connected`, `Voicemail`, `DND Requested`). `[VERIFIED IN CODE]` |
| `duration` | `integer` | Call Telemetry | Low | Duration in seconds. `[VERIFIED IN CODE]` |
| `timestamp` | `timestamp` | Audit / Telemetry | Low | Exact ISO-8601 UTC timestamp of call initiation. `[VERIFIED IN CODE]` |
| `notes` | `text` | Unstructured PII | High | Telecaller summary notes. Scanned for sensitive PII expressions. Plaintext. `[VERIFIED IN CODE]` |
| `compliance_flags` | `jsonb` | Compliance Audit | Medium | Array of detected compliance anomalies (e.g., `['PII_DETECTED']`). `[VERIFIED IN CODE]` |
| `recording_url` | `text` | Sensitive Media | Critical | URI to audio recording. Optional, plaintext. `[VERIFIED IN CODE]` |

### 2.4 Messages (`messages` Table)
*Represents two-way electronic messaging (WhatsApp Cloud API / SMS).* `[VERIFIED IN CODE]`

| Field Name | Type | Classification | Privacy Sensitivity | Purpose & Storage Mode |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `text` (PK) | Entity Identifier | Low | Message record ID (`msg-*`). `[VERIFIED IN CODE]` |
| `tenant_id` | `text` (FK) | Tenant Boundary Key | Low | Foreign key to tenant. `[VERIFIED IN CODE]` |
| `lead_id` | `text` (FK) | Foreign Entity Key | Low | Target lead recipient. `[VERIFIED IN CODE]` |
| `rep_id` | `text` (FK) | Foreign Entity Key | Low | User identity dispatching message. `[VERIFIED IN CODE]` |
| `direction` | `text` | Telemetry | Low | `inbound` or `outbound`. `[VERIFIED IN CODE]` |
| `channel` | `text` | Telemetry | Low | `whatsapp` or `sms`. `[VERIFIED IN CODE]` |
| `text` | `text` | Communication Content | Critical | Plaintext message payload sent or received. Plaintext. `[VERIFIED IN CODE]` |
| `timestamp` | `timestamp` | Telemetry | Low | ISO-8601 timestamp. `[VERIFIED IN CODE]` |
| `status` | `text` | Operational Status | Low | `sent`, `delivered`, `read`, `failed`. `[VERIFIED IN CODE]` |

### 2.5 Security Audit Trail (`audit_logs` Table)
*Immutable security, authorization, and data governance event logs.* `[VERIFIED IN CODE]`

| Field Name | Type | Classification | Privacy Sensitivity | Purpose & Storage Mode |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `text` (PK) | Audit Identifier | Low | Unique event ID (`audit-*` or UUID). `[VERIFIED IN CODE]` |
| `tenant_id` | `text` (FK) | Tenant Boundary Key | Low | Tenant identifier or `platform`. `[VERIFIED IN CODE]` |
| `actor_user_id` | `text` | Pseudonymous PII | Medium | ID of the authenticated user performing the action. `[VERIFIED IN CODE]` |
| `actor_name` | `text` | Operational PII | Low | Human-readable name of the actor. `[VERIFIED IN CODE]` |
| `actor_role` | `text` | RBAC Metadata | Low | Security role at time of action. `[VERIFIED IN CODE]` |
| `action` | `text` | Event Classification | Low | Security verb (`USER_LOGIN`, `DATA_EXPORT`, `LEAD_DELETED`, etc.). `[VERIFIED IN CODE]` |
| `entity_type` | `text` | Target Metadata | Low | Target resource category (`leads`, `users`, `compliance`). `[VERIFIED IN CODE]` |
| `entity_id` | `text` | Target Identifier | Low | Target resource ID. `[VERIFIED IN CODE]` |
| `ip_address` | `text` | Network Telemetry | Medium | Remote IPv4/IPv6 address of request origin. Plaintext. `[VERIFIED IN CODE]` |
| `user_agent` | `text` | Client Telemetry | Low | Browser / HTTP client User-Agent string. Truncated to 255 chars. `[VERIFIED IN CODE]` |
| `occurred_at` | `timestamp` | Temporal Audit | Low | Exact UTC timestamp of event. `[VERIFIED IN CODE]` |
| `severity` | `text` | Triage Metadata | Low | `LOW`, `NORMAL`, `HIGH`, `CRITICAL`. `[VERIFIED IN CODE]` |
| `status` | `text` | Outcome Metadata | Low | `SUCCESS`, `FAILURE`, `DENIED`. `[VERIFIED IN CODE]` |
| `details` | `text` | Diagnostic Text | Medium | Contextual event narrative. Plaintext. `[VERIFIED IN CODE]` |
| `metadata` | `jsonb` | Diagnostic Attributes | Medium | Context dictionary (e.g., exported format, job ID, query parameters). `[VERIFIED IN CODE]` |

### 2.6 Active Authentication Sessions (`sessions` Table)
*Tracks active refresh token families and browser devices.* `[VERIFIED IN CODE]`

| Field Name | Type | Classification | Privacy Sensitivity | Purpose & Storage Mode |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `text` (PK) | Session ID | Medium | UUID session identifier. Plaintext. `[VERIFIED IN CODE]` |
| `user_id` | `text` (FK) | User Identifier | Low | Target authenticated user. `[VERIFIED IN CODE]` |
| `tenant_id` | `text` (FK) | Tenant Boundary Key | Low | Tenant identifier. `[VERIFIED IN CODE]` |
| `token_family_id` | `text` | Security Metadata | Medium | Rotation family ID for token reuse attack detection. `[VERIFIED IN CODE]` |
| `refresh_token_hash` | `text` | Cryptographic Digest | Critical | SHA-256 hash of opaque refresh token. Plaintext token never stored. `[VERIFIED IN CODE]` |
| `created_at` / `expires_at` | `timestamp` | Session Lifecycle | Low | Creation and expiration timestamps (7-day TTL). `[VERIFIED IN CODE]` |
| `last_used_at` | `timestamp` | Telemetry | Low | Most recent token exchange. `[VERIFIED IN CODE]` |
| `created_ip` / `last_used_ip` | `text` | Network Telemetry | Medium | Source IPv4/IPv6 addresses. `[VERIFIED IN CODE]` |
| `created_user_agent` | `text` | Client Telemetry | Low | Browser device information. `[VERIFIED IN CODE]` |
| `revoked_at` / `revoke_reason` | `text` | Security State | Low | Invalidation record (`logout`, `rotated`, `reuse_detected`, `user_revoked`). `[VERIFIED IN CODE]` |

---

## 3. End-to-End Data Processing Lifecycle

```
[ INGESTION ] ────────► [ PROCESSING & VALIDATION ] ────────► [ STORAGE (Postgres) ]
  • Web UI Forms          • Prototype Pollution Strip           • Leads / Calls / Messages
  • CSV Bulk Ingestion    • Formula Injection Clean             • Audit Logs / Sessions
  • Telephony Outbound    • Canonical Security Context          • Encrypted Credentials
  • Inbound Messages      • Scope Authorization (can())
                          • Compliance Rules (TRAI/Quiet)
                                     │
                                     ▼
[ AI SANITIZATION ] ◄────────────────┤
  • Regex PII Masking                ▼
  • Quota Check            [ EGRESS / CONSUMPTION ]
  • Gemini API Dispatch      • Field Sanitization (sanitizeUser)
  • No Prompt Persistence    • Background CSV/JSON Export
                             • Audit Log Export
```

### 3.1 Data Ingestion
1. **Direct Web Input:** Authenticated operators submit lead details, call outcomes, and ticket messages via HTTPS JSON payloads (`application/json`).
2. **Bulk Ingestion:** Administrators upload CSV/Excel files containing lead batches up to 250 records. `[VERIFIED IN CODE]`
3. **Simulated/Real Messaging Ingress:** Inbound messages received via webhooks (`/api/messages/simulate-reply`). `[VERIFIED IN CODE]`

### 3.2 Processing, Sanitization & Validation
1. **Prototype Pollution Scrubbing:** Middleware traverses every inbound JSON body recursively, deleting `__proto__`, `constructor`, and `prototype` keys before route dispatch. `[VERIFIED IN CODE]`
2. **Formula Injection Sanitization (CWE-1236):** Prior to storing imported spreadsheet cells, strings beginning with `=, +, -, @, \t, \r` are escaped with a leading single quote (`'`). `[VERIFIED IN CODE]`
3. **Input Format Verification:** Email strings validated against standard RFC regex; phone numbers constrained to 8–25 characters, strictly rejecting null bytes (`\0`) and `<script` fragments. `[VERIFIED IN CODE]`

### 3.3 Data Egress & Output Sanitization
1. **User Object Sanitization (`sanitizeUser`):** All user account serialization strips `passwordHash` and internal secrets prior to returning JSON responses to clients. `[VERIFIED IN CODE]`
2. **Asynchronous Exports:** High-volume data export requests are queued as BullMQ background jobs (`EXPORT_LEADS`), requiring explicit secondary confirmation (`confirmed=true`). `[VERIFIED IN CODE]`

---

## 4. Multi-Tenant Data Isolation & Boundary Controls

### 4.1 Server-Authoritative Scoping
- **Tenant Scope Middleware (`enforceTenantScope`):** Extracts `tenantId` strictly from the cryptographically verified JWT payload and session record. Client-supplied headers (e.g., `x-tenant-id`) or body parameters are strictly rejected if mismatched. `[VERIFIED IN CODE]`
- **Unscoped Access Rejection:** Any request without a valid tenant context (excluding verified `isPlatformStaff`) is halted with `HTTP 403 Forbidden (TENANT_CONTEXT_REQUIRED)`. `[VERIFIED IN CODE]`
- **Tenant Status Verification (`verifyTenantActive`):** Every API request verifies that the host tenant is not suspended (`status === 'active'`). Suspended tenants receive `HTTP 403 Forbidden (TENANT_SUSPENDED)`. `[VERIFIED IN CODE]`

### 4.2 Database Layer Enforcement
- **Query Scoping:** In `server.ts`, all database queries on `leads`, `calls`, `messages`, `tickets`, `tenantSettings`, and `auditLogs` include explicit `eq(table.tenantId, tenantId)` predicates. `[VERIFIED IN CODE]`
- **Cross-Tenant Leakage Prevention:** Foreign keys across entities are strictly joined within the tenant context; no global search APIs span across multiple `tenant_id` boundaries. `[VERIFIED IN CODE]`

---

## 5. Role-Based Access Control (RBAC) & Scoping Hierarchy

### 5.1 Role Definitions
DialPulse implements a 6-tier operational RBAC hierarchy, plus dedicated platform staff roles: `[VERIFIED IN CODE]`

1. **`telecaller` (Rep):** Operational telecaller. Scope: `SELF`. Can only view and update leads and calls assigned to their own `id`.
2. **`tl` (Team Lead):** Team supervisor. Scope: `TEAM`. Can view, edit, and reassign records within their specific `teamId`.
3. **`tl_head` (Head of Team Leads):** Multi-team supervisor. Scope: `ALL_TEAMS`. Can access records across teams in `managesTeamIds`.
4. **`it` (IT Administrator):** Technical manager. Scope: `COMPANY`. Can configure integrations, tenant settings, and view technical audit logs.
5. **`owner` (Tenant Owner):** Business owner. Scope: `COMPANY`. Full administrative control over all tenant records, billing, users, and compliance rules.
6. **`cto` (Chief Technology Officer):** Technical executive. Scope: `COMPANY`. Full technical and administrative control over tenant data.
7. **`platform_staff` (`platform_admin`, `platform_support`, `platform_security`):** SaaS operator roles with system-level capabilities.

### 5.2 Dynamic Policy Evaluation (`server/policy.ts`)
Permissions are evaluated via `can(context, action, resource)`:
- Action mapping enforces least-privilege verbs: `VIEW`, `EDIT`, `REASSIGN`, `EXPORT`, `DELETE`, `MANAGE_USERS`, `MANAGE_COMPLIANCE_RULES`. `[VERIFIED IN CODE]`
- Sub-tenant ownership checks enforce intra-tenant boundaries:
  - If role scope is `SELF`, access is denied unless `resource.ownerId === context.actorUserId`. `[VERIFIED IN CODE]`
  - If role scope is `TEAM`, access is denied unless `resource.teamId === context.actorTeamId`. `[VERIFIED IN CODE]`
  - If role scope is `ALL_TEAMS`, access is denied unless `context.actorManagesTeamIds.includes(resource.teamId)`. `[VERIFIED IN CODE]`

---

## 6. Authentication Architecture & Credential Management

### 6.1 Password Hashing & Secret Derivation
- **Algorithm:** `bcryptjs` with a work factor of 10 (`bcryptjs.hashSync(password, 10)`). `[VERIFIED IN CODE]`
- **Default Password Mitigation:** Dynamic user invitations without a specified password generate a cryptographically strong 32-byte hexadecimal secret (`crypto.randomBytes(32).toString('hex')`), preventing dictionary attacks against newly provisioned accounts. `[VERIFIED IN CODE]`
- **Password Hygiene:** Plaintext passwords exist exclusively in transient request memory during `/api/auth/login` and `/api/users` creation, never logged or stored in audit payloads. `[VERIFIED IN CODE]`

### 6.2 Rate Limiting & Anti-Brute-Force
- **Rate Limit Window:** 30 failed login attempts per 15 minutes window (`windowMs: 15 * 60 * 1000, max: 30`). `[VERIFIED IN CODE]`
- **Subnet & Identity Keying:** Key generator aggregates IP address and target email (`${ip}|${email}`), hashing the composite key with SHA-256 (`createSafeKey`) prior to storage in Redis to prevent storing plaintext PII in cache keys. `[VERIFIED IN CODE]`
- **Bypass on Success:** Successful authentication requests are skipped (`skipSuccessfulRequests: true`), preventing legitimate users from being locked out. `[VERIFIED IN CODE]`

---

## 7. Token Lifecycle, Session Management & Invalidation

### 7.1 Access Tokens (JWT)
- **Algorithm:** HMAC-SHA256 (`HS256`). `[VERIFIED IN CODE]`
- **Lifespan (TTL):** Short-lived, exactly 15 minutes (`expiresIn: 900`). `[VERIFIED IN CODE]`
- **Audience & Issuer:** Issued by `dialpulse-crm`, audience `dialpulse-client`. `[VERIFIED IN CODE]`
- **Claims Payload:** `{ id, email, role, tenantId, isPlatformStaff, sessionId, type: 'access' }`. `[VERIFIED IN CODE]`
- **Transmission:** Sent via standard `Authorization: Bearer <token>` HTTP header. `[VERIFIED IN CODE]`

### 7.2 Refresh Tokens & Opaque Session Storage
- **Opaque Token Generation:** High-entropy 32-byte cryptographic random string (`crypto.randomBytes(32).toString('hex')`). `[VERIFIED IN CODE]`
- **Storage Strategy:** Raw refresh tokens are never persisted in the database; only their cryptographic SHA-256 hash (`refreshTokenHash`) is stored in the `sessions` table. `[VERIFIED IN CODE]`
- **Cookie Security:** Refresh tokens are delivered in an `httpOnly`, `sameSite: 'strict'`, `path: '/api/auth'` cookie, with the `secure` flag automatically enabled in production environments. `[VERIFIED IN CODE]`
- **TTL:** 7 days from issuance. `[VERIFIED IN CODE]`

### 7.3 Token Rotation & Token Family Reuse Detection
1. **Single-Use Rotation:** Every call to `/api/auth/refresh` issues a new access token and a new opaque refresh token, while revoking the previous session with `revokeReason: 'rotated'`. `[VERIFIED IN CODE]`
2. **Reuse Detection (Compromise Guard):** If a presentation of an already-revoked refresh token is detected, the entire session family (`tokenFamilyId`) is immediately revoked with `revokeReason: 'reuse_detected'`, and a `CRITICAL` audit alert (`SECURITY_ALERT`) is emitted. `[VERIFIED IN CODE]`

---

## 8. Platform Staff Impersonation Architecture

### 8.1 Privileged Access Restrictions
- **Zero Raw Data Access by Default:** Platform staff members (`isPlatformStaff === true`) are strictly barred from querying raw tenant data (`/api/leads`, `/api/calls`, `/api/messages`, `/api/tickets`) unless an active, verified impersonation session is in effect (`enforceImpersonationForRawData`). `[VERIFIED IN CODE]`
- **Impersonation Initiation (`POST /api/platform/impersonate`):** Requires specifying `targetUserId` and an explicit justification `reason`. `[VERIFIED IN CODE]`

### 8.2 Auditability & Termination
- **Mandatory Audit Logging:** Every impersonation session writes an immutable event (`PLATFORM_IMPERSONATION`) to the audit trail with `severity: 'CRITICAL'`, capturing the operator ID, target user ID, tenant ID, and reason. `[VERIFIED IN CODE]`
- **Impersonation State Tracking:** Recorded in the `impersonation_sessions` table with explicit `startedAt` and `endedAt` timestamps. `[VERIFIED IN CODE]`
- **Termination (`POST /api/platform/impersonate/end`):** Marks the active impersonation session `active: false` and emits `IMPERSONATION_ENDED`. `[VERIFIED IN CODE]`

---

## 9. IDOR Protections & Parameter Scoping Guards

Historically, an automated security audit identified potential IDOR exposures on lead updates and call history extraction (`[HISTORICAL]`, documented in `SECURITY_FINDINGS.md`). The current implementation contains comprehensive server-side mitigations: `[VERIFIED IN CODE]`

1. **Lead Mutation Guard:** In `PUT /api/leads/:id`, the resource owner (`assignedRepId`) and team (`teamId`) are fetched from the database and evaluated against `can(req.securityContext, 'leads:update', resource)`. Non-managerial telecallers attempting to modify records owned by others receive `HTTP 403 Forbidden`. `[VERIFIED IN CODE]`
2. **Reassignment Protection:** Changing the `assignedRepId` field requires explicit elevated authorization (`leads:delete` / `REASSIGN`), preventing telecallers from transferring leads to themselves without authorization. `[VERIFIED IN CODE]`
3. **Call & Message Ownership Isolation:** Call history (`GET /api/calls`) and messages (`GET /api/messages`) apply strict SQL filtering matching the user's role scope (`SELF` filters by `actorUserId`, `TEAM` filters by `actorTeamId`). `[VERIFIED IN CODE]`

---

## 10. Customer Lead Data Handling & Formula Injection Defense

### 10.1 Lead Attributes & Custom Fields
- Lead entities encapsulate contact phone, email, company notes, and dynamic `custom_fields` (`jsonb`).
- Custom fields allow tenants to define bespoke schemas without database migration; however, they inherit the tenant's security scope and access permissions. `[VERIFIED IN CODE]`

### 10.2 Spreadsheet Formula Injection Defense (CWE-1236)
- **Vulnerability Context:** When telecaller notes or lead names contain spreadsheet execution syntax (`=CMD()`, `@SUM()`), opening exported CSVs in Microsoft Excel or Google Sheets could trigger remote code execution or data exfiltration. `[HISTORICAL]`
- **Implementation:** The `sanitizeFormula()` sanitizer in `server.ts` checks every imported text string. If the first character matches `/^[=+\-@\t\r]/`, it prefixes the string with an apostrophe (`'`), neutralizing spreadsheet formula execution. `[VERIFIED IN CODE]`

---

## 11. Telephony, Audio Recordings & Communication Content

### 11.1 Call Dispositions & Telemetry
- Outbound calls record status (`Connected`, `Busy`, `Failed`, `DND Requested`), duration in seconds, and caller identity. `[VERIFIED IN CODE]`
- Call records dynamically update the parent lead's `lastContactDate`, which feeds directly into rolling fatigue calculations. `[VERIFIED IN CODE]`

### 11.2 Sensitive PII Inspection on Call Notes
- Upon logging a call (`POST /api/calls`), the system inspects the `notes` payload against high-risk regex patterns: `/(credit card|ssn|social security|password)/i`. `[VERIFIED IN CODE]`
- When matching sensitive financial or credential patterns, the call record is tagged with `complianceFlags: ['PII_DETECTED']` and an urgent audit violation is emitted (`COMPLIANCE_VIOLATION`, `severity: 'HIGH'`). `[VERIFIED IN CODE]`

### 11.3 Audio Recordings & Media URI
- Schema includes an optional `recording_url` field (`text`). In the current implementation, this field stores external URIs; raw audio media is not stored directly within the primary PostgreSQL relational table. `[VERIFIED IN CODE]`

---

## 12. Indian Telecom Regulations & TRAI Compliance Engine

The core compliance gateway (`server/compliance.ts` and `server/services/complianceService.ts`) acts as an authoritative, deterministic pre-dispatch evaluation barrier for all telecalling and messaging operations. `[VERIFIED IN CODE]`

```
Outreach Attempt (Call / WhatsApp)
               │
               ▼
   [ 1. Opt-Out / DND? ] ─────────► Block (403: OPT_OUT)
               │
   [ 2. Blocked List? ] ──────────► Block (403: DNC)
               │
   [ 3. 30-Day Snooze? ] ─────────► Block (403: PAUSED)
               │
   [ 4. Channel Restriction? ] ───► Block (403: CHANNEL_RESTRICTED)
               │
   [ 5. Fatigue Cap? ] ───────────► Block (429: FATIGUE_CAPPED)
               │
   [ 6. Frequency Cap? ] ─────────► Block (429: FREQUENCY_CAP)
               │
   [ 7. Quiet Hours (IST)? ] ─────► Block (403: QUIET_HOURS)
               │
               ▼
     [ OUTREACH PERMITTED ]
```

### 12.1 Quiet Hours Enforcement (Telecom Commercial Communications Customer Preference Regulations - TCCCPR)
- **Timezone Anchor:** Evaluated strictly in India Standard Time (`Asia/Kolkata`, UTC+5:30) via `Intl.DateTimeFormat`. `[VERIFIED IN CODE]`
- **Default Regulatory Window:** **19:00 (7:00 PM) to 09:00 (9:00 AM) IST**. `[VERIFIED IN CODE]`
- **Midnight Rollover:** The evaluation math converts times to minutes from midnight (`hours * 60 + minutes`) and correctly handles cross-midnight spans (`startMinutes > endMinutes`). Any outreach attempted during quiet hours is rejected with `HTTP 403 Forbidden (QUIET_HOURS)`. `[VERIFIED IN CODE]`

### 12.2 Contact Frequency Caps & Fatigue Hard-Stop
- **Rolling Window Calculation:** Queries the database for interaction counts within configurable lookback windows (`callCapDays`, default 7 days; `whatsAppCapDays`, default 30 days). `[VERIFIED IN CODE]`
- **Maximum Attempt Thresholds:** If previous interactions meet or exceed configured thresholds (`callCapMaxAttempts`, `whatsAppCapMaxAttempts`), the outreach is blocked with `HTTP 429 Too Many Requests (FREQUENCY_CAP)`. `[VERIFIED IN CODE]`
- **Lead Fatigue Status:** If `lead.fatigueStatus === 'capped'`, communication is blocked immediately with `HTTP 429 (FATIGUE_CAPPED)`. `[VERIFIED IN CODE]`

---

## 13. Consent Management, Opt-Outs & Channel Preferences

### 13.1 Global Opt-Out & DND
- DialPulse enforces an absolute non-overridable stop on leads marked `isOptedOut === true`. `[VERIFIED IN CODE]`
- Opt-out checks occur at Step 1 of compliance evaluation, preceding any call or message dispatch. The policy cannot be bypassed by telecallers. `[VERIFIED IN CODE]`

### 13.2 Temporary 30-Day Pause / Snooze
- Contacts requesting temporary cessation of contact are flagged with `isPaused30Days: true` and an optional `pausedUntil` timestamp. `[VERIFIED IN CODE]`
- The compliance evaluator checks if the current timestamp is less than `pausedUntil`. If still active, outreach is rejected with `HTTP 403 (PAUSED)`. `[VERIFIED IN CODE]`

### 13.3 Channel Preferences
- Contacts can express exclusive channel preferences (`preferredChannel: 'WhatsApp' | 'Call' | 'SMS'`).
- If a contact specifies `WhatsApp` only, any attempt to initiate a voice call is halted with `HTTP 403 (CHANNEL_RESTRICTED)`. `[VERIFIED IN CODE]`

---

## 14. Bulk Ingestion (CSV Imports) & Processing Pipeline

### 14.1 Background Queue Architecture
- Bulk lead imports (`POST /api/leads/import`) are decoupled from the HTTP request loop and queued in BullMQ under the `IMPORT_LEADS` job identifier. `[VERIFIED IN CODE]`
- Returns an immediate `HTTP 202 Accepted` response with the `jobId` for asynchronous polling. `[VERIFIED IN CODE]`

### 14.2 Idempotency & Execution-Time Authorization
- **Execution-Time Authorization:** When the background worker picks up the job (`processImportLeads`), it re-verifies `can(securityContext, 'leads:create')` using the serializable security context snapshot. `[VERIFIED IN CODE]`
- **Phone Idempotency:** The worker verifies phone number uniqueness within the tenant (`and(eq(leads.tenantId, tenantId), eq(leads.phone, rawPhone))`), skipping duplicates to prevent record duplication and contact frequency distortion. `[VERIFIED IN CODE]`

---

## 15. Data Export, Portability & Egress Controls

### 15.1 Authorization & Dual-Confirmation Workflow
- Data export (`GET /api/leads/export`) requires explicit `leads:export` (`EXPORT`) RBAC permission. `[VERIFIED IN CODE]`
- **Dual Confirmation:** If requested without `confirmed=true`, the server halts with `HTTP 202 Accepted` prompting for explicit operator confirmation. `[VERIFIED IN CODE]`
- **Job Offloading:** Approved export requests enqueue a background job (`EXPORT_LEADS`) via BullMQ. `[VERIFIED IN CODE]`

### 15.2 Storage & File URL Egress
- The export processor (`server/jobs/processors/exportLeads.ts`) queries tenant-scoped records and generates an export artifact. `[VERIFIED IN CODE]`
- In the current implementation, file upload is simulated, outputting an artifact URL schema: `https://storage.example.com/exports/${tenantId}/${jobId}.${format}`. `[VERIFIED IN CODE]`
- Every completed export logs an immutable audit event (`DATA_EXPORT_COMPLETED`) containing the exact record count and format. `[VERIFIED IN CODE]`

---

## 16. Artificial Intelligence Architecture & Google Gemini Processing

```
[ Telecaller Audio / Notes ] ──► [ aiService.ts ]
                                       │
                         [ 1. Verify Permission ('ai:use') ]
                         [ 2. Tenant Quota Check (ai_quotas) ]
                                       │
                                       ▼
                             [ aiSanitizer.ts ]
                               • Mask Emails: [EMAIL_MASKED]
                               • Mask Phone:  [PHONE_MASKED]
                                       │
                                       ▼
                          [ Google GenAI SDK Client ]
                               • Provider: @google/genai
                               • Model: gemini-2.5-flash / transcribe
                               • API Key: process.env.GEMINI_API_KEY
                                       │
                                       ▼
                             [ ai_usage Logging ]
                               • Tenant / User / Tokens
```

### 16.1 AI Provider Integration
- **SDK & Provider:** Implemented using the official Google GenAI SDK (`@google/genai` v2.4.0) via `GoogleGenAI` client initialization in `server/services/ai/aiProvider.ts`. `[VERIFIED IN CODE]`
- **Server-Side Secret Isolation:** The Gemini API key (`process.env.GEMINI_API_KEY`) is referenced strictly within server-side Node.js modules, never exported to client Vite bundles. `[VERIFIED IN CODE]`
- **Supported Capabilities:**
  - Audio transcription (`/api/transcribe` via `aiService.transcribeAudio`). `[VERIFIED IN CODE]`
  - Text prompts, telecalling conversation summarization, sentiment classification. `[VERIFIED IN CODE]`

### 16.2 Pre-Processing PII Sanitization (`aiSanitizer.ts`)
- Before dispatching any prompt or conversational transcript to the external Google Gemini API, the text is processed by `sanitizeForAi()` in `server/services/ai/aiSanitizer.ts`: `[VERIFIED IN CODE]`
  - **Email Masking:** Matches RFC email patterns and substitutes them with `[EMAIL_MASKED]`. `[VERIFIED IN CODE]`
  - **Phone Number Masking:** Matches international and domestic phone number formats (7–15 digits, separators) and substitutes them with `[PHONE_MASKED]`. `[VERIFIED IN CODE]`
- *Notice:* Structured audio files passed to `/api/transcribe` are sent directly as base64 buffers to Gemini transcription models and cannot undergo regex pre-masking prior to transcription. `[VERIFIED IN CODE]`

### 16.3 Entitlement & Quota Governance
- Every AI operation verifies the tenant's daily quota in the `ai_quotas` table (`dailyLimit` vs `usedToday`). If the limit is exceeded, the request is halted with `QUOTA_EXCEEDED`. `[VERIFIED IN CODE]`
- Successfully executed operations record token consumption in the `ai_usage` table (`tenantId`, `userId`, `tokensUsed`, `estimatedCost`). `[VERIFIED IN CODE]`

---

## 17. AI Retention, Model Training & Subprocessor Exposure

### 17.1 Zero Model Training Verification
- DialPulse does **not** train custom machine learning models, store training datasets, or fine-tune foundation models on customer tenant data. `[VERIFIED IN CODE]`
- Prompts and audio transcription requests are stateless inference calls to Google Gemini endpoints. `[VERIFIED IN CODE]`

### 17.2 External Subprocessor Data Retention
- API calls to Google Gemini pass through Google Cloud's API infrastructure. Under Google Cloud Vertex AI / Enterprise Gemini terms, customer data is not used to train Google models; however, whether DialPulse uses Google AI Studio developer keys vs Vertex AI Enterprise terms depends on deployment environment configuration (`[VERIFIED IN CONFIG]`, `[LEGAL REVIEW REQUIRED]`).

---

## 18. Customer Support & Internal Inquiries Data

### 18.1 Support Tickets (`tickets` & `ticket_replies` Tables)
- Tracks customer inquiries, internal issue escalations, priority (`Low`, `Medium`, `High`, `Urgent`), and SLA target due dates (`slaDueTime`, automatically initialized to `now + 4 hours`). `[VERIFIED IN CODE]`
- Replies (`ticket_replies`) record sender name, role, plaintext message body, and timestamps. `[VERIFIED IN CODE]`
- All ticket operations are strictly scoped to the tenant boundary (`tenant_id`). `[VERIFIED IN CODE]`

---

## 19. Security Audit Logging & Immutable Event Trails

### 19.1 Audited Event Taxonomy
The audit subsystem (`adapterLogAudit` and `auditService`) records critical business and security events: `[VERIFIED IN CODE]`

| Event Name | Severity | Description |
| :--- | :--- | :--- |
| `USER_LOGIN` | `NORMAL` | Successful operator authentication. Captures user identity, IP address, User-Agent. `[VERIFIED IN CODE]` |
| `USER_LOGOUT` | `NORMAL` | Operator session termination. `[VERIFIED IN CODE]` |
| `SECURITY_ALERT` | `HIGH` / `CRITICAL` | Suspicious activity, including refresh token reuse attempts. `[VERIFIED IN CODE]` |
| `ACCESS_DENIED` | `HIGH` | Authorization failure on sensitive actions (export, bulk edit, user management). `[VERIFIED IN CODE]` |
| `DATA_EXPORT` | `NORMAL` | Data export job enqueued. `[VERIFIED IN CODE]` |
| `DATA_EXPORT_COMPLETED` | `NORMAL` | Asynchronous export file generated. Records count and format. `[VERIFIED IN CODE]` |
| `CSV_BULK_IMPORT` | `NORMAL` | Bulk lead ingestion job completed. Records success/error counts. `[VERIFIED IN CODE]` |
| `LEAD_CREATED` / `UPDATED` / `DELETED` | `NORMAL` | Customer lead lifecycle operations. `[VERIFIED IN CODE]` |
| `CALL_LOGGED` | `NORMAL` | Telephonic call outcome logged. `[VERIFIED IN CODE]` |
| `COMPLIANCE_VIOLATION` | `HIGH` | High-risk pattern detected (e.g., credit card/SSN in call notes). `[VERIFIED IN CODE]` |
| `COMPLIANCE_RULES_UPDATED` | `HIGH` | Modifications to tenant frequency caps or quiet hours. `[VERIFIED IN CODE]` |
| `PLATFORM_IMPERSONATION` | `CRITICAL` | Platform staff assumed tenant user identity. Captures reason and target. `[VERIFIED IN CODE]` |

### 19.2 Access Controls on Audit Logs
- Viewing audit logs (`GET /api/audit-logs`) is strictly restricted to `owner`, `it`, or roles possessing `platform:manage` privileges. Standard telecallers and team leads cannot inspect the audit trail. `[VERIFIED IN CODE]`

---

## 20. Telemetry, Performance Metrics & Observability

### 20.1 Infrastructure & Health Observability
- **Health Endpoints (`/health`, `/api/health`):** Returns uptime status and database connectivity. Unauthenticated to facilitate container health probes (Cloud Run / Kubernetes). `[VERIFIED IN CODE]`
- **Prometheus Metrics (`/metrics`):** Exposes runtime latency histograms and HTTP error counts. `[VERIFIED IN CODE]`
- **Telemetry Middleware:** Attaches a canonical security context with a unique `requestId` (UUID) to every request for distributed tracing across logs. `[VERIFIED IN CODE]`

---

## 21. Automated Bot, Web Crawler & Scraping Agent Blocking

### 21.1 AI Crawler Blocking Middleware
To protect customer data and application resources from automated scraping by generative AI indexing agents, DialPulse enforces an active User-Agent filtering firewall before any API route or static asset is processed: `[VERIFIED IN CODE]`

- **Blocked Bot Signatures:** Evaluates incoming `User-Agent` against centralized signatures, including:
  - `GPTBot`, `ChatGPT-User`, `Google-Extended`, `ClaudeBot`, `Claude-Web`, `PerplexityBot`, `Bytespider`, `CCBot`, `Diffbot`, `FacebookBot`, `Amazonbot`. `[VERIFIED IN CODE]`
- **Action:** Matched agents receive an immediate `HTTP 403 Forbidden` response rendering a dedicated anti-scraping policy notice. `[VERIFIED IN CODE]`
- **Exemptions:** `/robots.txt` is exempted so compliant search engines can read the crawler exclusion directives. `[VERIFIED IN CODE]`
- **Telemetry (`/api/crawler-telemetry`):** Blocks are stored in an in-memory ring buffer (up to 1,000 entries) accessible exclusively by `owner`, `cto`, and `it` roles. `[VERIFIED IN CODE]`

---

## 22. Data Retention, Archival & Deletion Mechanics

### 22.1 Current Deletion Mechanics
- **Lead Deletion (`DELETE /api/leads/:id`):** Hard delete executed directly via `db.delete(schema.leads).where(eq(schema.leads.id, id))`. No soft-delete column exists in the relational table schema. `[VERIFIED IN CODE]`
- **Session Revocation:** Session records set `revoked_at` timestamp with reason code (`logout`, `rotated`, `user_revoked`). `[VERIFIED IN CODE]`
- **Database Reset Route (`/api/reset-data`):** Returns `HTTP 501 Not Implemented` with an explicit notice that destructive database wipes are disabled in the application runtime. `[VERIFIED IN CODE]`

### 22.2 Absence of Automated Purge Jobs
- *Finding:* The codebase does not currently contain automated scheduled cron jobs or database triggers to purge historical call logs, chat messages, or audit log records after a fixed retention period (e.g., 90 days or 1 year). Data persists indefinitely until manually deleted. `[VERIFIED IN CODE]`

---

## 23. Cryptographic Controls & Security-in-Transit

### 23.1 Encryption in Transit
- **TLS Termination:** Assumes TLS termination at the reverse proxy / Cloud Run load balancer. The application trusts reverse proxy headers (`app.set('trust proxy', 1)`). `[VERIFIED IN CODE]`
- **Secure Cookies:** Cookies enforce `secure: true` when `process.env.NODE_ENV === 'production'`. `[VERIFIED IN CODE]`

### 23.2 Cryptographic Primitives in Use
- **Password Hashing:** `bcryptjs` (Blowfish-based salt & hash, 10 rounds). `[VERIFIED IN CODE]`
- **Access Tokens:** HMAC-SHA256 (`jsonwebtoken`). `[VERIFIED IN CODE]`
- **Refresh Token Hashing:** SHA-256 (`crypto.createHash('sha256')`). `[VERIFIED IN CODE]`
- **Entropy Generation:** Node.js native `crypto.randomUUID()` and `crypto.randomBytes(32)`. `[VERIFIED IN CODE]`
- **Data at Rest:** Database volume encryption is delegated to the managed PostgreSQL provider (e.g., Google Cloud SQL / AWS RDS AES-256). `[UNKNOWN]`

---

## 24. Perimeter Security, CORS & Network-Layer Hardening

### 24.1 HTTP Security Headers (Helmet)
- **Content Security Policy (CSP):** `[VERIFIED IN CODE]`
  - `defaultSrc: ["'self'"]`
  - `scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"]`
  - `styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"]`
  - `fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"]`
  - `imgSrc: ["'self'", "data:", "https:", "blob:"]`
  - `connectSrc: ["'self'", "https:", "ws:", "wss:"]`
  - `frameAncestors: ["'self'", "https://ai.studio", "https://*.google.com"]`
- **Clickjacking Protection:** X-Frame-Options is adjusted to allow controlled embedding within authorized development harnesses (`ai.studio`), while CSP `frameAncestors` restricts framing in production. `[VERIFIED IN CODE]`

### 24.2 Cross-Origin Resource Sharing (CORS)
- Origin reflection is strictly limited to authorized origins: `[VERIFIED IN CODE]`
  - `http://localhost:3000`, `http://localhost:5173`, `http://127.0.0.1:3000`, `https://ai.studio`, and domain suffixes `.google.com` or `.run.app`.
- Arbitrary origins requesting credentials (`credentials: true`) are rejected by callback validation. `[VERIFIED IN CODE]`

---

## 25. Third-Party Subprocessors & External Integrations

Based on package manifests (`package.json`), environment declarations (`.env.example`), and API client integrations:

| Subprocessor | Category | Purpose | Data Transferred | Location / Hosting |
| :--- | :--- | :--- | :--- | :--- |
| **Google Cloud (Vertex AI / Gemini)** | AI Inference | Audio transcription, lead conversation summarization | Masked prompt text (`[PHONE_MASKED]`, `[EMAIL_MASKED]`), Base64 audio buffers | US / Global Cloud Regions `[VERIFIED IN CODE]` |
| **Meta / WhatsApp Cloud API** | Messaging | Two-way WhatsApp lead messaging | Lead telephone numbers, message content | US / Meta Data Centers `[VERIFIED IN DOCUMENTATION]` |
| **Google Cloud Platform (Cloud Run / SQL)** | Cloud Hosting | Application container execution, managed PostgreSQL storage | All tenant databases, application logs | Configurable (e.g., `asia-south1` Mumbai) `[VERIFIED IN CONFIG]` |
| **Redis / Upstash** | In-Memory Cache | Distributed rate limiting, BullMQ background job queues | Hashed session keys, background job payloads | Local / Cloud `[VERIFIED IN CODE]` |

---

## 26. Disaster Recovery, Backups & Business Continuity

### 26.1 Application-Level Backup Decoupling
- In earlier iterations, the CRM contained an experimental application-layer JSON snapshot endpoint (`/api/backups`). `[HISTORICAL]`
- In the current hardened architecture, `/api/backups` and `/api/backups/:id/restore` return `HTTP 501 Not Implemented`. `[VERIFIED IN CODE]`
- Rationale: Application identities are deprived of database backup and restoration capabilities to enforce separation of duties; backups are managed strictly at the cloud infrastructure layer via automated PostgreSQL snapshots (`pg_dump` / managed Cloud SQL automated daily backups). Documented in `/docs/disaster-recovery.md`. `[VERIFIED IN DOCUMENTATION]`

---

## Legal & Business Review Questions

*The following questions highlight architectural decision points and data handling practices that require explicit business, legal, and compliance determination prior to publishing customer-facing Privacy Policies, Terms of Service, and Data Processing Agreements (DPAs).*

### 1. Regulatory Jurisdiction & Cross-Border Data Transfers
- **Question:** Under the **Digital Personal Data Protection Act, 2023 (India DPDP Act)** and **GDPR**, are customer personal data (leads, telecaller audio, customer records) restricted to Indian data residency (e.g., GCP `asia-south1` Mumbai)?
- **Implication:** The Google GenAI SDK calls Google Gemini endpoints which may route inference requests to data centers outside India. Does our enterprise contract with Google include Standard Contractual Clauses (SCCs) or Indian data sovereignty guarantees?

### 2. TRAI Telecom Commercial Communications Regulations (TCCCPR)
- **Question:** Does DialPulse plan to integrate directly with telecommunications access providers via the **Distributed Ledger Technology (DLT) / National Do Not Call (NDNC) registry** API for real-time scrub of telemarketing lists, or does the platform rely solely on tenant-configured compliance rules and manual opt-outs?
- **Implication:** If DialPulse is classified as a Telemarketer or Principal Entity under TRAI regulations, direct DLT registration and scrubbing logs may be legally required.

### 3. Audio Recording Consent & Wiretapping Laws
- **Question:** In Indian telecommunications law and comparative multi-party consent jurisdictions, what mandatory interactive voice response (IVR) disclosure is required prior to capturing call recordings?
- **Implication:** The CRM contains the `recording_url` schema. If telecallers initiate calls without automated recording disclosures ("This call may be recorded for quality and compliance purposes"), the tenant and platform could face legal exposure under wiretapping and telecommunications privacy statutes.

### 4. AI Subprocessor Agreements & Zero-Data-Retention (ZDR)
- **Question:** Does DialPulse hold a Google Cloud Vertex AI Enterprise agreement that contractually guarantees zero prompt retention and explicitly prohibits Google from using customer conversational prompts or audio recordings for foundation model training?
- **Implication:** Using standard consumer Google AI Studio developer keys carries terms that permit Google to use inputs for product improvement. A Business Associate Agreement (BAA) or Vertex AI Enterprise agreement must be confirmed.

### 5. Data Subject Rights (Access, Correction, Erasure) Workflow
- **Question:** How should DialPulse handle Data Subject Requests (DSRs) from customer leads requesting erasure ("Right to be Forgotten")?
- **Implication:** While `DELETE /api/leads/:id` permanently deletes the lead record, interaction records in `calls` and `messages` maintain foreign keys. If a lead is deleted, do historical call logs and message texts retain customer telephone numbers, or should they be automatically anonymized / cascade-deleted?

### 6. Maximum Data Retention Periods
- **Question:** What are the contractual and statutory data retention limits for:
  - Security audit logs (`audit_logs`)? (Recommended: 365 days)
  - Inactive user sessions (`sessions`)? (Recommended: 30 days after revocation)
  - Historical call outcome telemetry and message records?
- **Implication:** Without automated background purging, customer data accumulates indefinitely, increasing liability under privacy principles of data minimization and storage limitation.

### 7. WhatsApp Business API / Meta Business Terms
- **Question:** Under Meta's Business Messaging Terms, does DialPulse operate as a Tech Provider (ISV) or an On-Behalf-Of Solution Provider?
- **Implication:** Dictates whether DialPulse or the individual tenant is the legal Controller of WhatsApp opt-in consent records and template message approvals.

### 8. Platform Staff Impersonation Customer Notification
- **Question:** Should tenant administrators receive real-time email notifications whenever DialPulse platform support staff initiate an impersonation session into their tenant workspace?
- **Implication:** Enterprise customers typically demand advance consent or real-time alerts when SaaS vendor personnel access their production database for troubleshooting.
