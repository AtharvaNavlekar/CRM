<p align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&color=0:6366F1,100:22D3EE&height=180&section=header&text=DialPulse%20CRM&fontSize=48&fontColor=ffffff&animation=fadeIn&desc=Telecalling%20%2B%20WhatsApp-first%20Sales%20CRM&descAlignY=75" />
</p>

<p align="center">
  <img src="https://readme-typing-svg.demolab.com?font=Fira+Code&size=20&pause=1000&color=6366F1&center=true&vCenter=true&width=600&lines=Lead+Management+%2B+Calling+%2B+WhatsApp+in+one+place;Built+with+React+19%2C+TypeScript%2C+and+Vite;Prototype+%E2%80%94+generated+via+Google+AI+Studio" />
</p>

<p align="center">
  <img src="https://skillicons.dev/icons?i=react,ts,vite,tailwind,nodejs,express" />
</p>

<!-- TODO: replace with an actual screen-recording GIF or MP4 of the live dashboard/calling console, e.g. via a tool like ScreenToGif or a Spline scene export. Do not leave a fake/placeholder image URL in the committed file. -->

# DialPulse CRM

A telecalling- and WhatsApp-first sales CRM prototype built to unify lead management and active outreach in one interface.

> **Note:** This is a prototype and work-in-progress generated via Google AI Studio. It is not currently production-ready.

## Key Features

*   **Lead Management & Pipeline:** Interactive Kanban board for tracking leads across custom stages.
*   **Integrated Calling Console:** Make calls directly from the CRM (audio and transcripts are currently simulated if an AI key is not provided).
*   **WhatsApp Messaging:** Send predefined templates and track delivery statuses seamlessly.
*   **Dashboard & Reporting:** Live metrics, conversion rates, and call stats visualization.
*   **Leaderboard:** Gamified ranking of sales reps based on conversions and call volume.
*   **Trust & Compliance Center:** Automated, server-enforced guardrails for quiet hours and daily contact frequency caps.
*   **Support Tickets:** Basic integrated issue tracking functionality.

## Tech Stack

*   **Frontend:** React 19.0.1, Vite 6.2.3, ESBuild
*   **Styling:** Tailwind CSS 4.1.14
*   **Backend:** Node.js, Express 4.21.2
*   **Data Layer:** Local file-backed JSON (`data/db.json`)

For an in-depth architectural deep-dive, see the [BRAIN.md](BRAIN.md) document.

## Prerequisites

*   **Node.js:** v18+ (required for native `fetch` support and Vite compatibility)
*   **Package Manager:** Bun is the expected package manager (a `bun.lock` file is included in this repository), though npm/yarn can also be used.

## Setup and Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/AtharvaNavlekar/CRM.git
   cd CRM
   ```

2. **Install dependencies:**
   ```bash
   bun install
   ```

3. **Configure Environment Variables:**
   Copy the example environment file:
   ```bash
   cp .env.example .env
   ```
   Fill in the variables in your new `.env` file. *(Note: If hosting via AI Studio, these are automatically injected from your Secrets panel. For local runs, they must be set manually.)*
   *   `GEMINI_API_KEY`: Required for Gemini AI API calls (transcript generation).
   *   `APP_URL`: The URL where this applet is hosted (used for self-referential links).
   *   `JWT_SECRET`: Secret key for signing session JWT tokens.
   *   `JWT_EXPIRY`: Token lifespan (e.g., `24h`).

4. **Start the development server:**
   ```bash
   bun run dev
   ```
   This command starts the full stack (backend API and Vite frontend server concurrently) via `tsx`.

## Available Scripts

The following scripts are defined in `package.json`:

| Script | Description |
| :--- | :--- |
| `dev` | Runs the backend and frontend development server concurrently using `tsx`. |
| `build` | Builds the frontend with Vite and bundles the backend via ESBuild. |
| `start` | Starts the production server using the built `dist/server.cjs` file. |
| `preview` | Previews the built Vite frontend production bundle locally. |
| `clean` | Removes the `dist` directory and any compiled server files. |
| `lint` | Runs TypeScript type checking without emitting files. |
| `test` | Runs the primary authentication and compliance tests. |
| `test:security` | Runs the comprehensive security test suite. |

## Project Structure

*   `src/components/` - React frontend components (grouped by feature/domain)
*   `src/context/` - Global React state management (e.g., ThemeContext)
*   `src/lib/` - Shared frontend utilities
*   `server/` - Node.js Express backend logic (`auth.ts`, `db.ts`, `compliance.ts`)
*   `security-tests/` - Automated security and compliance verification scripts
*   `tests/` - Application logic unit and integration tests
*   `data/` - Contains the `db.json` file used for application state persistence

## Current Status & Limitations

This repository is a prototype generated via Google AI Studio. While the foundational features work, several limitations exist:
*   Data persistence is handled via a naive, synchronous local JSON file, meaning it lacks genuine concurrency controls.
*   Authentication, authorization, and compliance-related guardrails may require further hardening for a production environment. 

Please refer to [BRAIN.md](BRAIN.md) for an honest, up-to-date assessment of the codebase's current state and implementation gaps.

## Contributing

To propose a change, please fork the repository, create a new feature branch, and submit a Pull Request against the `main` branch. 

## License

No license file is currently present — usage terms are undefined.
