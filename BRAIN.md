Last generated: 2026-09-12. Verify Section 6 against live code before relying on it if this file is more than a few weeks old.

## 1. What this project is

DialPulse CRM is a React/Node.js Customer Relationship Management application built for telecalling and sales teams (with Indian SMBs primarily in mind). It solves the problem of disconnected sales tools by unifying lead management, an interactive Kanban pipeline, an integrated calling console, WhatsApp messaging, and performance leaderboards into a single interface. Critically, it prioritizes Trust & Compliance, automating regulatory guardrails like quiet hours and contact frequency caps directly within the workflow.

## 2. Tech stack (exact versions)

*   **Frontend Framework:** React 19.0.1
*   **Build Tool:** Vite 6.2.3, ESBuild 0.25.0
*   **Styling & Animation:** Tailwind CSS 4.1.14 (via `@tailwindcss/vite`), `motion` 12.23.24, `lucide-react` 0.546.0
*   **Data Visualization:** `recharts` 3.10.1
*   **Backend Framework:** Express 4.21.2 (via Node.js with `tsx`)
*   **Data Layer:** Local file-backed JSON (`data/db.json`). *Wired up and strictly used in place of an external RDBMS.*
*   **Security & Middleware:** `bcryptjs` 3.0.3, `jsonwebtoken` 9.0.3, `helmet` 8.3.0, `cors` 2.8.6, `express-rate-limit` 8.7.0. *All actively wired up in `server.ts`.*
*   **AI SDKs:** `@google/genai` 2.4.0. *Installed and referenced for transcript generation, but currently falls back to simulated transcripts if `GEMINI_API_KEY` is not present in the environment.*

## 3. Architecture, in plain terms

*   **Process Model:** Single process architecture. The frontend is built by Vite, and the backend is bundled by ESBuild. Both run concurrently during development via `tsx server.ts` or as a unified app via `node dist/server.cjs` in production.
*   **Data Persistence:** The entire database is a single, in-memory JSON object that is synchronously flushed to disk (`data/db.json`) via `saveDatabase()` on *every* write operation. **CRITICAL:** There is no file-level write locking. Concurrency is handled naively via an optimistic `version` check on individual Lead updates (`updates.version !== oldLead.version`). Any new concurrent-write fixes must account for the synchronous nature of `saveDatabase()`, rather than just adding a new database field.
*   **Deployment Target:** Assumes a standard Node.js environment (e.g., Cloud Run, Railway, or VPS). The Express app is configured to trust proxies (`app.set('trust proxy', 1)`), indicating it's expected to sit behind an Nginx/Load Balancer reverse proxy.

## 4. Data model map

Per `src/types.ts`:

*   **`User`**: Represents a system user. 
    *   *Key fields:* `role` (6-tier model), `teamId`, `passwordHash`.
    *   *Enforcement:* Strictly enforced server-side. Passwords are hashed and checked via JWTs. `teamId` is verified during scope checks.
*   **`RolePermission`**: Maps roles to scopes (`SELF`, `TEAM`, `ALL_TEAMS`, `COMPANY`) and actions (`VIEW`, `EDIT`, etc.).
    *   *Enforcement:* Actively checked via the `authorize(req.user, action, scope)` function across all core routes in `server.ts`. This is not decorative.
*   **`Lead`**: The core customer entity.
    *   *Key fields:* `assignedRepId`, `teamId`, `version`, `fatigueStatus`.
    *   *Enforcement:* `teamId` and `assignedRepId` are actively used to filter lists and block unauthorized edits based on the user's role scope. `version` is checked for optimistic concurrency during PUT requests.
*   **`Call` & `Message`**: Logs for interactions.
    *   *Key fields:* `outcome`, `duration`, `deliveryStatus`.
    *   *Enforcement:* Saved to the DB, but their primary downstream effect is being counted dynamically by `calculateReports()` and the compliance checks.
*   **`ContactFrequencyRules`**: System-wide compliance rules.
    *   *Key fields:* `callCapMaxAttempts`, `quietHoursEnabled`.
    *   *Enforcement:* Strictly enforced server-side in `server.ts` before allowing Call or WhatsApp actions via the `validateLeadCommunicationCompliance` function.

## 5. Module-by-module status

| Module name | What it does | Status | Key files |
| :--- | :--- | :--- | :--- |
| **Leads/Pipeline** | Kanban view, lead creation, updates | Fully implemented & enforced server-side | `server.ts`, `LeadsListView.tsx`, `KanbanBoard.tsx` |
| **Calling** | Initiates calls, logs outcomes | Fully implemented (UI built, compliance enforced server-side). Audio/transcripts are simulated if no API key. | `server.ts`, `CallConsoleModal.tsx`, `server/compliance.ts` |
| **WhatsApp messaging** | Sends predefined templates/messages | Fully implemented & enforced server-side | `server.ts` |
| **Dashboard/Reporting** | Live stats, charts, conversions | Fully implemented (Stats computed live via `calculateReports()`) | `server/db.ts`, `DashboardView.tsx`, `ReportsView.tsx` |
| **Leaderboard** | Ranks reps by calls, conversions | Fully implemented (Computed live) | `LeaderboardView.tsx`, `server/db.ts` |
| **Trust & Compliance** | Limits contact frequency, quiet hours | Fully enforced server-side | `server/compliance.ts`, `TrustComplianceView.tsx` |
| **Support Tickets** | Basic issue tracking | Fully implemented (Routes exist in `server.ts`) | `server.ts`, `SupportView.tsx` |
| **Settings / Backups** | Auto-snapshots, global configs | Fully implemented (Auto-backups every 30m) | `server.ts`, `server/db.ts`, `SettingsView.tsx` |
| **Auth & RBAC** | Login, JWT, impersonation | Fully implemented & enforced | `server/auth.ts`, `server.ts`, `LoginModal.tsx` |

## 6. Known critical gaps

*   **Authentication State:** Real authentication is fully implemented (JWTs, bcrypt, rate-limiting). However, there is a built-in impersonation endpoint (`/api/auth/switch-user`) that allows users with the `owner` or `cto` role to instantly switch to any other user's session.
*   **Authorization Scope (`authorize` model):** The `SELF`/`TEAM`/`ALL_TEAMS`/`SYSTEM`/`COMPANY` scope model *is* fully implemented and actively called on Lead routes (`GET /api/leads`, `GET /api/leads/:id`, `PUT /api/leads/:id`).
*   **Trust & Compliance Guardrails:** Actively enforced server-side. `validateLeadCommunicationCompliance()` explicitly blocks outbound calls and WhatsApp messages in `server.ts` if frequency caps or quiet hours are violated.
*   **Data-Integrity Gap (Concurrency):** `saveDatabase()` is a synchronous, blocking write of the entire JSON state to disk. While individual Lead edits have optimistic version checks (`if (updates.version !== oldLead.version) ...`), the actual file write under high concurrent load across different resources (e.g., Lead update vs. Call log insertion) risks total state clobbering.
*   **AI Integration:** `@google/genai` is wired up, but explicitly falls back to hardcoded mock responses if `process.env.GEMINI_API_KEY` is undefined.

## 7. Conventions to follow

*   **Visual Language:** Stick to the established Tailwind utility classes. Use semantic status colors (e.g., `emerald` for Won, `amber` for Follow-up). New UI components should leverage the existing widget-card chrome found in the `src/components/common` directory rather than inventing new containers.
*   **Naming Consistency:** Ensure you stick to the multi-tier roles (`telecaller`, `tl`, `tl_head`, `it`, `owner`, `cto`) which recently replaced the legacy `Rep`/`Team Lead`/`Admin` nomenclature (legacy mapping exists in `auth.ts` to prevent breaks, but new code should use the new terms).
*   **Environment Variables:** **HARD RULE:** Secrets (like `GEMINI_API_KEY` or `JWT_SECRET`) must *only* be referenced server-side in Node.js files. Never use `import.meta.env.VITE_*` for sensitive keys, as Vite will bundle them into the public client JavaScript.

## 8. Rules for any AI agent working in this repo

*   **Check the enforcement layer:** Before implementing a feature that touches permissions, calling, messaging, or compliance, check Section 6. The underlying enforcement layer *does* exist, so do not build UI assuming the server will blindly accept it. Your client-side changes must pass the `authorize()` and `checkCompliance()` gates.
*   **Respect the visual style:** Don't introduce a new visual style, component library, or color convention — extend the existing Tailwind configuration and layout patterns.
*   **High-Risk Data Paths:** Any change to authentication, authorization, or the `saveDatabase()` write path should be treated as high-risk and called out explicitly in your change summary. Do not bundle these changes silently into unrelated feature requests.
*   **Verify before trusting:** When in doubt about whether something is implemented, `grep` the actual code rather than trusting this file's Section 5/6 status blindly if it looks stale.

## 9. Roadmap / what's actively being worked toward

*   **Migration to Multi-Tier RBAC:** The codebase recently underwent a migration from a 3-tier role system to a 6-tier model. Logic mapping old roles to new ones exists in `server/db.ts` and `server/auth.ts`.
*   **Hardening AI Integration:** Shifting from simulated telecaller audio/transcripts to actual API-driven responses via the Gemini SDK.
