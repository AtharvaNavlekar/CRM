# Recovery Findings

- The plan from the shared chat establishes React/Vite + Express + PostgreSQL/Drizzle + Redis + independent worker as the canonical architecture.
- Current dev routes work through Vite on port 5173 and `/api` proxies to port 3000. The API port returning `Cannot GET /` is expected in development, but production static SPA serving is currently absent.
- Current baseline: production build succeeds, but `npm run lint` fails because SettingsView references removed API functionality.
- The frontend still initializes core leads state from mock data, while API routes use PostgreSQL.
- Security work is incomplete: tenant fallbacks remain, authorization styles are mixed, and the impersonation endpoint does not create an impersonation-session database row.
- Compliance activity-count queries currently catch database failures and treat them as zero activity, which can fail open.
- Redis is absent in the current environment; job enqueueing can create durable job records without a runnable queue/worker path.
- Documentation and tests retain JSON-era descriptions and hard-coded demo-account assumptions.
