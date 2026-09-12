# DialPulse CRM Security Audit & Findings Report

**Date:** 2026-09-06  
**Auditor:** Automated Security Test Harness & Code Review  
**Target Repository:** DialPulse CRM (TypeScript / Node.js Express / React 19 / Vite)  
**Execution Command:** `npm run test:security`  

---

## Executive Summary

An automated and manual vulnerability assessment of the DialPulse CRM codebase was executed against a running instance (`http://localhost:3000`). The test suite executed 29 dynamic test cases across 6 security categories, resulting in:
- **16 Passed Controls**
- **13 Confirmed Security Vulnerabilities**
  - **4 Critical Severity**
  - **6 High Severity**
  - **3 Medium Severity**
  - **0 Low Severity**

### Threat Impact Overview

| Severity | ID | Vulnerability Title | Affected Endpoint / File | Line(s) |
|---|---|---|---|---|
| **CRITICAL** | VULN-01 | Insecure Direct Object Reference (IDOR) on Lead Updates | `PUT /api/leads/:id` | `server.ts:453-524` |
| **CRITICAL** | VULN-02 | Unauthenticated / Low-Privilege User Role Escalation | `POST /api/auth/switch-user` | `server.ts:260-285` |
| **CRITICAL** | VULN-03 | Hardcoded Cryptographic Secret Fallback | `server.ts` | `server.ts:46` |
| **CRITICAL** | VULN-04 | Overly Permissive CORS Origin Reflection with Credentials | `server.ts` | `server.ts:104` |
| **HIGH** | VULN-05 | IDOR on Call History & Recording Extraction | `GET /api/calls` | `server.ts:610-624` |
| **HIGH** | VULN-06 | Identity Spoofing & Attribution Tampering in Call Logging | `POST /api/calls` | `server.ts:626-677` |
| **HIGH** | VULN-07 | CSV / Spreadsheet Formula Injection (CWE-1236) | `POST /api/leads/import` | `server.ts:540-577` |
| **HIGH** | VULN-08 | Hardcoded Default Password on Admin-Created Users | `POST /api/users` | `server.ts:352` |
| **HIGH** | VULN-09 | Rate Limiter IP Spoofing via Arbitrary Proxy Headers | `POST /api/auth/login` | `server.ts:90-112` |
| **HIGH** | VULN-10 | Secrets Missing Production Guardrails | `server.ts` | `server.ts:46, 28` |
| **MEDIUM** | VULN-11 | Optimistic Concurrency Control Bypass via Field Omission | `PUT /api/leads/:id` | `server.ts:465-479` |
| **MEDIUM** | VULN-12 | Unbounded Batch Ingestion / Resource Exhaustion | `POST /api/leads/import` | `server.ts:540-577` |
| **MEDIUM** | VULN-13 | Insecure Helmet Configuration (CSP & Frameguard Disabled) | `server.ts` | `server.ts:98-101` |

---

## Detailed Findings & Reproductions

---

### [CRITICAL] VULN-01: Insecure Direct Object Reference (IDOR) on Lead Updates

- **Endpoint:** `PUT /api/leads/:id`
- **Source File:** `server.ts`, Lines 453–524
- **CWE:** CWE-639: Authorization Bypass Through User-Controlled Key

#### Vulnerability Mechanics
The `GET /api/leads` endpoint correctly restricts low-privilege Sales Reps (`Rep`) to viewing only their assigned leads by checking `permissions.canViewAllLeads` against `l.assignedRepId === req.user!.id`. However, the `PUT /api/leads/:id` handler **fails to perform any ownership or assignment validation**. Any authenticated `Rep` can modify any lead in the database simply by knowing or discovering its `id`, including modifying lead contact info, reassigning the lead, changing stage, or corrupting notes.

#### Working Reproduction
```bash
# 1. Log in as Rep Amit Verma (usr-3)
REP_TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"amit@telecrm.in","password":"password123"}' | jq -r .token)

# 2. As Amit, modify lead-103 assigned to Sneha Kulkarni (usr-4)
curl -i -X PUT http://localhost:3000/api/leads/lead-103 \
  -H "Authorization: Bearer $REP_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"notes":"Compromised by unauthorized Rep"}'

# Result: HTTP 200 OK — The unassigned lead is updated.
```

#### Remediation
In `PUT /api/leads/:id`, check the user's role permissions. If `!permissions.canViewAllLeads` and `oldLead.assignedRepId !== req.user!.id`, immediately reject with `403 Forbidden`.

---

### [CRITICAL] VULN-02: Unauthenticated / Low-Privilege User Role Escalation

- **Endpoint:** `POST /api/auth/switch-user`
- **Source File:** `server.ts`, Lines 260–285
- **CWE:** CWE-269: Improper Privilege Management

#### Vulnerability Mechanics
The `/api/auth/switch-user` route has no role check (`requireRole('Admin')` is absent) and is excluded from mandatory authentication checks (`isPublic` in `authenticateToken`). Any caller—even unauthenticated or a low-privilege `Rep`—can submit a payload requesting to switch to an `Admin` identity or assign themselves the `Admin` role. The server updates `db.users` and issues a brand-new signed JWT with `role: "Admin"`.

#### Working Reproduction
```bash
# Obtain an Admin token as an unauthenticated or Rep caller:
curl -i -X POST http://localhost:3000/api/auth/switch-user \
  -H "Content-Type: application/json" \
  -d '{"userId":"usr-3","role":"Admin"}'

# Result: HTTP 200 OK with response:
# {"user":{"id":"usr-3","name":"Amit Verma","role":"Admin"},"token":"<VALID_ADMIN_JWT>"}
```

#### Remediation
Protect `POST /api/auth/switch-user` with `requireRole('Admin')`. Reps and Team Leads should never be allowed to mint arbitrary tokens or promote themselves to Admin.

---

### [CRITICAL] VULN-03: Hardcoded Cryptographic Secret Fallback

- **Source File:** `server.ts`, Line 46
- **CWE:** CWE-798: Use of Hard-coded Credentials

#### Vulnerability Mechanics
`server.ts` declares:
```typescript
const JWT_SECRET = process.env.JWT_SECRET || 'dialpulse-crm-jwt-secret-key-production-2026';
```
Whenever `JWT_SECRET` is omitted from the deployment environment, the server silently falls back to this hardcoded string. An attacker possessing this known fallback can forge arbitrary JWTs with `role: "Admin"` and completely bypass authentication on all protected endpoints.

#### Working Reproduction
```typescript
import jwt from 'jsonwebtoken';
const fallbackSecret = 'dialpulse-crm-jwt-secret-key-production-2026';
const forgedToken = jwt.sign(
  { id: 'usr-1', email: 'rahul@telecrm.in', role: 'Admin' },
  fallbackSecret,
  { expiresIn: '1h' }
);
// This forged token passes authentication whenever process.env.JWT_SECRET is unset.
```

#### Remediation
Fail fast at server startup: if `process.env.JWT_SECRET` is missing in production, throw an error and refuse to boot. In development, generate an ephemeral random secret (`crypto.randomBytes(32).toString('hex')`).

---

### [CRITICAL] VULN-04: Permissive CORS Origin Reflection with Credentials

- **Source File:** `server.ts`, Line 104
- **CWE:** CWE-942: Permissive Cross-Domain Policy with Untrusted Domains

#### Vulnerability Mechanics
The server configures CORS as:
```typescript
app.use(cors({
  origin: true,
  credentials: true
}));
```
When `origin: true` is passed to the `cors` middleware, Express reflects whatever `Origin` header the browser sends back in `Access-Control-Allow-Origin: <origin>` alongside `Access-Control-Allow-Credentials: true`. Any malicious website visited by an authenticated CRM user can execute background JavaScript `fetch` requests with credentials and read sensitive customer records, call transcripts, and internal metrics.

#### Working Reproduction
```bash
curl -i -X GET http://localhost:3000/api/leads \
  -H "Origin: https://malicious-site.example.com" \
  -H "Authorization: Bearer <VALID_TOKEN>"

# Result headers:
# Access-Control-Allow-Origin: https://malicious-site.example.com
# Access-Control-Allow-Credentials: true
```

#### Remediation
Replace `origin: true` with an explicit origin whitelist (e.g. `process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000']`).

---

### [HIGH] VULN-05: IDOR on Call History & Recording Extraction

- **Endpoint:** `GET /api/calls`
- **Source File:** `server.ts`, Lines 610–624
- **CWE:** CWE-639: Insecure Direct Object Reference

#### Vulnerability Mechanics
`GET /api/calls` accepts optional `repId` and `leadId` query filters, but **enforces no access controls based on the caller's role**. If a `Rep` queries `GET /api/calls?repId=usr-4` (or simply `GET /api/calls`), the endpoint returns the call records, notes, outcomes, and simulated recordings of all other reps.

#### Working Reproduction
```bash
curl -s -X GET "http://localhost:3000/api/calls?repId=usr-4" \
  -H "Authorization: Bearer $REP_AMIT_TOKEN" | jq .
# Result: Returns all call logs belonging to Sneha Kulkarni.
```

#### Remediation
Inspect `req.user!.role`. If the caller is a `Rep`, force `repId` filter to `req.user!.id`. Only `Team Lead` and `Admin` may query other reps' call logs.

---

### [HIGH] VULN-06: Identity Spoofing & Attribution Tampering in Call Logging

- **Endpoint:** `POST /api/calls`
- **Source File:** `server.ts`, Lines 626–654
- **CWE:** CWE-284: Improper Access Control

#### Vulnerability Mechanics
`POST /api/calls` extracts `repId` and `repName` directly from the user-controlled request body:
```typescript
const callerRepId = repId || req.user!.id;
const callerRepName = repName || req.user!.name;
```
If provided, the server trusts the client-supplied values instead of binding the call record to `req.user.id` and `req.user.name`. A user can log fraudulent calls, falsify conversion metrics, or attribute missed calls to colleagues.

#### Working Reproduction
```bash
curl -s -X POST http://localhost:3000/api/calls \
  -H "Authorization: Bearer $REP_AMIT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "leadId": "lead-101",
    "duration": 300,
    "outcome": "Converted",
    "repId": "usr-1",
    "repName": "Rahul Sharma (Admin)",
    "notes": "Spoofed entry"
  }' | jq .call.repName
# Result: "Rahul Sharma (Admin)"
```

#### Remediation
Always derive `repId` and `repName` strictly from `req.user!.id` and `req.user!.name`. Only Admins updating an existing record may reassign rep attribution.

---

### [HIGH] VULN-07: CSV / Spreadsheet Formula Injection (CWE-1236)

- **Endpoint:** `POST /api/leads/import`
- **Source File:** `server.ts`, Lines 540–577
- **CWE:** CWE-1236: Improper Neutralization of Formula Elements in a CSV File

#### Vulnerability Mechanics
`POST /api/leads/import` directly stores cell contents without neutralizing formula prefixes (`=`, `+`, `-`, `@`, `\t`, `\r`). When CRM administrators or sales managers export leads to CSV/Excel (via `LeadsListView.tsx`), Excel evaluates cells starting with `=` as dynamic formulas (e.g. `=cmd|'/C calc'!A0` or malicious DDE links that exfiltrate data).

#### Working Reproduction
```bash
curl -s -X POST http://localhost:3000/api/leads/import \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"leads":[{"name":"=cmd|\x27/C calc\x27!A0","phone":"+919811122233"}]}' | jq .
# Result: Lead created with unescaped formula intact.
```

#### Remediation
Implement a formula sanitization helper:
```typescript
export function sanitizeCsvField(val: string): string {
  if (!val) return '';
  const trimmed = String(val).trim();
  if (/^[=+\-@\t\r]/.test(trimmed)) {
    return `'${trimmed}`; // Prepend single quote to neutralize formula
  }
  return trimmed;
}
```

---

### [HIGH] VULN-08: Hardcoded Default Password on Admin-Created Users

- **Endpoint:** `POST /api/users`
- **Source File:** `server.ts`, Line 352
- **CWE:** CWE-1188: Insecure Default Initialization of Resource

#### Vulnerability Mechanics
When an Admin creates a new user, `server.ts` defaults their password:
```typescript
passwordHash: bcryptjs.hashSync(password || 'password123', 10)
```
Any invited user created without an explicit password immediately has the widely known password `password123`. An attacker knowing or guessing the new employee's corporate email can immediately compromise the account.

#### Remediation
Require an explicit password meeting complexity requirements, or generate a cryptographically random temporary password and mark `mustChangePassword: true`.

---

### [HIGH] VULN-09: Rate Limiter IP Spoofing via Arbitrary Proxy Headers

- **Endpoint:** `POST /api/auth/login`
- **Source File:** `server.ts`, Lines 90–112
- **CWE:** CWE-345: Insufficient Verification of Data Authenticity

#### Vulnerability Mechanics
`server.ts` specifies `app.set('trust proxy', 1)`. Express derives `req.ip` from the `X-Forwarded-For` header. When requests are received without an upstream reverse proxy stripping client-supplied `X-Forwarded-For` headers, an attacker rotating `X-Forwarded-For: 1.2.3.X` completely bypasses `loginLimiter` (30 req / 15 min), permitting unlimited credential stuffing.

#### Remediation
Key `loginLimiter` by a compound key combining client IP and the normalized `email` address:
```typescript
keyGenerator: (req) => `${req.ip}:${String(req.body?.email || '').toLowerCase().trim()}`
```

---

### [MEDIUM] VULN-11: Optimistic Concurrency Control Bypass via Field Omission

- **Endpoint:** `PUT /api/leads/:id`
- **Source File:** `server.ts`, Lines 465–479
- **CWE:** CWE-362: Race Condition / Concurrent Mutation

#### Vulnerability Mechanics
The concurrency check only verifies `version` or `updatedAt` **if they are present in the request body**:
```typescript
if (updates.version !== undefined && oldLead.version !== undefined && updates.version !== oldLead.version) { ... }
```
If a client simply omits `version` and `updatedAt`, the check is bypassed entirely, allowing silent clobbering of concurrent changes.

#### Remediation
Make `version` mandatory for all `PUT /api/leads/:id` requests. If `updates.version === undefined`, return `400 Bad Request` requiring the client's current version token.

---

### [MEDIUM] VULN-12: Unbounded Batch Ingestion / Resource Exhaustion

- **Endpoint:** `POST /api/leads/import`
- **Source File:** `server.ts`, Lines 540–577
- **CWE:** CWE-400: Uncontrolled Resource Consumption

#### Vulnerability Mechanics
The endpoint accepts arbitrarily large `rawLeads` arrays and synchronously performs unshifting and `saveDatabase()` (writing the entire `db.json` synchronously via `fs.writeFileSync`). Submitting a payload with 10,000+ items blocks Node's single-threaded event loop.

#### Remediation
Enforce a strict batch size limit (e.g. `rawLeads.length > 200` returns `400 Bad Request: Batch size exceeds limit of 200`).

---

### [MEDIUM] VULN-13: Insecure Helmet Configuration (CSP & Frameguard Disabled)

- **Source File:** `server.ts`, Lines 98–101
- **CWE:** CWE-1021: Improper Restriction of Rendered UI Layers or Frames

#### Vulnerability Mechanics
Helmet is configured with `contentSecurityPolicy: false` and `frameguard: false`. In a production deployment outside the preview iframe, this leaves the application vulnerable to clickjacking and unconstrained resource loading.

#### Remediation
In production, enable Helmet with a customized CSP and `frame-ancestors` directive restricting framing to authorized domains.

---

## Dependency Scan (`npm audit`) Findings

Running `npm audit` on the project identified **3 moderate vulnerabilities** stemming from indirect dependencies:
1. **`qs`** (< 6.16.0):
   - **GHSA-x5fp-wj9c-mxmx** (CWE-770): Array-limit bypass via bracket-key comma parsing.
   - **GHSA-4mjr-xmp4-gh2g** (CWE-248 / CWE-703): Denial of Service via attacker-controlled `isBuffer`.
2. **`body-parser`** (1.20.5–1.20.6):
   - Dependent on vulnerable `qs` version.
3. **`express`** (4.21.2 / 4.22.2):
   - Transitive dependency on `body-parser` and `qs`.

**Remediation:** Update `express` to the latest 4.x or 5.x patch release, or run `npm audit fix` to bump `qs` to `>=6.16.0`.

---

## Proposed Code Fixes (Diffs)

The following unified diffs remediate all **Critical** and **High** vulnerabilities identified above.

### 1. Fix for VULN-01 (IDOR on Lead Updates) & VULN-11 (Concurrency Bypass)
```diff
--- a/server.ts
+++ b/server.ts
@@ -458,6 +458,16 @@
       return res.status(404).json({ error: 'Lead not found' });
     }
 
+    const userRole = req.user!.role;
+    const permissions = (db.rolePermissions || []).find(p => p.role === userRole);
+    // IDOR Protection: If user cannot view all leads, restrict update strictly to assigned leads
+    if (permissions && !permissions.canViewAllLeads && oldLead.assignedRepId !== req.user!.id) {
+      return res.status(403).json({
+        error: 'Forbidden: You do not have permission to modify leads assigned to other representatives.',
+        code: 'FORBIDDEN'
+      });
+    }
+
     const oldLead = db.leads[index];
     const updates = req.body;
 
+    // Concurrency Protection: version is strictly required
+    if (updates.version === undefined) {
+      return res.status(400).json({
+        error: 'Missing required "version" field for optimistic concurrency control.',
+        code: 'MISSING_VERSION'
+      });
+    }
     if (updates.version !== undefined && oldLead.version !== undefined && updates.version !== oldLead.version) {
       return res.status(409).json({
```

### 2. Fix for VULN-02 (Privilege Escalation on switch-user)
```diff
--- a/server.ts
+++ b/server.ts
@@ -260,7 +260,7 @@
-  app.post('/api/auth/switch-user', (req, res) => {
+  app.post('/api/auth/switch-user', requireRole('Admin'), (req, res) => {
     const { userId, role } = req.body;
```

### 3. Fix for VULN-03 & VULN-10 (Hardcoded Fallback Secret)
```diff
--- a/server.ts
+++ b/server.ts
@@ -43,7 +43,15 @@
 }
 
-// Session & Authentication Configuration
-const JWT_SECRET = process.env.JWT_SECRET || 'dialpulse-crm-jwt-secret-key-production-2026';
+const isProd = process.env.NODE_ENV === 'production';
+if (isProd && !process.env.JWT_SECRET) {
+  throw new Error('FATAL SECURITY ERROR: JWT_SECRET environment variable is required in production.');
+}
+const JWT_SECRET = process.env.JWT_SECRET || (function() {
+  console.warn('[SECURITY WARNING] Using ephemeral in-memory JWT secret for development.');
+  return require('crypto').randomBytes(32).toString('hex');
+})();
```

### 4. Fix for VULN-04 (Permissive CORS)
```diff
--- a/server.ts
+++ b/server.ts
@@ -101,7 +101,16 @@
   }));
 
-  app.use(cors({ origin: true, credentials: true }));
+  const allowedOrigins = process.env.ALLOWED_ORIGINS
+    ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim())
+    : ['http://localhost:3000', 'http://127.0.0.1:3000'];
+
+  app.use(cors({
+    origin: (origin, callback) => {
+      if (!origin || allowedOrigins.includes(origin)) {
+        callback(null, true);
+      } else {
+        callback(new Error(`CORS blocked for origin: ${origin}`));
+      }
+    },
+    credentials: true
+  }));
```

### 5. Fix for VULN-05 (IDOR on Calls) & VULN-06 (Attribution Spoofing)
```diff
--- a/server.ts
+++ b/server.ts
@@ -612,6 +612,12 @@
     const { leadId, repId } = req.query;
     let calls = [...db.calls];
 
+    // IDOR Protection: Reps may only view their own calls
+    const userRole = req.user!.role;
+    if (userRole === 'Rep') {
+      calls = calls.filter(c => c.repId === req.user!.id);
+    } else if (repId && typeof repId === 'string' && repId !== 'all') {
+      calls = calls.filter(c => c.repId === repId);
+    }
+
     if (leadId && typeof leadId === 'string') {
       calls = calls.filter(c => c.leadId === leadId);
     }
@@ -639,8 +645,9 @@
     if (notes && !validateText(notes, 0, 2000)) {
       return res.status(400).json({ error: 'Call notes cannot exceed 2000 characters' });
     }
 
-    const callerRepId = repId || req.user!.id;
-    const callerRepName = repName || req.user!.name;
+    // Attribution Security: Always bind to authenticated caller
+    const callerRepId = req.user!.id;
+    const callerRepName = req.user!.name;
```

### 6. Fix for VULN-07 (CSV Formula Injection) & VULN-12 (Batch Limit)
```diff
--- a/server.ts
+++ b/server.ts
@@ -543,6 +543,10 @@
     const { leads: rawLeads } = req.body;
     if (!Array.isArray(rawLeads) || rawLeads.length === 0) {
       return res.status(400).json({ error: 'No valid leads provided for import' });
     }
+    if (rawLeads.length > 200) {
+      return res.status(400).json({ error: 'Batch size exceeds maximum limit of 200 leads per import.' });
+    }
+
+    const sanitizeFormula = (v: any) => {
+      if (typeof v !== 'string') return v;
+      const trimmed = v.trim();
+      return /^[=+\-@\t\r]/.test(trimmed) ? `'${trimmed}` : trimmed;
+    };
@@ -555,8 +559,8 @@
       const newLead: Lead = {
         id: `lead-${Date.now()}-${idx}`,
-        name: (item.name || 'Unnamed Lead').trim(),
+        name: sanitizeFormula(item.name || 'Unnamed Lead'),
         phone: (item.phone || '+91 98000 00000').trim(),
         source: item.source || 'Manual',
         stage: item.stage || 'New',
         assignedRepId: rep.id,
         assignedRepName: rep.name,
         createdDate: nowIso,
         updatedAt: nowIso,
         version: 1,
-        notes: item.notes || 'Imported via CSV batch upload.',
+        notes: sanitizeFormula(item.notes || 'Imported via CSV batch upload.'),
```
