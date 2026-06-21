# Payment Gateway Foundation Design

**Date:** 2026-06-21
**Status:** Approved

---

## Goal

Lay the provider-agnostic foundation for recurring debit order / DebiCheck collections against client retainers. No live payment provider is integrated at this stage — the foundation covers data modelling and the admin UI mandate tracking layer. Provider integration (Ozow or equivalent) slots in later as a single-layer addition.

## Context

The OPS Studio Command Center already has a `retainers` table (one retainer per client, tracking `monthly_retainer`, `billing_day`, `payment_status`, `next_payment_date`) and a `retainer_payments` table (individual payment records). What's missing is mandate lifecycle tracking — who has authorised a debit, the history of those authorisations, and their current state.

## Scope

**In scope:**
- New `mandates` Supabase table
- RLS policy on `mandates`
- `loadMandates()` function in `admin.html`
- Mandate Status badge column on the Retainers page
- "Set Up Mandate" button per retainer row (creates a `pending` record, no bank details)

**Out of scope (deferred to provider integration phase):**
- Ozow or any other provider API calls
- Webhook handling
- Bank account detail collection
- Mandate cancellation / reactivation controls
- Mandate history panel in client detail modal
- Scheduled collection triggers

---

## Data Model

### `mandates` table (new)

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | uuid | NO | PK, default `gen_random_uuid()` |
| `retainer_id` | uuid | NO | FK → `retainers.id` |
| `client_id` | uuid | NO | FK → `clients.id` (denormalised for easy querying) |
| `status` | text | NO | `pending` · `active` · `cancelled` · `suspended` · `failed` |
| `provider` | text | YES | `'ozow'` · `'netcash'` etc — null until provider decided |
| `mandate_reference` | text | YES | Provider's mandate ID — null until live integration |
| `mandate_type` | text | YES | `'DebiCheck'` · `'NAEDO'` · `'EFT'` — null for now |
| `notes` | text | YES | Free-text admin notes |
| `created_at` | timestamptz | YES | default `now()` |
| `activated_at` | timestamptz | YES | Set when provider confirms active |
| `cancelled_at` | timestamptz | YES | Set on cancellation |
| `cancel_reason` | text | YES | Optional cancellation note |

### `retainers` table (unchanged)

No columns added. Mandate state is derived at query time by fetching the most recent `mandates` row for each retainer.

### RLS

```sql
ALTER TABLE mandates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all" ON mandates
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);
```

Matches the pattern used on every other table in the project.

---

## Admin UI

### `loadMandates()` — new function

Fetches all mandate rows at app startup, stored in `allMandates = []`. Added to the existing `Promise.all([...])` in `loadAll()`, same pattern as `loadSigningRequests()`.

```javascript
let allMandates = [];

async function loadMandates() {
  const { data, error } = await sb.from('mandates').select('*').order('created_at', { ascending: false });
  if (error) console.warn('[loadMandates]', error.message);
  allMandates = data || [];
}
```

### `mandateStatusFor(retainer)` — new helper

Returns the most recent mandate for a retainer, or `null` if none.

```javascript
function mandateStatusFor(retainer) {
  return allMandates.find(m => m.retainer_id === retainer.id) || null;
}
```

### `mandateBadge(retainer)` — new helper

Returns a `<td>` element with the mandate status badge, following the same shape as `sigBadge()`.

Badge styles:

| Status | Label | Colour |
|---|---|---|
| null (no mandate) | No Mandate | Muted gray |
| `pending` | Pending | Gold (`#B8955A`) |
| `active` | Active | Emerald (`#1A5C3A`) |
| `cancelled` | Cancelled | Muted gray |
| `suspended` | Suspended | Amber/warning |
| `failed` | Failed | Red/error |

### Retainers table — new "Mandate" column

A `<th>Mandate</th>` column added between the existing Status and Actions columns. Each row includes `${mandateBadge(r)}`.

### "Set Up Mandate" button

Appears in the Actions cell when the retainer has no mandate, or its latest mandate is `cancelled` or `failed`. Hidden when status is `pending`, `active`, or `suspended`.

On click:
1. `opsConfirm("Create a pending debit mandate for [client name]?")` — existing confirm pattern
2. If confirmed: POST to Supabase inserting a `mandates` row with `status: 'pending'`, `retainer_id`, `client_id`
3. Toast: "Mandate created — pending provider setup"
4. `await loadMandates()` → `renderRetainersTable()`

No modal, no form, no bank details at this stage.

---

## Status Lifecycle

```
         [Set Up Mandate button]
                  │
                  ▼
              pending  ◄─── "Set Up Mandate" re-clicked after failed/cancelled
                  │
      [Provider integration — future]
                  │
         ┌────────┴────────┐
         ▼                 ▼
       active           failed
         │
    ┌────┴────┐
    ▼         ▼
cancelled  suspended
```

At this foundation stage, only `pending` is reachable from the UI. All other transitions are reserved for provider webhook handling.

---

## Security

- `mandates` table has RLS enabled; anon key cannot read or write it
- No sensitive bank account data is stored at this stage
- No API keys or provider credentials are introduced

---

## File Changes

| File | Change |
|---|---|
| Supabase migration | Create `mandates` table + RLS policy |
| `admin.html` | Add `allMandates`, `loadMandates`, `mandateStatusFor`, `mandateBadge`, Mandate column in retainers table, "Set Up Mandate" button |
