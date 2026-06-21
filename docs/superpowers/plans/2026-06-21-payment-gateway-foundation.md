# Payment Gateway Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a provider-agnostic `mandates` table to Supabase and a Mandate Status column + "Set Up Mandate" button to the Retainers page in admin.html.

**Architecture:** New `mandates` Supabase table (one row per mandate attempt, linked to `retainers`) with RLS. The admin UI reads all mandates at startup into `allMandates[]` and derives badge state per retainer row. A "Set Up Mandate" button inserts a `pending` row — no bank details, no provider API. Provider integration (Ozow or other) slots in later by replacing the button's handler.

**Tech Stack:** Supabase (PostgreSQL + PostgREST + RLS), Vanilla JS, Supabase JS CDN v2 (`sb` client already available in admin.html)

## Global Constraints

- `admin.html` is a single ~6100-line file — no build step, no imports. All JS is inline.
- Supabase client is `sb` (Supabase JS v2, CDN). Use `sb.from('mandates').select/insert` — never raw fetch for Supabase reads.
- All new Supabase tables must have RLS enabled with an `authenticated` policy. No anon access.
- Follow existing badge pattern exactly: `sigBadge()` is the reference implementation in `admin.html`.
- Follow existing confirm pattern exactly: `opsConfirm({ title, message, confirmText, tone })` — returns a Promise\<boolean\>.
- Follow existing load pattern: `loadMandates()` must `console.warn` on error, never throw.
- Design tokens: `--black:#0A0A09`, `--emerald:#1A5C3A`, `--gold:#B8955A`, `--silk:#EDE9E3`.
- Commit after every task. Commit messages use conventional commits (`feat:`, `fix:`, etc.).

---

### Task 1: Supabase migration — `mandates` table + RLS

**Files:**
- Supabase project: `wdbsmcxzhmdkfjoftulm` (apply via Supabase MCP `apply_migration`)

**Interfaces:**
- Produces: `mandates` table with columns `id`, `retainer_id`, `client_id`, `status`, `provider`, `mandate_reference`, `mandate_type`, `notes`, `created_at`, `activated_at`, `cancelled_at`, `cancel_reason` — used by Task 2

- [ ] **Step 1: Apply the migration**

Use the Supabase MCP tool `apply_migration` with project_id `wdbsmcxzhmdkfjoftulm`, name `create_mandates_table`, and the following SQL:

```sql
CREATE TABLE IF NOT EXISTS mandates (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  retainer_id        uuid NOT NULL REFERENCES retainers(id) ON DELETE CASCADE,
  client_id          uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  status             text NOT NULL DEFAULT 'pending',
  provider           text,
  mandate_reference  text,
  mandate_type       text,
  notes              text,
  created_at         timestamptz DEFAULT now(),
  activated_at       timestamptz,
  cancelled_at       timestamptz,
  cancel_reason      text
);

ALTER TABLE mandates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_all" ON mandates
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE INDEX mandates_retainer_id_idx ON mandates (retainer_id);
CREATE INDEX mandates_client_id_idx ON mandates (client_id);
```

- [ ] **Step 2: Verify the table and RLS**

Run this SQL via `execute_sql` on the same project:

```sql
SELECT
  c.column_name,
  c.data_type,
  c.is_nullable
FROM information_schema.columns c
WHERE c.table_name = 'mandates'
ORDER BY c.ordinal_position;
```

Expected: 12 rows — id, retainer_id, client_id, status, provider, mandate_reference, mandate_type, notes, created_at, activated_at, cancelled_at, cancel_reason.

Then verify RLS:

```sql
SELECT relrowsecurity FROM pg_class WHERE relname = 'mandates';
```

Expected: `true`.

- [ ] **Step 3: Commit**

```bash
git commit --allow-empty -m "feat(db): mandates table — debit mandate lifecycle tracking"
```

(Empty commit since the migration was applied directly via MCP, not as a file. This marks the task in git history.)

---

### Task 2: admin.html — mandate tracking UI

**Files:**
- Modify: `admin.html` (single file — all changes are in this file)

**Interfaces:**
- Consumes: `mandates` table from Task 1 (columns: `id`, `retainer_id`, `client_id`, `status`, `created_at`)
- Consumes: `allRetainers` (already loaded), `allClients` (already loaded), `sb` Supabase client, `opsConfirm()`, `toast()`, `esc()`, `clientDisplayName()`
- Produces: `allMandates[]` global, `loadMandates()`, `mandateStatusFor(retainer)`, `mandateBadge(retainer)`, `setupMandate(retainerId)` — all used inline in the retainers table render

Before starting, read `admin.html` lines 1440–1450 (globals), 3298–3302 (Promise.all), 3408–3415 (loadSigningRequests), and 6062–6090 (renderRetainersTable) to confirm exact anchor strings.

- [ ] **Step 1: Add `allMandates` global**

Find this line (around line 1446):
```javascript
let allSigningRequests = [];
```

Add immediately after it:
```javascript
let allMandates = [];
```

- [ ] **Step 2: Add `loadMandates()` function**

Find this exact block (around line 3410):
```javascript
async function loadSigningRequests() {
  const { data, error } = await sb.from('signing_requests').select('*');
  if (error) console.warn('[loadSigningRequests]', error.message);
  allSigningRequests = data || [];
}
```

Add immediately after it:
```javascript
async function loadMandates() {
  const { data, error } = await sb.from('mandates').select('*').order('created_at', { ascending: false });
  if (error) console.warn('[loadMandates]', error.message);
  allMandates = data || [];
}
```

- [ ] **Step 3: Add `loadMandates()` to `loadAll()`**

Find this exact line (around line 3300):
```javascript
  await Promise.all([loadStats(), loadBookings(), loadSlots(), loadServices(), loadContacts(), loadClients(), loadProjects(), loadRecentActivity(), loadRetainerOverview(), loadQuotes(), loadInvoices(), loadRetainers(), loadProposalEcosystem(), loadSigningRequests()]);
```

Replace it with:
```javascript
  await Promise.all([loadStats(), loadBookings(), loadSlots(), loadServices(), loadContacts(), loadClients(), loadProjects(), loadRecentActivity(), loadRetainerOverview(), loadQuotes(), loadInvoices(), loadRetainers(), loadProposalEcosystem(), loadSigningRequests(), loadMandates()]);
```

- [ ] **Step 4: Add `mandateStatusFor()` and `mandateBadge()` helpers**

Find this exact line (around line 6062):
```javascript
function renderRetainersTable() {
```

Add these two functions immediately before it:

```javascript
function mandateStatusFor(retainer) {
  return allMandates.find(m => m.retainer_id === retainer.id) || null;
}

function mandateBadge(retainer) {
  const m = mandateStatusFor(retainer);
  if (!m)                       return '<td><span class="badge" style="opacity:.35">No Mandate</span></td>';
  if (m.status === 'active')    return '<td><span class="badge badge-ok">Active ✓</span></td>';
  if (m.status === 'pending')   return '<td><span class="badge badge-amber">Pending</span></td>';
  if (m.status === 'suspended') return '<td><span class="badge badge-amber" style="opacity:.7">Suspended</span></td>';
  if (m.status === 'failed')    return '<td><span class="badge badge-declined">Failed</span></td>';
  return `<td><span class="badge" style="opacity:.5">${esc(m.status)}</span></td>`;
}

```

- [ ] **Step 5: Update `renderRetainersTable()` — add Mandate column to thead**

Find this exact string inside `renderRetainersTable()`:
```javascript
    <thead><tr><th>Client</th><th>Plan</th><th>Monthly</th><th>Billing Day</th><th>Next Payment</th><th>Status</th><th>Actions</th></tr></thead>
```

Replace with:
```javascript
    <thead><tr><th>Client</th><th>Plan</th><th>Monthly</th><th>Billing Day</th><th>Next Payment</th><th>Status</th><th>Mandate</th><th>Actions</th></tr></thead>
```

- [ ] **Step 6: Update `renderRetainersTable()` — add badge cell and Set Up Mandate button**

Find this exact block inside the `allRetainers.map(r => {` callback:
```javascript
        <td><span class="badge ${badgeCls}">${esc(r.payment_status || 'Pending')}</span></td>
        <td class="td-actions">
          <button class="btn-ghost btn-sm" onclick="openRetainerModal('${r.client_id}')">History</button>
          <button class="btn-ghost btn-sm" onclick="openRecordPaymentModal('${r.id}')">Record Payment</button>
        </td>
```

Replace with:
```javascript
        <td><span class="badge ${badgeCls}">${esc(r.payment_status || 'Pending')}</span></td>
        ${mandateBadge(r)}
        <td class="td-actions">
          <button class="btn-ghost btn-sm" onclick="openRetainerModal('${r.client_id}')">History</button>
          <button class="btn-ghost btn-sm" onclick="openRecordPaymentModal('${r.id}')">Record Payment</button>
          ${(m => !m || m.status === 'cancelled' || m.status === 'failed')(mandateStatusFor(r)) ? `<button class="btn-ghost btn-sm" onclick="setupMandate('${r.id}')">Set Up Mandate</button>` : ''}
        </td>
```

- [ ] **Step 7: Add `setupMandate()` function**

Find this exact line (immediately after `renderRetainersTable()` closes, around line 6089):
```javascript
function openRecordPaymentModal(retainerId) {
```

Add immediately before it:
```javascript
async function setupMandate(retainerId) {
  const retainer = allRetainers.find(r => r.id === retainerId);
  if (!retainer) return;
  const client = allClients.find(c => c.id === retainer.client_id) || {};
  const ok = await opsConfirm({
    title: 'Set Up Debit Mandate',
    message: `Create a pending debit mandate for ${clientDisplayName(client)}?`,
    confirmText: 'Create Mandate',
    tone: 'emerald'
  });
  if (!ok) return;
  const { error } = await sb.from('mandates').insert({
    retainer_id: retainerId,
    client_id: retainer.client_id,
    status: 'pending'
  });
  if (error) { toast('Error creating mandate.'); return; }
  toast('Mandate created — pending provider setup.');
  await loadMandates();
  renderRetainersTable();
}

```

- [ ] **Step 8: Manual verify**

Open `https://oakandpixel.co.za` in a browser (or wait for Vercel deploy after commit). Log in to the admin. Navigate to the Retainers page.

Check:
- A "Mandate" column appears between Status and Actions
- Each row shows "No Mandate" (muted, since no mandates exist yet)
- Each row has a "Set Up Mandate" button in Actions
- Click "Set Up Mandate" on any retainer → confirm dialog appears with "Create a pending debit mandate for [client name]?"
- Click "Create Mandate" → toast "Mandate created — pending provider setup." appears
- The row's Mandate badge changes from "No Mandate" to "Pending" (amber)
- The "Set Up Mandate" button disappears from that row (since status is now `pending`)
- Run this in Supabase to confirm the row was inserted:

```sql
SELECT id, retainer_id, client_id, status, created_at FROM mandates ORDER BY created_at DESC LIMIT 5;
```

Expected: one row with `status = 'pending'`.

- [ ] **Step 9: Commit**

```bash
git add admin.html
git commit -m "feat(admin): mandate status column and Set Up Mandate button on Retainers page"
```
