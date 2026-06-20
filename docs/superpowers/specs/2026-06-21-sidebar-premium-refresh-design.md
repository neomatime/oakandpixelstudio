# Sidebar Premium Refresh — Design Spec

**Goal:** Elevate the sidebar's visual quality without changing its structure, layout, or behaviour.

**Architecture:** CSS-only changes to existing selectors in `admin.html`. No new HTML, no JS changes, no new pages.

**Design Tokens in use:** `--gold:#B8955A`, `--emerald:#1A5C3A`, `--sidebar:#0d0d0c`, `--border`, `--border-hi`, `--mist`, `--off-white`, `--font-d`, `--font-m`, `--font-b`

---

## Direction: Refined Depth + Gold Accent (A + B)

### 1. Sidebar background — subtle vertical gradient

Replace the flat `background:var(--sidebar)` with a very subtle top-to-bottom gradient:
```css
background: linear-gradient(180deg, #111110 0%, #0A0A09 100%);
```
Adds dimensionality without changing the perceived colour palette.

### 2. Brand area — gold label + refined mark

- `brand-label` ("Studio Admin") changes from `color:var(--mist)` to `color:var(--gold)` at reduced opacity (~0.6) — warm, editorial
- `brand-name` ("Oak & Pixel") gets Cormorant Garamond (`var(--font-d)`) at ~1rem — uses the display font intentionally
- `brand-mark` border becomes a very subtle gold tint: `border-color:rgba(184,149,90,.2)`

### 3. Nav active state — gold label + soft glow

- Active nav item text changes from `color:var(--off-white)` to `color:rgba(245,244,241,.95)` (no change) but the active `::before` indicator bar gets a subtle box-shadow glow: `box-shadow: 1px 0 8px rgba(26,92,58,.6)`
- Active item background deepens slightly: `background:rgba(26,92,58,.12)` → `rgba(26,92,58,.15)`
- Active item SVG icon gets `color:var(--gold)` — the icon becomes gold when selected, the label stays off-white. Creates a warm premium detail without being loud.

### 4. Nav item hover — refined lift

- Hover background: `rgba(245,244,241,.04)` (slightly more visible than current `.03`)
- Hover icon: subtle gold tint on svg — `color:rgba(184,149,90,.6)`

### 5. Section labels — refined separator

- Slightly brighter: `color:rgba(245,244,241,.28)` (up from `.22`)
- Add a 1px hairline rule before each label group for better visual separation

### 6. Footer user card — subtle refinement

- `user-initials` box: gold border tint — `border-color:rgba(184,149,90,.25)`, gold text stays as is
- `btn-signout` border: slightly warmer — `border-color:rgba(245,244,241,.12)`

### 7. Light mode parity

All changes above need `[data-theme="light"]` counterparts using the existing light palette conventions.

---

## What does NOT change

- Sidebar width, collapse behaviour, transition timing
- Nav item structure, spacing, font sizes
- Any JS
- Any page outside the sidebar
