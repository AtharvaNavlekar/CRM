# DialPulse CRM — Visual & Theme System Export

> **Document Type:** Read-Only Theme & Design System Extraction  
> **Target Consumer:** DialPulse Marketing Website & External Brand Ecosystem  
> **Source Application:** DialPulse CRM (`/src`, `/index.html`, `/src/index.css`)  
> **Design Architecture:** Material Design 3 (Material You / M3) + Tailwind CSS Utility Engine  
> **Extraction Date:** September 2026  

---

## 1. Executive Summary & Design System Architecture

DialPulse CRM's visual language is built strictly on **Material Design 3 (Material You)** principles, implemented via a unified design token system in `src/index.css` paired with Tailwind CSS.

### Core Architecture Characteristics
* **Brand Foundation:** Sophisticated **Deep Teal / Emerald (`#00695C`)** foundation representing clinical precision, reliability, and modern SaaS trust.
* **Dual-Theme Engine (Light & Dark):** Native CSS variables using the `--md-sys-color-*` specification. Switched via the `.dark` class on the root HTML element, synchronized with `localStorage.getItem('telecrm_theme')`.
* **State Layering:** Material 3 opacities for interactive feedback: Hover (8%), Focus (12%), Pressed (12%), Dragged (16%).
* **High-Density Accessibility:** Enforces a minimum **48×48dp touch target** guideline (`.touch-target-48` and `min-h-[44px]`–`min-h-[48px]`) across all clickable elements, inputs, and icon buttons.
* **Shape Archetype:** Rounded pill containers (`rounded-full`, 9999px) for actions, search fields, segmented toggles, and filter chips, paired with extra-large radii (`rounded-[24px]` and `rounded-[28px]`) for cards and modal dialogs.

---

## 2. Comprehensive Color System

### 2.1 Material Design 3 Color Tokens

All core tokens are defined as CSS variables under `:root` (Light mode) and `.dark` (Dark mode) in `src/index.css`.

| Token Name | CSS Variable | Light Mode (Hex) | Dark Mode (Hex) | Role & Usage |
| :--- | :--- | :--- | :--- | :--- |
| **Primary** | `--md-sys-color-primary` | `#00695C` | `#80D5C4` | Primary actions, CTA buttons, active selection indicators, key focus rings |
| **On Primary** | `--md-sys-color-on-primary` | `#FFFFFF` | `#003830` | Text/icons sitting on top of the Primary color |
| **Primary Container** | `--md-sys-color-primary-container` | `#CCE8E1` | `#004F46` | Tonal button backgrounds, selected row highlights, active badge backgrounds |
| **On Primary Container** | `--md-sys-color-on-primary-container` | `#00201B` | `#A3F2E4` | Text/icons on top of Primary Container (high-contrast teal) |
| **Secondary** | `--md-sys-color-secondary` | `#4A635D` | `#B0CCC4` | Secondary filters, sub-actions, contextual elements |
| **On Secondary** | `--md-sys-color-on-secondary` | `#FFFFFF` | `#1B352F` | Text/icons on top of Secondary color |
| **Secondary Container** | `--md-sys-color-secondary-container` | `#CCE8E0` | `#324B45` | Secondary pill chips and supporting container fills |
| **On Secondary Container** | `--md-sys-color-on-secondary-container` | `#05201A` | `#CCE8E0` | Text/icons on top of Secondary Container |
| **Tertiary** | `--md-sys-color-tertiary` | `#006558` *(UI uses `#1F3A5F`)* | `#A6C8FF` | Accent highlights, bulk edit tonal pills, pipeline stages, deep contrast tags |
| **On Tertiary** | `--md-sys-color-on-tertiary` | `#FFFFFF` | `#003062` | Text/icons on top of Tertiary color |
| **Tertiary Container** | `--md-sys-color-tertiary-container` | `#CCE8E0` | `#004689` | Tertiary container surfaces |
| **On Tertiary Container** | `--md-sys-color-on-tertiary-container` | `#00201B` | `#D6E3FF` | Text/icons on Tertiary Container |
| **Error** | `--md-sys-color-error` | `#BA1A1A` | `#FFB4AB` | Destructive actions, dropped leads, overdue callbacks, compliance blocks |
| **On Error** | `--md-sys-color-on-error` | `#FFFFFF` | `#690005` | Text/icons on Error color |
| **Error Container** | `--md-sys-color-error-container` | `#FFDAD6` | `#93000A` | Error banners, capped call warnings, lost lead indicators |
| **On Error Container** | `--md-sys-color-on-error-container` | `#410002` | `#FFDAD6` | Text/icons on Error Container |
| **Background / Surface** | `--md-sys-color-background` / `surface` | `#F8FAF8` | `#111413` | Root page background, full application canvas |
| **On Surface** | `--md-sys-color-on-surface` | `#191C1B` | `#E1E3E0` | Primary typography, card headings, active table text |
| **Surface Variant** | `--md-sys-color-surface-variant` | `#DAE5E1` | `#3F4946` | Search field backgrounds, inactive chips, divider fills |
| **On Surface Variant** | `--md-sys-color-on-surface-variant` | `#3F4946` | `#BEC9C5` | Subtitles, label text, column headers, placeholder icons |
| **Outline** | `--md-sys-color-outline` | `#6F7976` | `#89938F` | Borders on active inputs, card dividers, inactive icons |
| **Outline Variant** | `--md-sys-color-outline-variant` | `#BEC9C5` | `#3F4946` | Card borders, subtle table row dividers, input field borders |
| **Surface Container Lowest** | `--md-sys-color-surface-container-lowest` | `#FFFFFF` | `#0C0F0E` | Highest contrast cards, white floating panels |
| **Surface Container Low** | `--md-sys-color-surface-container-low` | `#F2F5F2` | `#191C1B` | Subtle card backdrops, kanban column base |
| **Surface Container** | `--md-sys-color-surface-container` | `#ECEFEC` | `#1D201F` | Table headers, widget header chrome, navigation bars |
| **Surface Container High** | `--md-sys-color-surface-container-high` | `#E6EAE6` | `#272B2A` | Elevated cards, input fields, popover menus |
| **Surface Container Highest** | `--md-sys-color-surface-container-highest` | `#E0E4E0` | `#323634` | Shimmer skeletons, hover highlights, active tab fills |
| **Inverse Surface** | `--md-sys-color-inverse-surface` | `#2E3130` | `#E1E3E0` | Tooltips, snackbars, high-contrast dark banners in light mode |
| **Inverse On Surface** | `--md-sys-color-inverse-on-surface` | `#F0F1EE` | `#191C1B` | Text on tooltips/snackbars |
| **Inverse Primary** | `--md-sys-color-inverse-primary` | `#80D5C4` | `#00695C` | Inverted action highlights |
| **Shadow / Scrim** | `--md-sys-color-shadow` / `scrim` | `#000000` | `#000000` | Modal overlays (`bg-black/60` or `bg-[#00201B]/40`) |

---

### 2.2 Functional & Domain-Specific Colors

In addition to the core M3 tokens, the CRM employs targeted domain colors for sales operations:

#### 1. Secondary Brand Accents
* **Navy / Slate Tertiary Accent:** `#1F3A5F` (Hover: `#162C4A`)  
  * *Used in:* Bulk Edit buttons, Pipeline Stepper active progression, administrative badges.
* **Legacy Deep Emerald Accent:** `#2E6E5C` (Hover: `#235849`)  
  * *Used in:* Quick action saves, inline reminder triggers.

#### 2. WhatsApp Official Integration
* **WhatsApp Brand Green:** `#25D366` / `#1EBE5D`  
* **WhatsApp Deep Header:** `#075E54` / `#128C7E` / Dark: `#202C33`  
* **WhatsApp Inbound Bubble:** Light: `#FFFFFF` / Dark: `#202C33`  
* **WhatsApp Outbound Bubble:** Light: `#D9FDD3` / Dark: `#005C4B`  

#### 3. Pipeline Stage Distribution Palette (`PIPELINE_STAGE_COLORS`)
| Pipeline Stage | Hex Code | Tailwind Equivalent | Meaning / Context |
| :--- | :--- | :--- | :--- |
| **Fresh Lead** | `#0284C7` | `sky-600` | Untouched, newly imported leads |
| **Reheated** | `#6366F1` | `indigo-500` | Previously inactive leads re-engaged |
| **RNR (Ring No Response)** | `#F43F5E` | `rose-500` | Customer dialed but didn't pick up |
| **Call Back Later** | `#F59E0B` | `amber-500` | Scheduled follow-up callback |
| **Recorded Demo Sent** | `#8B5CF6` | `purple-500` | Product demo video transmitted |
| **Webinar Scheduled** | `#D97706` | `amber-600` | Lead booked into a group webinar |
| **Webinar Done** | `#10B981` | `emerald-500` | Lead attended the product webinar |
| **1-to-1 Demo Scheduled** | `#06B6D4` | `cyan-500` | High-intent live demonstration booked |
| **Relevant** | `#14B8A6` | `teal-500` | Qualified prospect matching buyer persona |
| **Quotation Shared** | `#3B82F6` | `blue-500` | Formal price proposal transmitted |
| **Payment Pending** | `#EAB308` | `yellow-500` | Verbal agreement received, invoice unpaid |
| **Won** | `#059669` | `emerald-600` | Successfully closed sale / deal won |
| **Lost** | `#DC2626` | `red-600` | Disqualified, price rejection, dropped |

#### 4. Compliance & Fatigue Status Colors
* **Capped (3/3 Calls reached):** Background `#FFDAD6`, Text `#410002` (M3 Error Container)
* **Near Cap (2/3 Calls reached):** Background `#FEF3C7` (`amber-100`), Text `#78350F` (`amber-900`)
* **Normal / Compliant:** Background `#CCE8E1`, Text `#00201B` (M3 Primary Container)
* **Quiet Hours / Opted-Out:** Background `#ECEFEC`, Text `#6F7976` (Neutral Gray)

#### 5. Avatar Deterministic Palette (`src/utils/avatarColors.ts`)
Each user avatar uses a stable hash of the user's name to map into 12 color pairings:
1. Teal: BG `#CCE8E1`, Text `#00201B`
2. Emerald: BG `#D1FAE5`, Text `#065F46`
3. Cyan: BG `#CFFAFE`, Text `#155E75`
4. Sky: BG `#E0F2FE`, Text `#075985`
5. Blue: BG `#DBEAFE`, Text `#1E40AF`
6. Indigo: BG `#E0E7FF`, Text `#3730A3`
7. Violet: BG `#EDE9FE`, Text `#5B21B6`
8. Purple: BG `#F3E8FF`, Text `#6B21A8`
9. Rose: BG `#FFE4E6`, Text `#9F1239`
10. Amber: BG `#FEF3C7`, Text `#92400E`
11. Orange: BG `#FFEDD5`, Text `#9A3412`
12. Slate: BG `#E2E8F0`, Text `#334155`

---

## 3. Typography System

### 3.1 Font Families
As loaded in `/index.html`:
```html
<link href="https://fonts.googleapis.com/css2?family=Roboto:ital,wght@0,300;0,400;0,500;0,700;1,400&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap" rel="stylesheet">
```

1. **Primary Interface Font (`font-sans`):** `'Roboto', -apple-system, BlinkMacSystemFont, sans-serif`  
   * Used for body copy, table cells, form labels, and standard navigation items.
2. **Display & Heading Font (`font-display`):** `'Plus Jakarta Sans', sans-serif`  
   * Used for prominent titles, dashboard headings, modal header labels, and executive metrics.
3. **Monospace / Numerical Font (`font-mono`):** `'JetBrains Mono', monospace`  
   * Used for phone numbers (`+91 98765 43210`), currency (`₹ 2.4 L`), call duration timers (`04:32`), timestamps, and numeric badges.
4. **Iconography:** `lucide-react` icons (20px, 16px, 14px stroke) + `Material Symbols Outlined`.

---

### 3.2 Material Design 3 Type Scale

| Level | CSS Class | Font Size | Line Height | Tracking (Letter Spacing) | Font Weight |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Display Large** | `.m3-display-large` | `57px` (`3.5625rem`) | `64px` | `-0.25px` | 400 |
| **Display Medium** | `.m3-display-medium` | `45px` (`2.8125rem`) | `52px` | `0px` | 400 |
| **Display Small** | `.m3-display-small` | `36px` (`2.25rem`) | `44px` | `0px` | 400 |
| **Headline Large** | `.m3-headline-large` | `32px` (`2rem`) | `40px` | `0px` | 400 |
| **Headline Medium** | `.m3-headline-medium` | `28px` (`1.75rem`) | `36px` | `0px` | 400 |
| **Headline Small** | `.m3-headline-small` | `24px` (`1.5rem`) | `32px` | `0px` | 400 / 600 |
| **Title Large** | `.m3-title-large` | `22px` (`1.375rem`) | `28px` | `0px` | 400 / 500 |
| **Title Medium** | `.m3-title-medium` | `16px` (`1rem`) | `24px` | `+0.15px` | 500 |
| **Title Small** | `.m3-title-small` | `14px` (`0.875rem`) | `20px` | `+0.1px` | 500 / 600 |
| **Label Large** | `.m3-label-large` | `14px` (`0.875rem`) | `20px` | `+0.1px` | 500 / 600 |
| **Label Medium** | `.m3-label-medium` | `12px` (`0.75rem`) | `16px` | `+0.5px` | 500 |
| **Label Small** | `.m3-label-small` | `11px` (`0.6875rem`) | `16px` | `+0.5px` | 500 |
| **Body Large** | `.m3-body-large` | `16px` (`1rem`) | `24px` | `+0.5px` | 400 |
| **Body Medium** | `.m3-body-medium` | `14px` (`0.875rem`) | `20px` | `+0.25px` | 400 |
| **Body Small** | `.m3-body-small` | `12px` (`0.75rem`) | `16px` | `+0.4px` | 400 |

---

## 4. Shapes, Geometry & Corner Radii

DialPulse CRM strictly follows the M3 shape hierarchy:

| Scale Level | Value | Tailwind Class | Application in CRM |
| :--- | :--- | :--- | :--- |
| **None** | `0px` | `rounded-none` | Full-bleed drawer borders, bottom sheet base edges |
| **Extra Small** | `4px` | `rounded-xs` / `rounded-sm` | Checkbox squares, status indicator square dots |
| **Small** | `8px` | `rounded-lg` | Dropdown option hover backgrounds, compact tooltips |
| **Medium** | `12px` | `rounded-xl` | Pipeline stage buttons in stepper, quick action cards |
| **Large** | `16px` | `rounded-2xl` | Table skeleton rows, mobile lead cards, message bubbles |
| **Extra Large (Cards)** | `24px` | `rounded-[24px]` | `WidgetCard` analytics containers, dashboard modules |
| **Extra Large (Modals)**| `28px` | `rounded-[28px]` | `CallConsoleModal`, `LeadDetailModal`, Manage Filters dialog |
| **Full (Pill)** | `9999px` | `rounded-full` | **Primary brand pattern:** Action buttons, search bars, filter chips, dropdown triggers, status pills, avatar containers |

---

## 5. Elevation & Shadows

Material 3 elevation is rendered through a composite of subtle shadows and surface tint shifts.

```css
/* src/index.css elevation tokens */
.m3-elevation-0 { box-shadow: none; }
.m3-elevation-1 { box-shadow: 0px 1px 2px rgba(0, 0, 0, 0.3), 0px 1px 3px 1px rgba(0, 0, 0, 0.15); }
.m3-elevation-2 { box-shadow: 0px 1px 2px rgba(0, 0, 0, 0.3), 0px 2px 6px 2px rgba(0, 0, 0, 0.15); }
.m3-elevation-3 { box-shadow: 0px 4px 8px 3px rgba(0, 0, 0, 0.15), 0px 1px 3px rgba(0, 0, 0, 0.3); }
.m3-elevation-4 { box-shadow: 0px 6px 10px 4px rgba(0, 0, 0, 0.15), 0px 2px 3px rgba(0, 0, 0, 0.3); }
.m3-elevation-5 { box-shadow: 0px 8px 12px 6px rgba(0, 0, 0, 0.15), 0px 4px 4px rgba(0, 0, 0, 0.3); }
```

* **Surface Cards (Resting):** `shadow-xs` / `border border-[#BEC9C5]/40`
* **Dropdown Menus & Popovers:** `shadow-xl` / `rounded-[20px]` / `border border-[#BEC9C5]/60`
* **Modal Dialogs:** `shadow-2xl` / `rounded-[28px]` / backdrop `bg-black/60 backdrop-blur-xs`
* **Hover State on Cards:** `hover:shadow-md` with border transition

---

## 6. Component Anatomy & UI Patterns

### 6.1 Button Hierarchy
1. **Filled Button (High Emphasis):**
   * Class: `min-h-[44px] px-5 rounded-full bg-[#00695C] text-white hover:bg-[#005449] active:scale-98 shadow-sm transition-all text-xs font-semibold`
   * Role: Primary actions ("New Lead", "Start Calling", "Save Outcome").
2. **Tonal Button (Medium Emphasis):**
   * Class: `min-h-[44px] px-4 rounded-full bg-[#CCE8E1] text-[#00201B] hover:bg-[#B7DFD6] dark:bg-[#004F46] dark:text-[#80D5C4] text-xs font-medium`
   * Role: Secondary actions ("Bulk Edit", "Simulate Pickup", "WhatsApp Quick Send").
3. **Outlined Button (Low Emphasis):**
   * Class: `min-h-[44px] px-4 rounded-full border border-[#BEC9C5]/60 dark:border-[#3F4946]/60 text-[#191C1B] dark:text-[#E1E3E0] hover:bg-[#ECEFEC] dark:hover:bg-[#272B2A] text-xs font-medium`
   * Role: Filters, "Discard", "Manage Columns", "Cancel".
4. **Standard Icon Button:**
   * Class: `w-11 h-11 rounded-full flex items-center justify-center hover:bg-[#ECEFEC] dark:hover:bg-[#272B2A] text-[#6F7976] hover:text-[#191C1B]`
   * Target: Always 44×44px or 48×48px.

### 6.2 Filter Chips & Dropdowns (`MaterialDropdown`)
* **Chip Variant:** `inline-flex items-center rounded-full border border-[#BEC9C5]/60 bg-[#ECEFEC] px-3.5 py-1.5 min-h-[38px] text-xs font-medium`
* **Active Pill State:** Filled with `#00695C` (white text) or highlighted with a count badge (`bg-[#00695C] text-white`).

### 6.3 Card Container Anatomy (`WidgetCard`)
* **Outer Container:** `rounded-[24px] bg-[#F8FAF8] dark:bg-[#1D201F] border border-[#BEC9C5]/40 dark:border-[#3F4946]/40 shadow-xs flex flex-col overflow-hidden`
* **Header Chrome:** `px-4 py-3.5 border-b border-[#BEC9C5]/30 bg-[#ECEFEC]/60 dark:bg-[#1D201F]/60 flex items-center justify-between`
* **Title:** `text-xs font-semibold text-[#191C1B] m3-title-small`
* **Expandable:** Supports full-screen modal expansion with backdrop blur.

### 6.4 Status Pill Component (`StatusPill`)
* **Shape:** `rounded-full px-2.5 py-1 text-xs font-semibold flex items-center gap-1.5`
* **Color Schemes:**
  * Won / Qualified: `bg-emerald-100 text-emerald-800 border-emerald-300`
  * Lost / Dropped: `bg-rose-100 text-rose-800 border-rose-300`
  * Follow-up: `bg-amber-100 text-amber-800 border-amber-300`
  * Negotiation: `bg-purple-100 text-purple-800 border-purple-300`
  * Contacted: `bg-indigo-100 text-indigo-800 border-indigo-300`

---

## 7. Historical Design Values Comparison

The user provided historical brand values to compare against the current CRM codebase:

| Token / Role | Historical Value | Current CRM Value | Same? | Detailed Analysis & Evolution Context |
| :--- | :--- | :--- | :--- | :--- |
| **Background** | `#FADCD9` (Soft Pink/Red Tint) | `#F8FAF8` (M3 Surface Light) / `#111413` (M3 Dark) | **NO** | The CRM migrated completely from the legacy reddish/pink palette to an official Google Material Design 3 neutral palette with a subtle teal tint (`#F8FAF8` in light mode, `#111413` in dark mode). The historical `#FADCD9` has 0 occurrences in the codebase. |
| **Primary** | `#C00000` (Crimson Red) | `#00695C` (M3 Deep Teal) / `#80D5C4` (M3 Teal Light) | **NO** | The primary brand identity was decisively updated from red (`#C00000`) to high-density SaaS Deep Teal (`#00695C`). This evokes trust, professional telecommunications, and clarity for prolonged operational screen time. Primary dark mode uses `#80D5C4`. |
| **Accent** | `#8B0000` (Dark Red / Maroon) | `#2E6E5C` (Deep Teal) / `#1F3A5F` (Navy Slate) | **NO** | The CRM replaced the dark red accent with deep teal `#2E6E5C` (103 occurrences) and navy/indigo `#1F3A5F` (37 occurrences), reserving red tones (`#BA1A1A`, `#FFDAD6`) exclusively for error states, destructive actions, and dropped leads. |
| **White** | `#FFFFFF` (Pure White) | `#FFFFFF` (M3 Surface Container Lowest) | **YES** | White remains a core surface and text token (`--md-sys-color-surface-container-lowest: #FFFFFF`, `--md-sys-color-on-primary: #FFFFFF`). It is used for card surfaces, primary button labels, and high-contrast table backgrounds. |
| **Secondary Text** | `#4A4A4A` (Dark Gray) | `#3F4946` (On-Surface Variant) / `#6F7976` (Outline Text) | **NO** *(Close)* | While functionally similar, the CRM uses Material 3 color-calibrated neutrals: `#3F4946` (neutral with a microscopic cool-green tint) for primary secondary text, and `#6F7976` for metadata/timestamps, replacing generic un-tinted `#4A4A4A`. |
| **Dark Outline** | `#2E2E2E` (Charcoal) | `#BEC9C5` (Light Variant) / `#3F4946` (Dark Variant) | **NO** | Card and input outlines in the CRM use `#BEC9C5`/`#3F4946` (with opacity modifiers like `/40` and `/60`). Solid `#2E2E2E` was removed in favor of lower-contrast, optically balanced structural dividers that reduce visual fatigue. |

---

## 8. Guidance & Visual DNA for the DialPulse Marketing Website

To ensure the new DialPulse marketing website shares the **exact same visual DNA** as the CRM while optimizing for public-facing conversion, follow these architectural recommendations:

### 8.1 Color Palette & Brand Consistency
1. **Primary Brand Anchor:** Use **Deep Teal `#00695C`** for primary CTA buttons, logo marks, and active states. Provide hover states with `#005449`.
2. **Hero & Page Canvas:**
   * **Light Mode:** Use `#F8FAF8` for the body canvas, elevated with `#FFFFFF` for feature cards.
   * **Dark Mode:** Use `#111413` for the page background, elevated with `#1D201F` for feature cards and `#272B2A` for interactive elements.
3. **Contrast Accent:** Use **Tertiary Navy/Slate `#1F3A5F`** for secondary CTA buttons or executive enterprise callouts, and **M3 Teal Light `#80D5C4`** for glowing badges and dark mode accents.
4. **Reserve Red for Alerts Only:** Do not use `#C00000` or `#8B0000` for primary marketing graphics or buttons. Red in the DialPulse ecosystem is strictly reserved for compliance alerts, dropped calls, or negative indicators (`#BA1A1A`).

### 8.2 Typography Pairing
* **Display Headlines:** Pair **Plus Jakarta Sans** (`font-weight: 700`, tight letter spacing `-0.02em`) for hero headlines, section titles, and value props.
* **Body Text:** Use **Roboto** (`font-weight: 400`, line-height: `1.6`) for descriptive paragraphs and marketing feature descriptions.
* **Metric Callouts:** Use **JetBrains Mono** (`font-mono`) for metrics, conversion percentages, telecaller call volumes, and live counter numbers (e.g. `12,840 calls/day`).

### 8.3 Shapes & Physical Layout
* **Action CTAs:** Always format primary action buttons and lead capture fields with **`rounded-full` (pill shape)** with `min-h-[48px]` to `min-h-[52px]` and `px-6` to `px-8`.
* **Feature Cards & Bento Grids:** Use **`rounded-[24px]`** with `border border-[#BEC9C5]/40 dark:border-[#3F4946]/40` and `bg-[#F8FAF8] dark:bg-[#1D201F]`.
* **Badges / Eyebrows:** Use rounded pill chips (`rounded-full px-3 py-1 text-xs font-semibold bg-[#CCE8E1] text-[#00201B] dark:bg-[#004F46] dark:text-[#80D5C4]`).

### 8.4 UI Element Consistency
* **Iconography:** Use `lucide-react` with `strokeWidth={1.75}` or `Material Symbols Outlined` to match the in-app toolbars.
* **Subtle Motion:** Use spring easing transitions for interactive card hovers (`transition-all duration-200 hover:-translate-y-1 hover:shadow-lg`).
* **Live Product Previews:** When featuring mock screenshots or interactive demos on the marketing website, render them using the authentic CRM components (`WidgetCard`, `StatusPill`, `LeadCard`) with the extracted color tokens.

---
*Generated strictly via read-only inspection of the DialPulse CRM codebase. No application source code was modified during this extraction.*
