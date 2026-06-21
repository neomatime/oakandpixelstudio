# Client Lifecycle Pipeline Design

**Date:** 2026-06-21
**Status:** Approved
**Sub-project:** A of 4 — Autonomous Client Lifecycle Engine

---

## Goal

Give OPS Studio a visible, intelligent client journey pipeline — showing where every client stands in their lifecycle, automatically advancing their stage as documents are created and milestones reached, and surfacing the next action needed at a glance.

## Context

The Command Center already contains clients, proposals, quotes, invoices, retainers, projects, bookings, and welcome letters as separate data entities. What's missing is the connective tissue: a lifecycle stage that ties these together into a coherent client journey, and a visual pipeline that makes the whole picture legible at a glance.

This is Sub-project A of the Autonomous Client Lifecycle Engine. It establishes the "spine" that later sub-projects (automation triggers, health intelligence, lead management) will attach to.

## Scope

**In scope:**
- `lifecycle_stage` column on the `clients` table
- Client-side derivation engine (`deriveClientStage`) running at load time
- Stage badge + inline override dropdown on the Clients table
- New Pipeline page (kanban board with client cards)
- Simplified health indicator on pipeline cards
- Next action prompts per stage

**Out of scope (later sub-projects):**
- Full client health intelligence dashboard (Sub-project C)
- Workflow automation triggers between document states (Sub-project B)
- Lead capture and discovery session management (Sub-project D)
- Drag-and-drop stage changes on the kanban board

---

## Stage Definitions

Seven stages cover the full OPS client journey:

| Stage | Meaning |
|---|---|
| `Lead` | Prospect — interested but no engagement started |
| `Discovery` | Discovery session booked or completed |
| `Proposal` | Proposal or quote exists (any status) |
| `Agreement` | Quote accepted or proposal approved |
| `Onboarding` | Invoice paid — project and welcome letter phase |
| `Active` | Retainer running, project in delivery |
| `Partner` | Long-term established client — manual only |

Stage order (for comparison): Lead < Discovery < Proposal < Agreement < Onboarding < Active < Partner.

---

## Data Model

### `clients` table — one new column

```sql
ALTER TABLE clients ADD COLUMN IF NOT EXISTS lifecycle_stage TEXT DEFAULT 'Lead';
```

- Default: `'Lead'` for all new clients
- Values: `'Lead'` | `'Discovery'` | `'Proposal'` | `'Agreement'` | `'Onboarding'` | `'Active'` | `'Partner'`
- Nullable: NO (default `'Lead'`)

No new tables, no new API endpoints.

---

## Derivation Engine

### `deriveClientStage(clientId)` — client-side function

Runs using already-loaded global arrays. No extra DB calls. Returns the highest qualifying stage for the given client.

**Derivation rules (evaluated highest → lowest, first match wins):**

| Stage | Condition |
|---|---|
| `Partner` | Manual only — never auto-derived |
| `Active` | `allRetainers` has a row with `client_id === clientId` AND `payment_status !== 'Cancelled'` |
| `Onboarding` | `allInvoices` has a row with `client_id === clientId` AND `payment_status === 'Paid'` |
| `Agreement` | `allQuotes` has a row with `client_id === clientId` AND `status === 'Accepted'` OR `allProposals` has a row with `client_id === clientId` AND `status === 'Approved'` |
| `Proposal` | `allProposals` or `allQuotes` has any row with `client_id === clientId` |
| `Discovery` | Manual only — the `bookings` table has no `client_id` FK. Future: add `client_id` to bookings to enable auto-derivation. |
| `Lead` | Default when none of the above apply |

### Auto-advance behaviour

After `loadAll()` resolves, for each client:
1. Call `deriveClientStage(client.id)` — get derived stage
2. Compare to `client.lifecycle_stage` (stored)
3. If derived stage is **higher** than stored stage → silently PATCH `clients` via `sb.from('clients').update({ lifecycle_stage: derivedStage }).eq('id', client.id)`
4. If derived stage is **lower or equal** → leave stored value unchanged (respects manual override)

Stage comparison uses the ordered array: `['Lead','Discovery','Proposal','Agreement','Onboarding','Active','Partner']`.

The `'Partner'` stage is never auto-derived — it is always set manually.

No toast, no modal, no disruption. Silent background update only.

---

## Clients Table Enhancement

### New "Stage" column

Added between client name and plan in `renderClientsTable()`.

**thead:** `<th>Stage</th>` inserted after `<th>Client</th>`

**Row cell:** `${stageBadge(r)}` — a `<td>` containing a styled badge:

| Stage | Badge style |
|---|---|
| Lead | Muted gray, `opacity:.5` |
| Discovery | Muted gold tint |
| Proposal | Gold (`#B8955A`) |
| Agreement | Amber |
| Onboarding | Teal / accent |
| Active | Emerald (`#1A5C3A`) |
| Partner | Deep emerald, bold |

Clicking the badge opens an inline stage-change dropdown using the existing `ops-select` pattern. Selecting a new stage:
1. PATCHes `lifecycle_stage` on the client record
2. Updates `allClients` in memory
3. Re-renders the clients table and refreshes the pipeline page if visible

### `stageFor(clientId)` helper

```javascript
function stageFor(clientId) {
  const c = allClients.find(c => c.id === clientId);
  return c?.lifecycle_stage || 'Lead';
}
```

---

## Pipeline Page

### Navigation

New nav item added after "Clients":

```html
<button class="nav-item" data-page="pipeline">
  <!-- icon -->
  Pipeline
</button>
```

### Layout

Horizontal scrollable strip of 7 stage columns. Each column:
- Header: stage name + client count badge
- Body: vertical stack of client cards
- Width: fixed (e.g., 220px per column), horizontally scrollable on overflow

### Client Cards

Each card displays:
```
[🟢] Acme Corp                    [Signature]
     Discovery → 8 days
     Schedule discovery session
```

**Card fields:**
- **Health dot** — 🟢 / 🟡 / 🔴 (see Health Scoring below)
- **Client name** — `clientDisplayName(client)`
- **Plan pill** — `client.selected_plan` or `client.project_type` (small badge)
- **Days in stage** — `Math.floor((Date.now() - stageEnteredAt) / 86400000)` days (see below)
- **Next action** — one line (see Next Action Prompts below)

Clicking a card opens the existing client detail panel (same as clicking a client row on the Clients page).

### Days in Stage

Tracked via a `stage_entered_at` column on `clients`:

```sql
ALTER TABLE clients ADD COLUMN IF NOT EXISTS stage_entered_at TIMESTAMPTZ DEFAULT now();
```

Updated to `now()` whenever `lifecycle_stage` changes (both via auto-advance and manual override).

### Health Scoring (simplified)

`clientHealth(client)` — returns `'green'` | `'amber'` | `'red'`:

| Indicator | Score |
|---|---|
| Overdue invoice exists for this client | 🔴 Red |
| Days in current stage > 30 | 🔴 Red |
| Days in current stage > 14 | 🟡 Amber |
| Missing `email` or `company` | 🟡 Amber |
| Otherwise | 🟢 Green |

Rules evaluated in order — first match wins. Full health intelligence is deferred to Sub-project C.

### Next Action Prompts

`nextAction(client)` — returns a short string:

| Stage | Condition | Prompt |
|---|---|---|
| Lead | — | Schedule discovery session |
| Discovery | — | Create proposal |
| Proposal | Any proposal/quote is `Draft` | Send proposal |
| Proposal | All proposals/quotes are `Sent` | Follow up with client |
| Agreement | No signed SOW/MSA | Generate & sign MSA / SOW |
| Agreement | SOW/MSA sent | Awaiting signature |
| Onboarding | No welcome letter sent | Send welcome letter |
| Onboarding | Welcome letter sent, no project | Create project workspace |
| Active | Invoice overdue | Record payment |
| Active | — | View project |
| Partner | — | Review retainer |

---

## File Changes

| File | Change |
|---|---|
| Supabase migration | Add `lifecycle_stage TEXT DEFAULT 'Lead'` and `stage_entered_at TIMESTAMPTZ DEFAULT now()` to `clients` |
| `admin.html` | Add `deriveClientStage()`, `stageFor()`, `stageBadge()`, `clientHealth()`, `nextAction()` helpers; update `renderClientsTable()` with Stage column + inline dropdown; add Pipeline page HTML + `renderPipelinePage()` function; add Pipeline nav item; wire derivation engine into `loadAll()` |

---

## Design Tokens & Conventions

- Design tokens: `--black:#0A0A09`, `--emerald:#1A5C3A`, `--gold:#B8955A`, `--silk:#EDE9E3`
- `admin.html` is a single ~6200-line file — no build step, all JS inline
- Supabase client: `sb` (Supabase JS v2, CDN) — use `sb.from(...)` for all DB operations
- Follow existing badge pattern (`sigBadge`, `mandateBadge`) for `stageBadge`
- Follow existing `ops-select` pattern for the inline stage dropdown
- RLS: `clients` table already has `authenticated` policy — no changes needed
