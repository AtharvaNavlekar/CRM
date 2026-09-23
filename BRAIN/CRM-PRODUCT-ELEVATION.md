# DialPulse CRM — Product Elevation & UI Foundation Specification

> **Document Version:** 1.0.0  
> **Status:** Phase 1 Architectural Audit & Foundation Definition  
> **Target Alignment:** DialPulse Brand, Material Design 3 Structure, and Production-Grade Operational CRM  
> **Date:** September 2026  

---

## 1. Current CRM UX State

DialPulse CRM has rich, production-level backend logic (RBAC, PostgreSQL, audit logging, security deterrence, impersonation boundaries, compliance fatigue guards, and WACA WhatsApp integration). However, its frontend user interface currently reflects an evolutionary "feature-heavy prototype" rather than a cohesive, high-density SaaS application:

* **Inconsistent Depth & Canvas Definition:** Pages alternate between arbitrary background shades (`#F8FAF8`, `#F4F7F6`, `bg-slate-50`, `#111413`, `bg-white`). Cards float without a disciplined surface elevation hierarchy.
* **Over-reliance on Static Pill Badges ("Candy Pills"):** Multiple screens wrap static metadata (dates, IDs, stage tags, phone numbers) in heavy rounded pill containers with saturated pastels (`bg-purple-100`, `bg-amber-100`, `bg-sky-100`), creating visual fatigue and violating both M3 calm surfaces and anti-slop guidelines.
* **Disjointed Page Navigation & Hierarchy:** Navigation items in the sidebar were listed in a flat, unorganized array with competing colored badge tags ("New", "Live", "#1", "Active", "Audit", "Meta API"). The four core product pillars were not visually grouped.
* **Fragmented Form & Input Patterns:** Inputs, selects, and search bars vary from raw HTML inputs with inconsistent border radii to `.m3-select` and custom dropdowns.
* **Disconnected Header Anatomy:** TopBar currently conflates global search, quick-action dialer shortcuts, add/import actions, theme toggles, and user profiles without clear workspace context (tenant company name, environment, active role badge). Major views lack a unified PageHeader component for titles, descriptions, and primary actions.

---

## 2. Current Visual Inconsistencies

1. **Color Token Scatter:**
   * Raw hex codes (`#00695C`, `#2E6E5C`, `#1F3A5F`, `#191C1B`, `#6F7976`) are hardcoded across 20+ component files instead of referencing semantic CSS variables or standardized Tailwind tokens.
   * Competing dark mode surfaces: Some components use `dark:bg-slate-900`, others use `dark:bg-[#111413]`, and others use `dark:bg-[#191C1B]`.
2. **Typography Scale Drift:**
   * Headings mix font styles: Some use default system sans, some use `Roboto`, and some use `Plus Jakarta Sans` without standard weight classes.
   * Technical information (phone numbers, timestamps, IDs, latency, call duration) occasionally uses arbitrary serif/sans instead of `JetBrains Mono`.
3. **Corner Radius Multiplicity:**
   * Found in existing codebase: `rounded-sm`, `rounded-md`, `rounded-lg`, `rounded-xl`, `rounded-2xl`, `rounded-[24px]`, `rounded-[28px]`, and `rounded-full` used without hierarchical correlation to container depth.
4. **Elevation & Border Weight:**
   * Mixture of `border border-[#BEC9C5]/40`, `border border-slate-200`, `shadow-sm`, `shadow-lg`, and flat transparent borders.

---

## 3. Existing Reusable Components

The project currently has several components in `src/components/common/` and `src/components/skeletons/`:
* `WidgetCard.tsx`: Provides card container with time-range selector, refresh handler, and expand state.
* `MaterialDropdown.tsx`: Dropdown selector with keyboard support and floating popover.
* `AvatarBadge.tsx`: Initials-based avatar with status indicators.
* `StatusPill.tsx`: Color-coded semantic status pill.
* `BottomSheet.tsx`: Mobile drawer for filters and options.
* `ImpersonationBanner.tsx`: Warning banner when viewing tenant as staff/impersonator.
* `SecurityDeterrenceComponents.tsx`: DevTools overlay and automation detection banners.
* `M3Skeleton.tsx` (`SkeletonBox`, `LeadsTableSkeleton`, `KanbanSkeleton`, etc.): Base shimmer placeholders.

---

## 4. Duplicate Components & Gaps

* **Duplicate Buttons & Badges:** Different views render custom `<button>` styles with scattered `px-3 py-1.5`, `rounded-full`, `rounded-xl`, `bg-[#00695C]`, and `bg-slate-100`.
* **Missing Common Primitives:**
  * No standardized `Button` component with variants (`primary`, `secondary`, `tonal`, `outline`, `destructive`, `ghost`).
  * No standardized `Input`, `SearchInput`, or `Select` field components with integrated label, helper, and error states.
  * No standardized `PageHeader` component with breadcrumb, title, description, and action slots.
  * No standardized `StatusBadge` following the Zero-Pill discipline (subtle dot + tonal text).
  * No standardized `Card` / `SurfaceCard` with M3 elevation levels (Canvas, Surface, Container, Dialog).
  * No standardized `EmptyState` or `ErrorState` with action buttons and clear error semantics (401, 403, 404, 422, 500).
  * No standardized `DataTable` / `Pagination` shell.

---

## 5. Current Theme Implementation

The theme is governed by `src/context/ThemeContext.tsx` and `src/index.css`.
* Root variables: `--md-sys-color-primary`, `--md-sys-color-surface`, `--md-sys-color-surface-variant`, etc.
* Synchronized with `localStorage.getItem('telecrm_theme')`.
* Target alignment:
  * Primary: `#00695C`
  * Primary Container: `#CCE8E1` (Dark: `#005046`)
  * Canvas Background: `#FFFFFF` / Dark: `#111413`
  * Surface: `#F8FAF9` / Dark: `#161918`
  * Surface Variant: `#F1F5F4` / Dark: `#202423`
  * Outline: `#94A3B8` (Dark: `#64748B`)
  * Outline Variant: `#E2E8F0` (Dark: `#2D3748`)
  * Text Primary: `#0F172A` (Dark: `#F1F5F9`)
  * Text Secondary: `#475569` (Dark: `#94A3B8`)
  * Technical Dark Surface: `#1E293B`
  * Success: `#10B981`
  * Destructive/Error: `#BA1A1A` / `#EF4444`

---

## 6. Current Application Shell

### Desktop Structure:
* Left: Fixed `Sidebar` (collapsible between `w-72` and `w-20`).
* Right: Main column containing `TopBar`, `ImpersonationBanner`, and the active view.

### Deficiencies in Current Shell:
* TopBar lacks explicit Workspace Context (e.g. "Acme Corp · Mumbai Branch") and environment indicators.
* Sidebar items were an unstructured 12-item flat list without pillar headers.
* Missing keyboard shortcuts (e.g., `/` for search, `?` for navigation).
* Mobile view switches via `BottomNavBar` which lacks access to Platform Ops, Trust & Compliance, and Activity Logs.

---

## 7. Current Responsive Issues

1. **TopBar on Mobile (`< 640px`):** Search input, dialer button, and user dropdown compete for horizontal space, causing buttons to truncate or clip.
2. **Table Horizontal Scroll:** Tables currently lack sticky header row behaviors with fixed left column pins for lead names.
3. **Sidebar Overlay:** Sidebar overlay on mobile sometimes traps touch scroll on background body elements.

---

## 8. Current Accessibility Issues

1. **Color-Only Status Indicators:** Some statuses rely solely on background pastels without high-contrast icons or accessible text labels.
2. **Missing ARIA landmarks:** View headers lack distinct `aria-labelledby` linkages.
3. **Focus States:** Some custom interactive items lack `focus-visible:ring-2 focus-visible:ring-[#00695C] focus-visible:ring-offset-2`.
4. **Touch Targets:** While some elements implement `.touch-target-48`, inline table action icons are 28×28px without adequate touch padding on mobile.

---

## 9. Product Architecture Mapping (Four Operational Pillars)

The CRM navigation and operational workspaces map directly to the four core pillars:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        DIALPULSE OPERATIONAL CRM                       │
├───────────────────┬───────────────────┬────────────────┬───────────────┤
│ 1. CAPTURE &      │ 2. COMMUNICATE    │ 3. MANAGE &    │ 4. COMPLY &   │
│    PIPELINE       │                   │    SUPERVISE   │    PROTECT    │
├───────────────────┼───────────────────┼────────────────┼───────────────┤
│ · Leads Table     │ · Call Console    │ · Dashboard    │ · Trust &     │
│ · Kanban Pipeline │ · WhatsApp WACA   │ · Leaderboard  │   Compliance  │
│ · Bulk Imports    │ · Call History    │ · Support SLA  │ · Audit Logs  │
│ · Manual Lead Add │ · Outreach Queues │ · Team Metrics │ · Settings    │
│                   │                   │                │ · Platform Ops│
└───────────────────┴───────────────────┴────────────────┴───────────────┘
```

---

## 10. Recommended Component Hierarchy

```
src/components/ui/
├── Button.tsx               # Primary, Secondary, Tonal, Outline, Destructive, Ghost
├── Input.tsx                # Text, Number, Phone, Search with error & helper text
├── Select.tsx               # Standardized accessible select box
├── Badge.tsx                # StatusBadge & CountBadge adhering to zero-pill discipline
├── Card.tsx                 # SurfaceCard, StatCard with Level 1-4 elevations
├── PageHeader.tsx           # Reusable PageHeader with title, description, actions, tags
├── SectionHeader.tsx        # In-page division headers with action slots
├── EmptyState.tsx           # Contextual empty state with icons & primary action trigger
├── ErrorState.tsx           # Accessible error boundaries (401, 403, 404, 422, 500)
├── LoadingState.tsx         # Unified inline, container, and skeleton loaders
├── DataTable.tsx            # Clean operational table wrapper with pagination & sorting
└── Dialog.tsx               # Accessible modal wrapper with focus trap & M3 specs
```

---

## 11. Planned Page Migration Order

1. **Phase 1 (Current Step):** UI Foundation, Design Tokens, Reusable UI Primitives (`src/components/ui/`), and Application Shell (`Sidebar`, `TopBar`, `PageHeader`).
2. **Phase 2:** Leads Management & Detail Workspace (`LeadsListView`, `LeadDetailModal`).
3. **Phase 3:** Operational Dashboard & Reporting (`DashboardView`, `LeaderboardView`).
4. **Phase 4:** Communications Console (`CallsView`, `CallConsoleModal`, `WhatsAppView`).
5. **Phase 5:** Compliance, Audit & Settings (`TrustComplianceView`, `ActivityLogsView`, `SettingsView`, `PlatformDashboardView`).
