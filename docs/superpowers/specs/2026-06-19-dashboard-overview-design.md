# Dashboard Overview Redesign — Design Spec

**Date:** 2026-06-19
**Status:** Approved

---

## Goal

Replace the booking-only Overview page with a full business overview that surfaces leads, clients, bookings, and a unified activity feed — giving a single-glance picture of the whole studio pipeline.

## What Exists Today

The Overview page has:
- 4 stat cards: Total Bookings / Pending Review / Confirmed / Open Slots
- Two charts side by side: "Bookings by Status" (donut) + "Last 7 Days" (bar)
- A "Recent Bookings" table (`#recent-list`)

## What Changes

### 1. Stat Cards (replace all 4)

| Card | Data source | Colour |
|------|------------|--------|
| Active Leads | `COUNT(*) FROM contacts WHERE converted_at IS NULL` | Emerald (`--emerald-l`) |
| Total Clients | `COUNT(*) FROM clients` | Gold (`--gold`) |
| Pending Bookings | `COUNT(*) FROM bookings WHERE status = 'pending'` | Amber (`--amber`) |
| Open Slots | `COUNT(*) FROM slots WHERE date >= today AND booked = false` (already in `loadStats()`) | Muted |

The existing `stat-total`, `stat-pending`, `stat-confirmed`, `stat-slots` elements are repurposed:
- `stat-total` → Active Leads
- `stat-pending` → Total Clients
- `stat-confirmed` → Pending Bookings
- `stat-slots` → Open Slots (unchanged)

The stat label text and icon SVGs are updated in HTML; JS populates the numbers.

### 2. Remove: Bookings by Status donut chart

The `chart-status` canvas, `statusChart` variable, and the donut chart render block are removed. The pipeline row communicates the same information more concisely.

### 3. Replace layout below stat cards

The `charts-row` div and `#recent-list` card are replaced by a two-column content row:

```
[  Recent Activity feed (wider)  ] [ Pipeline + Trend chart (narrower) ]
```

CSS: a new `.overview-content` grid with `grid-template-columns: 1.5fr 1fr; gap: 1rem`.

### 4. Recent Activity Feed (`#activity-feed`)

A unified stream of the 8 most recent events across all three data types, sorted newest-first.

**Data fetched in parallel:**
- `contacts`: `select('id,full_name,project_type,created_at').is('converted_at',null).order('created_at',{ascending:false}).limit(8)`
- `clients`: `select('id,full_name,created_at').order('created_at',{ascending:false}).limit(8)`
- `bookings`: `select('id,date,time,status,created_at').order('created_at',{ascending:false}).limit(8)`

**Merge:** Each record is tagged with a type (`lead`, `client`, `booking`). All three arrays are concatenated, sorted by `created_at` descending, and the first 8 are rendered.

**Row layout per item:**

```
[icon] [primary text]           [time-ago]
       [secondary text]
```

- **Lead (L icon, emerald):** primary = "New lead — {full_name}", secondary = project_type or "–"
- **Client (C icon, gold):** primary = "Converted to client — {full_name}", secondary = "via Contacts"
- **Booking (B icon, green if confirmed / amber if pending):** primary = "Booking {status} — {formatted date}", secondary = "{time} · {status}"

**Time-ago** formatting: <1h → "Xm ago", <24h → "Xh ago", <7d → "Xd ago", else short date.

### 5. Pipeline Row

A horizontal three-step strip showing Leads → Clients → Confirmed:

```
[ 12  Leads ] › [ 5  Clients ] › [ 8  Confirmed ]
```

Numbers sourced from `loadStats()` — which already fetches confirmed booking count from Supabase. Confirmed bookings are no longer a stat card, but `loadStats()` must still fetch and store the count so `loadPipeline()` can use it. Introduce a module-level variable `let confirmedCount = 0` (alongside the existing globals) that `loadStats()` sets, and `loadPipeline()` reads.

Colours: emerald / gold / ok-green.

### 6. Last 7 Days Chart (kept, repositioned)

The existing `trendChart` and `#chart-trend` canvas stay. The card moves from the `charts-row` into the right column, stacked below the pipeline row. No logic changes needed.

---

## File Changes

**`admin.html`** — single file, all changes inline:

1. **HTML — stat card labels + icons** (4 elements in `.stats-grid`): update text and SVG icons
2. **HTML — remove** `charts-row` div (contains `#chart-status` and `#chart-trend`)
3. **HTML — remove** the `#recent-list` card
4. **HTML — add** `.overview-content` two-column div containing:
   - Left: `.card` with `#activity-feed`
   - Right: `.card` with `#pipeline-row` + `.card` with `#chart-trend` (moved here)
5. **CSS — add** `.overview-content`, `.activity-row`, `.activity-icon`, `.activity-icon.*`, `.activity-txt`, `.activity-time`, `.pipeline-row`, `.pipe-step`, `.pipe-arrow` styles
6. **JS — modify `loadStats()`**: add two extra Supabase queries for active leads count and total clients count; populate the repurposed stat elements
7. **JS — add `loadRecentActivity()`**: fetch contacts + clients + bookings in parallel, merge, sort, render to `#activity-feed`
8. **JS — add `loadPipeline()`**: render counts into `#pipeline-row` (reuses stats already fetched — pass counts in rather than re-querying)
9. **JS — remove** `statusChart`, `loadStatusChart()` (donut chart), and any reference to `#chart-status`
10. **JS — modify `loadAll()`**: replace `loadStats()` sequence with `loadStats()` + `loadRecentActivity()`

---

## Data Model

No schema changes. All data already exists:
- `contacts.converted_at` — used to filter active leads (Build A)
- `clients` table — used for client count and activity (Build A)
- `bookings`, `slots` — already in use

---

## Styling Notes

- Activity icon colours: Lead = `var(--emerald-l)` bg tint / Client = `var(--gold)` bg tint / Booking confirmed = `var(--ok)` tint / Booking pending = `var(--amber)` tint
- Pipeline step borders share the card border style (`var(--border)`)
- No new fonts, no new design tokens needed

---

## Out of Scope

- Filtering the activity feed by type
- Clicking an activity row to navigate to that record
- Date range selection on the trend chart
- Any changes to Bookings, Contacts, Clients, Services, or Availability pages
