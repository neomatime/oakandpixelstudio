# Client Lifecycle Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a 7-stage client lifecycle system to OPS Studio — auto-derivation engine, stage badge on the Clients table, and a Pipeline kanban page showing all clients by stage.

**Architecture:** Two new columns on `clients` (`lifecycle_stage`, `stage_entered_at`). A client-side `runLifecycleEngine()` reads already-loaded global arrays after `loadAll()` and silently advances stages that qualify. Stage can always be overridden manually via an inline dropdown on the Clients table. A new Pipeline page renders a horizontal kanban board using the same data — no extra DB calls.

**Tech Stack:** Supabase (PostgreSQL + PostgREST + RLS via MCP), Vanilla JS, Supabase JS CDN v2 (`sb` client in admin.html), single-file `admin.html` (~6300 lines, no build step)

## Global Constraints

- `admin.html` is a single file — no build step, no imports. All JS is inline.
- Supabase client is `sb` (Supabase JS v2, CDN). Use `sb.from(...)` — never raw fetch for Supabase reads.
- Supabase project ID: `wdbsmcxzhmdkfjoftulm` (eu-west-1)
- Design tokens: `--black:#0A0A09`, `--emerald:#1A5C3A`, `--gold:#B8955A`, `--silk:#EDE9E3`
- Follow existing patterns exactly — `status-select` class for inline stage dropdown, `badge` classes for badge styling, `mandateBadge()` as reference for `stageBadge()`
- `loadAll()` is the single startup data-load function at line ~3300 — wire `runLifecycleEngine()` after its `Promise.all`
- Commit after every task. Commit messages use conventional commits (`feat:`, `fix:`, etc.)
- All new Supabase tables/columns must have RLS consistent with existing policy (`authenticated` policy for all operations)
- Stage order for comparison: `['Lead','Discovery','Proposal','Agreement','Onboarding','Active','Partner']`

## File Structure

| File | Change |
|---|---|
| `migrations/011_client_lifecycle.sql` | New — DDL for two new columns on `clients` |
| `admin.html` | Modify — helpers, Clients table Stage column, Pipeline nav + page + render function |

---

### Task 1: Supabase migration — lifecycle columns on clients

**Files:**
- Create: `migrations/011_client_lifecycle.sql`
- Supabase project: `wdbsmcxzhmdkfjoftulm` (apply via Supabase MCP `apply_migration`)

**Interfaces:**
- Produces: `clients.lifecycle_stage TEXT DEFAULT 'Lead'` and `clients.stage_entered_at TIMESTAMPTZ DEFAULT now()` — consumed by Tasks 2 and 3

- [ ] **Step 1: Apply the migration**

Use the Supabase MCP tool `apply_migration` with `project_id: "wdbsmcxzhmdkfjoftulm"`, `name: "client_lifecycle_columns"`, and the following SQL:

```sql
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS lifecycle_stage TEXT NOT NULL DEFAULT 'Lead',
  ADD COLUMN IF NOT EXISTS stage_entered_at TIMESTAMPTZ DEFAULT now();
```

- [ ] **Step 2: Verify the columns exist**

Use Supabase MCP `execute_sql` with:

```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'clients'
  AND column_name IN ('lifecycle_stage', 'stage_entered_at')
ORDER BY column_name;
```

Expected: 2 rows — `lifecycle_stage` (text, default `'Lead'`) and `stage_entered_at` (timestamptz, default `now()`).

- [ ] **Step 3: Create the migration file**

Create `migrations/011_client_lifecycle.sql` with this content:

```sql
-- Add lifecycle_stage and stage_entered_at to clients table
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS lifecycle_stage TEXT NOT NULL DEFAULT 'Lead',
  ADD COLUMN IF NOT EXISTS stage_entered_at TIMESTAMPTZ DEFAULT now();
```

- [ ] **Step 4: Commit**

```bash
git add migrations/011_client_lifecycle.sql
git commit -m "feat(db): add lifecycle_stage and stage_entered_at to clients"
```

---

### Task 2: Core helpers + Clients table Stage column

**Files:**
- Modify: `admin.html` (single file — all changes inline)

**Interfaces:**
- Consumes: `clients.lifecycle_stage`, `clients.stage_entered_at` from Task 1; `allClients`, `allQuotes`, `allInvoices`, `allRetainers`, `allProposals`, `allProjects`, `allWelcomeLetters` (all existing globals); `sb`, `toast()`, `esc()`, `clientDisplayName()`
- Produces: `LIFECYCLE_STAGES` (ordered array), `deriveClientStage(clientId)`, `stageFor(clientId)`, `stageBadge(r)`, `clientHealth(client)`, `nextAction(client)`, `setClientStage(clientId, stage)`, `runLifecycleEngine()` — all consumed by Task 3

Before starting, read `admin.html` around these lines to confirm exact anchor strings:
- Line ~1480: `const DOC_STATUSES` — for placing `LIFECYCLE_STAGES`
- Line ~6088: `function mandateStatusFor(retainer)` — for placing helper functions
- Line ~4255: `renderClients()` thead — for Stage column
- Line ~4262: plan `<td>` cell — for `stageBadge()` insertion
- Line ~4268: `.client-row` event listener — for stage-select listener
- Line ~3302: `await Promise.all([...loadMandates()]);` — for engine wiring
- Line ~839: `</style>` — for pipeline CSS

- [ ] **Step 1: Add `LIFECYCLE_STAGES` constant**

Find this exact string (line ~1480):
```javascript
const DOC_STATUSES = ['Draft','Sent','Accepted','Declined'];
```

Add immediately before it:
```javascript
const LIFECYCLE_STAGES = ['Lead','Discovery','Proposal','Agreement','Onboarding','Active','Partner'];
```

- [ ] **Step 2: Add helper functions block**

Find this exact string (line ~6088):
```javascript
function mandateStatusFor(retainer) {
```

Add immediately before it:

```javascript
function stageClass(stage) {
  if (stage === 'Active' || stage === 'Partner') return 'badge-confirmed';
  if (stage === 'Onboarding') return 'badge-ok';
  if (stage === 'Agreement' || stage === 'Proposal') return 'badge-amber';
  return '';
}

function stageOpacityStyle(stage) {
  if (stage === 'Lead')      return ' style="opacity:.4"';
  if (stage === 'Discovery') return ' style="opacity:.65"';
  return '';
}

function stageFor(clientId) {
  const c = allClients.find(c => c.id === clientId);
  return c?.lifecycle_stage || 'Lead';
}

function stageBadge(r) {
  const stage = r.lifecycle_stage || 'Lead';
  const cls = stageClass(stage);
  const opStyle = stageOpacityStyle(stage);
  const opts = LIFECYCLE_STAGES.map(s =>
    `<option value="${s}"${s === stage ? ' selected' : ''}>${s}</option>`
  ).join('');
  return `<td><span class="badge ${cls}"${opStyle}><select class="status-select stage-select" data-id="${r.id}">${opts}</select></span></td>`;
}

function deriveClientStage(clientId) {
  if (allRetainers.some(r => r.client_id === clientId && r.payment_status !== 'Cancelled'))
    return 'Active';
  if (allInvoices.some(i => i.client_id === clientId && i.payment_status === 'Paid'))
    return 'Onboarding';
  if (allQuotes.some(q => q.client_id === clientId && q.status === 'Accepted') ||
      allProposals.some(p => p.client_id === clientId && p.status === 'Approved'))
    return 'Agreement';
  if (allProposals.some(p => p.client_id === clientId) ||
      allQuotes.some(q => q.client_id === clientId))
    return 'Proposal';
  return 'Lead';
}

function clientHealth(client) {
  const clientId = client.id;
  const daysInStage = client.stage_entered_at
    ? Math.floor((Date.now() - new Date(client.stage_entered_at).getTime()) / 86400000)
    : 0;
  if (allInvoices.some(i => i.client_id === clientId && i.payment_status === 'Overdue')) return 'red';
  if (daysInStage > 30) return 'red';
  if (daysInStage > 14) return 'amber';
  if (!client.email || !client.company) return 'amber';
  return 'green';
}

function nextAction(client) {
  const stage = client.lifecycle_stage || 'Lead';
  const clientId = client.id;
  if (stage === 'Lead')      return 'Schedule discovery session';
  if (stage === 'Discovery') return 'Create proposal';
  if (stage === 'Proposal') {
    const hasUnsent = allProposals.some(p => p.client_id === clientId && p.status === 'Draft') ||
                      allQuotes.some(q => q.client_id === clientId && q.status === 'Draft');
    return hasUnsent ? 'Send proposal' : 'Follow up with client';
  }
  if (stage === 'Agreement') {
    const hasSentLetter = allWelcomeLetters.some(w => w.client_id === clientId && w.sent_at);
    return hasSentLetter ? 'Awaiting signature' : 'Generate & sign MSA / SOW';
  }
  if (stage === 'Onboarding') {
    const hasSentLetter = allWelcomeLetters.some(w => w.client_id === clientId && w.sent_at);
    if (!hasSentLetter) return 'Send welcome letter';
    return allProjects.some(p => p.client_id === clientId) ? 'View project' : 'Create project workspace';
  }
  if (stage === 'Active') {
    return allInvoices.some(i => i.client_id === clientId && i.payment_status === 'Overdue')
      ? 'Record payment' : 'View project';
  }
  if (stage === 'Partner') return 'Review retainer';
  return '';
}

async function setClientStage(clientId, stage) {
  const now = new Date().toISOString();
  const { error } = await sb.from('clients')
    .update({ lifecycle_stage: stage, stage_entered_at: now })
    .eq('id', clientId);
  if (error) { console.warn('[setClientStage]', error.message); return; }
  const idx = allClients.findIndex(c => c.id === clientId);
  if (idx !== -1) { allClients[idx].lifecycle_stage = stage; allClients[idx].stage_entered_at = now; }
  renderClients();
  if (document.getElementById('page-pipeline')?.classList?.contains('active')) renderPipelinePage();
}

async function runLifecycleEngine() {
  for (const client of allClients) {
    if (client.lifecycle_stage === 'Partner') continue;
    const derived = deriveClientStage(client.id);
    const storedIdx = LIFECYCLE_STAGES.indexOf(client.lifecycle_stage || 'Lead');
    const derivedIdx = LIFECYCLE_STAGES.indexOf(derived);
    if (derivedIdx > storedIdx) {
      const now = new Date().toISOString();
      await sb.from('clients').update({ lifecycle_stage: derived, stage_entered_at: now }).eq('id', client.id);
      client.lifecycle_stage = derived;
      client.stage_entered_at = now;
    }
  }
}

```

- [ ] **Step 3: Wire `runLifecycleEngine()` into `loadAll()`**

Find this exact string (line ~3302):
```javascript
  await Promise.all([loadStats(), loadBookings(), loadSlots(), loadServices(), loadContacts(), loadClients(), loadProjects(), loadRecentActivity(), loadRetainerOverview(), loadQuotes(), loadInvoices(), loadRetainers(), loadProposalEcosystem(), loadSigningRequests(), loadMandates()]);
  endLoad();
```

Replace with:
```javascript
  await Promise.all([loadStats(), loadBookings(), loadSlots(), loadServices(), loadContacts(), loadClients(), loadProjects(), loadRecentActivity(), loadRetainerOverview(), loadQuotes(), loadInvoices(), loadRetainers(), loadProposalEcosystem(), loadSigningRequests(), loadMandates()]);
  await runLifecycleEngine();
  endLoad();
```

- [ ] **Step 4: Add Stage column to `renderClients()` thead**

Find this exact string (line ~4257):
```javascript
      <th>Client</th><th>Business</th><th>Plan</th><th>Start</th><th>Contact</th><th>Actions</th>
```

Replace with:
```javascript
      <th>Client</th><th>Business</th><th>Stage</th><th>Plan</th><th>Start</th><th>Contact</th><th>Actions</th>
```

- [ ] **Step 5: Add `stageBadge(r)` cell to each row**

Find this exact string (line ~4262, inside `renderClients()` row template):
```javascript
      <td><span class="badge badge-confirmed">${esc(r.selected_plan || r.project_type || 'Unassigned')}</span></td>
```

Replace with:
```javascript
      ${stageBadge(r)}<td><span class="badge badge-confirmed">${esc(r.selected_plan || r.project_type || 'Unassigned')}</span></td>
```

- [ ] **Step 6: Add `stage-select` change listener in `renderClients()`**

Find this exact string (line ~4268, end of `renderClients()`):
```javascript
  c.querySelectorAll('.client-row').forEach(row => row.addEventListener('click', () => openClientProfile(row.dataset.id)));
```

Add immediately before it:
```javascript
  c.querySelectorAll('.stage-select').forEach(sel => {
    sel.addEventListener('change', e => { e.stopPropagation(); setClientStage(sel.dataset.id, sel.value); });
  });
```

- [ ] **Step 7: Manual verify — Clients table Stage column**

Open admin.html (or deployed site) in a browser, log in, navigate to Clients. Check:
- A "Stage" column appears between Business and Plan columns
- Each client row shows a stage badge (muted for Lead, gold/amber for active stages, green for Active/Partner)
- Clicking the stage badge opens a dropdown with all 7 stage options
- Selecting a different stage updates the badge immediately and persists on refresh (check in Supabase: `SELECT id, lifecycle_stage, stage_entered_at FROM clients LIMIT 5;`)
- Clients with accepted quotes auto-advance to "Agreement" on next load (check by finding a client with an Accepted quote)

- [ ] **Step 8: Commit**

```bash
git add admin.html
git commit -m "feat(admin): lifecycle stage engine + Stage column on Clients table"
```

---

### Task 3: Pipeline page

**Files:**
- Modify: `admin.html` (single file — add nav item, page section, CSS, render function, page-switch wiring)

**Interfaces:**
- Consumes: `LIFECYCLE_STAGES`, `stageBadge()`, `clientHealth()`, `nextAction()`, `renderPipelinePage()` from Task 2; `allClients`, `clientDisplayName()`, `openClientProfile()`, `esc()`
- Produces: `renderPipelinePage()` function, `page-pipeline` section, Pipeline nav item

Before starting, read admin.html around these exact lines:
- Line ~922: Clients nav button — for inserting Pipeline nav item after it
- Line ~1193: end of `page-client-profile` section — for inserting Pipeline page section
- Line ~839: `</style>` — for pipeline CSS
- Line ~2898: `PAGE_TITLES` object — for adding `pipeline` entry
- Line ~2913: `switchPage()` function body — for render hook
- Line ~4272: end of `renderClients()` — for placing `renderPipelinePage()` after it

- [ ] **Step 1: Add Pipeline CSS before `</style>`**

Find this exact string (line ~838):
```
.kanban-add-task:hover{transform:translateY(-1px);}
</style>
```

Replace with:
```
.kanban-add-task:hover{transform:translateY(-1px);}
.pipeline-wrap{overflow-x:auto;height:calc(100vh - 120px);padding:.75rem;}
.pipeline-board{display:flex;gap:.75rem;align-items:flex-start;min-width:max-content;height:100%;}
.pipeline-col{width:215px;flex-shrink:0;display:flex;flex-direction:column;background:rgba(245,244,241,.025);border:1px solid var(--border);}
.pipeline-col-head{display:flex;align-items:center;justify-content:space-between;padding:.6rem .75rem;border-bottom:1px solid var(--border);}
.pipeline-col-title{font-family:var(--font-m);font-size:.58rem;letter-spacing:.12em;text-transform:uppercase;color:rgba(245,244,241,.46);}
.pipeline-col-count{font-family:var(--font-m);font-size:.55rem;color:var(--mist);background:rgba(245,244,241,.05);padding:.15rem .4rem;}
.pipeline-col-body{padding:.5rem;display:flex;flex-direction:column;gap:.45rem;overflow-y:auto;flex:1;}
.pipeline-card{background:var(--card);border:1px solid rgba(255,255,255,.07);border-radius:5px;padding:.6rem .7rem;cursor:pointer;transition:border-color .15s;}
.pipeline-card:hover{border-color:rgba(255,255,255,.18);}
.pipeline-card-top{display:flex;align-items:center;gap:.35rem;margin-bottom:.3rem;}
.pipeline-health{font-size:.75rem;line-height:1;flex-shrink:0;}
.pipeline-name{font-size:.78rem;font-weight:500;color:var(--off-white);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.pipeline-card .badge{font-size:.52rem;padding:.08rem .28rem;margin-bottom:.28rem;display:inline-block;}
.pipeline-meta{font-size:.62rem;color:rgba(245,244,241,.35);margin-bottom:.15rem;}
.pipeline-action{font-size:.62rem;color:var(--gold);font-style:italic;}
.pipeline-empty{font-size:.68rem;color:rgba(245,244,241,.22);padding:.4rem;text-align:center;margin:0;}
[data-theme="light"] .pipeline-col{background:rgba(26,26,24,.025);border-color:rgba(26,26,24,.1);}
[data-theme="light"] .pipeline-col-title{color:rgba(26,26,24,.5);}
[data-theme="light"] .pipeline-col-count{color:rgba(26,26,24,.5);background:rgba(26,26,24,.07);}
[data-theme="light"] .pipeline-card{background:#fff;border-color:rgba(26,26,24,.1);}
[data-theme="light"] .pipeline-name{color:var(--black);}
[data-theme="light"] .pipeline-meta{color:rgba(26,26,24,.4);}
</style>
```

- [ ] **Step 2: Add Pipeline nav item**

Find this exact string (line ~922):
```html
      <button class="nav-item" data-page="clients">
        <svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/><path d="M16 3.13a4 4 0 010 7.75"/><polyline points="17 21 19 23 23 19"/></svg>
        Clients
        <span class="nav-badge" id="clients-badge"></span>
      </button>
    </nav>
```

Replace with:
```html
      <button class="nav-item" data-page="clients">
        <svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/><path d="M16 3.13a4 4 0 010 7.75"/><polyline points="17 21 19 23 23 19"/></svg>
        Clients
        <span class="nav-badge" id="clients-badge"></span>
      </button>

      <button class="nav-item" data-page="pipeline">
        <svg viewBox="0 0 24 24"><rect x="3" y="3" width="4" height="18" rx="1"/><rect x="10" y="3" width="4" height="13" rx="1"/><rect x="17" y="3" width="4" height="9" rx="1"/></svg>
        Pipeline
      </button>
    </nav>
```

- [ ] **Step 3: Add Pipeline page section**

Find this exact string (line ~1191):
```html
      <section class="page" id="page-client-profile">
        <div id="client-profile-root"><p class="loading-row">Select a client to view their profile.</p></div>
      </section>

      <!-- ═══════════════════════════════════ QUOTES PAGE ═══════════════════════════════════ -->
```

Replace with:
```html
      <section class="page" id="page-client-profile">
        <div id="client-profile-root"><p class="loading-row">Select a client to view their profile.</p></div>
      </section>

      <section class="page" id="page-pipeline">
        <div class="pipeline-wrap">
          <div class="pipeline-board" id="pipeline-board"></div>
        </div>
      </section>

      <!-- ═══════════════════════════════════ QUOTES PAGE ═══════════════════════════════════ -->
```

- [ ] **Step 4: Add `pipeline` to `PAGE_TITLES`**

Find this exact string (line ~2898):
```javascript
const PAGE_TITLES = { overview:'Overview', bookings:'Bookings', availability:'Availability', projects:'Projects', services:'Services', 'service-detail':'Service Details', contacts:'Contacts', clients:'Clients', 'client-profile':'Client Profile', quotes:'Quotes', invoices:'Invoices', retainers:'Retainers', documents:'Documents', 'proposal-editor':'Proposal', 'sow-editor':'Scope of Work' };
```

Replace with:
```javascript
const PAGE_TITLES = { overview:'Overview', bookings:'Bookings', availability:'Availability', projects:'Projects', services:'Services', 'service-detail':'Service Details', contacts:'Contacts', clients:'Clients', 'client-profile':'Client Profile', pipeline:'Pipeline', quotes:'Quotes', invoices:'Invoices', retainers:'Retainers', documents:'Documents', 'proposal-editor':'Proposal', 'sow-editor':'Scope of Work' };
```

- [ ] **Step 5: Wire `renderPipelinePage()` into `switchPage()`**

Find this exact string (line ~2916):
```javascript
  if (name === 'documents') renderDocumentsTable();
  enhanceOpsSelects($('page-' + name) || document);
```

Replace with:
```javascript
  if (name === 'documents') renderDocumentsTable();
  if (name === 'pipeline') renderPipelinePage();
  enhanceOpsSelects($('page-' + name) || document);
```

- [ ] **Step 6: Add `renderPipelinePage()` function**

Find this exact string (line ~4273):
```javascript
function openClientOnboarding(id = null) {
```

Add immediately before it:

```javascript
function renderPipelinePage() {
  const board = document.getElementById('pipeline-board');
  if (!board) return;
  const healthEmoji = { green: '🟢', amber: '🟡', red: '🔴' };
  board.innerHTML = LIFECYCLE_STAGES.map(stage => {
    const clients = allClients.filter(c => (c.lifecycle_stage || 'Lead') === stage);
    const cards = clients.map(client => {
      const health = clientHealth(client);
      const days = client.stage_entered_at
        ? Math.floor((Date.now() - new Date(client.stage_entered_at).getTime()) / 86400000)
        : 0;
      const action = nextAction(client);
      const plan = esc(client.selected_plan || client.project_type || '');
      return `<div class="pipeline-card" onclick="openClientProfile('${client.id}')">
        <div class="pipeline-card-top">
          <span class="pipeline-health">${healthEmoji[health]}</span>
          <span class="pipeline-name">${esc(clientDisplayName(client))}</span>
        </div>
        ${plan ? `<span class="badge">${plan}</span><br>` : ''}
        <div class="pipeline-meta">${days}d in stage</div>
        <div class="pipeline-action">${esc(action)}</div>
      </div>`;
    }).join('');
    return `<div class="pipeline-col">
      <div class="pipeline-col-head">
        <span class="pipeline-col-title">${stage}</span>
        <span class="pipeline-col-count">${clients.length}</span>
      </div>
      <div class="pipeline-col-body">${cards || '<p class="pipeline-empty">No clients</p>'}</div>
    </div>`;
  }).join('');
}

```

- [ ] **Step 7: Manual verify — Pipeline page**

Open admin.html in a browser, log in. Check:
- "Pipeline" nav item appears in the sidebar under Clients
- Clicking Pipeline shows a horizontal kanban board with 7 columns (Lead → Discovery → Proposal → Agreement → Onboarding → Active → Partner)
- Each column header shows the stage name and a client count
- Each client card shows: health emoji (🟢/🟡/🔴), client name, plan badge, days in stage, next action in gold italic
- Clicking a client card navigates to that client's profile page
- Clients are sorted into the correct columns matching their `lifecycle_stage` value
- Empty columns show "No clients" in a muted style

- [ ] **Step 8: Commit**

```bash
git add admin.html
git commit -m "feat(admin): Pipeline page — lifecycle kanban board with health scoring and next actions"
```
