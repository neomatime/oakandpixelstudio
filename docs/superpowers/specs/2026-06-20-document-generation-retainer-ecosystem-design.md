# OPS Studio Command Center — Document Generation & Retainer Ecosystem Design

## Goal

Extend the OPS admin portal with dedicated management pages for Quotes, Invoices, and Retainers; a unified Documents repository; full-lifecycle document creation for Proposals, SOW, and Welcome Letters; and a PDF generation engine — all within the existing `admin.html` single-file architecture, preserving the current design language.

---

## Constraints (non-negotiable)

- Do not redesign the current application.
- Do not change the existing look and feel or design language.
- Do not create duplicate pages — enhance existing ones instead.
- Keep it lightweight, premium, and focused.
- Everything must feel like one cohesive product.

---

## Architecture

**Single file:** All changes go into `admin.html`. No new HTML/JS files. The file grows from ~3000 to approximately 5500–6000 lines.

**One new CDN dependency:**
```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
```
Added immediately after the existing Flatpickr `<script>` tag.

**PDF rendering zone** (added to `<body>` before `#page-loader`):
```html
<div id="pdf-render-zone" style="position:absolute;left:-9999px;top:0;width:210mm;background:#fff;"></div>
```

**New JS state:**
```js
let allProposals = [];
let allScopes = [];
let allWelcomeLetters = [];
let proposalSchemaReady = true;
```

Loaded in the same startup `Promise.all` as existing data, guarded by `proposalSchemaReady` flag.

**PDF generation** uses a single shared function:
```js
async function generatePDF(templateHTML, filename) {
  const zone = $('pdf-render-zone');
  zone.innerHTML = templateHTML;
  await html2pdf().set({
    margin: [15, 15, 15, 15],
    filename,
    html2canvas: { scale: 2, useCORS: true, logging: false },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  }).from(zone).save();
  zone.innerHTML = '';
}
```

Five template builder functions return HTML strings with inline styles:
`quoteTemplate(quote, client)`, `invoiceTemplate(invoice, client)`, `proposalTemplate(proposal, client)`, `sowTemplate(scope, client, proposal)`, `welcomeLetterTemplate(letter, client)`

---

## Database Schema — `migrations/007_documents_schema.sql`

Idempotent (same pattern as 006). Three new tables.

### `proposals`
```sql
CREATE TABLE IF NOT EXISTS proposals (
  id                UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  proposal_number   TEXT        NOT NULL UNIQUE,
  client_id         UUID        REFERENCES clients(id) ON DELETE SET NULL,
  service_id        UUID        REFERENCES services(id) ON DELETE SET NULL,
  title             TEXT        NOT NULL,
  status            TEXT        NOT NULL DEFAULT 'Draft',
  proposal_date     DATE        NOT NULL DEFAULT CURRENT_DATE,
  expiry_date       DATE,
  executive_summary TEXT,
  challenges        TEXT,
  solution          TEXT,
  deliverables      TEXT,
  timeline          TEXT,
  investment        TEXT,
  next_steps        TEXT,
  setup_fee         INTEGER     NOT NULL DEFAULT 0,
  monthly_retainer  INTEGER     NOT NULL DEFAULT 0,
  total_amount      INTEGER     NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);
```
Status values: `Draft` / `Sent` / `Approved` / `Rejected`

### `scopes` (Scope of Work)
```sql
CREATE TABLE IF NOT EXISTS scopes (
  id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  scope_number     TEXT        NOT NULL UNIQUE,
  proposal_id      UUID        REFERENCES proposals(id) ON DELETE SET NULL,
  client_id        UUID        REFERENCES clients(id) ON DELETE SET NULL,
  service_id       UUID        REFERENCES services(id) ON DELETE SET NULL,
  title            TEXT        NOT NULL,
  status           TEXT        NOT NULL DEFAULT 'Draft',
  scope_date       DATE        NOT NULL DEFAULT CURRENT_DATE,
  deliverables     TEXT,
  milestones       TEXT,
  timeline         TEXT,
  responsibilities TEXT,
  assumptions      TEXT,
  exclusions       TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);
```
Status values: `Draft` / `Sent` / `Approved`

### `welcome_letters`
```sql
CREATE TABLE IF NOT EXISTS welcome_letters (
  id                UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  letter_number     TEXT        NOT NULL UNIQUE,
  client_id         UUID        REFERENCES clients(id) ON DELETE SET NULL,
  status            TEXT        NOT NULL DEFAULT 'Draft',
  assigned_services TEXT[]      NOT NULL DEFAULT '{}',
  welcome_message   TEXT,
  important_info    TEXT,
  sent_at           TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);
```
Status values: `Draft` / `Sent`

All three tables: RLS enabled, `auth_all` policy (same pattern as existing tables).

**Auto-numbering:** document numbers are generated in JS using the existing `docNumber(prefix)` function, which produces date-stamped identifiers (e.g. `PROP-20260620-347`). New prefixes: `docNumber('PROP')`, `docNumber('SOW')`, `docNumber('WL')`. No DB trigger needed.

**Archiving:** an `archived BOOLEAN NOT NULL DEFAULT false` column is added to all five document-type tables. For the new tables (`proposals`, `scopes`, `welcome_letters`) it is included in `CREATE TABLE`. For existing tables (`quotes`, `invoices`), it is added via `ALTER TABLE ... ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT false` in migration 007. Archive action sets `archived = true` via `sb.from(table).update({ archived: true }).eq('id', id)`. The Documents page excludes archived records by default; a "Show Archived" toggle re-includes them. Status values remain unchanged.

---

## Navigation

**Sidebar** gains a second group below the existing "Navigation" group:

```
── Finance & Documents ─
  Quotes
  Invoices
  Retainers
  Documents
```

Uses the existing `.nav-label` class for the group heading and `.nav-item[data-page]` for the four buttons. No changes to the router (`switchPage()` already handles arbitrary page names).

---

## New Page Sections

Six new `<section class="page">` elements added after `#page-client-profile`:

| ID | Accessed via | Notes |
|---|---|---|
| `#page-quotes` | Sidebar | List + CRUD |
| `#page-invoices` | Sidebar | List + CRUD |
| `#page-retainers` | Sidebar | Metrics + list |
| `#page-documents` | Sidebar | Repository only, no creation |
| `#page-proposal-editor` | Client Profile / Services detail | Full-page form, not in sidebar |
| `#page-sow-editor` | Approved Proposal meta panel | Full-page form, not in sidebar |

---

## Quotes Page (`#page-quotes`)

**Toolbar:** search input + status filter tabs (All / Draft / Sent / Accepted / Declined / Expired) + "New Quote" button.

**Table columns:** Quote # · Client · Service · Amount · Status badge · Date · Actions (Edit, Download PDF, Delete)

- **Edit** — opens existing `openClientDocumentModal('quote', clientId)` pre-populated with the quote's data
- **Download PDF** — calls `generatePDF(quoteTemplate(quote, client), filename)`
- **Delete** — confirm dialog → `sb.from('quotes').delete().eq('id', id)`

"New Quote" opens the existing wide modal unchanged.

**Status badge colours:**
- Draft → `.badge` muted
- Sent → amber
- Accepted → `.badge-confirmed` (ok green)
- Declined → `.badge-declined` (err red)
- Expired → muted

**JS functions:** `loadQuotes()`, `renderQuotesTable(filter='all')`

---

## Invoices Page (`#page-invoices`)

Same structure as Quotes. Status tabs: All / Draft / Sent / Paid / Overdue / Cancelled.

**Additional:** "From Quote" button in toolbar opens a modal listing Accepted quotes. Selecting one pre-fills the invoice modal with matching client, service, and amounts.

**JS functions:** `loadInvoices()`, `renderInvoicesTable(filter='all')`, `openInvoiceFromQuote()`

---

## Retainers Page (`#page-retainers`)

**Metric strip** (4 `.stat-card` tiles, same pattern as Overview):
- Total MRR — sum of `monthly_retainer` where `payment_status` ≠ `'Cancelled'`
- Active Retainers — count where `payment_status` ≠ `'Cancelled'`
- Due This Month — count where `next_payment_date` falls in current calendar month
- Outstanding — count where `payment_status` = `'Overdue'`

**Table columns:** Client · Plan · Monthly Amount · Billing Day · Next Payment · Status · Actions

Actions per row:
- **Edit** — opens retainer edit modal
- **Payment History** — calls existing `openRetainerModal(clientId)`
- **Record Payment** — new modal: month (text), amount (number), date (date), status (select)

No "New Retainer" button — retainers are created from the Client Profile only.

**JS functions:** `loadRetainers()` (already partially exists), `renderRetainersTable()`, `openRecordPaymentModal(retainerId)`, `computeRetainerMetrics()`

---

## Documents Page (`#page-documents`)

**Pure repository — no creation flows here.**

**Toolbar:** search input (matches doc number, client name, title) + type filter tabs + "Show Archived" toggle.

**Type filter tabs:**
All · Quotes · Invoices · Proposals · SOW · Welcome Letters · Retainer Statements · Project Briefs · Completion Reports

Last three tabs render a `.empty-state` "Coming soon" when selected.

**Table columns:** # · Type (badge) · Client · Title / Description · Date · Status · Actions (Download PDF, Archive)

**Type badge colours:**
- Quote → gold
- Invoice → amber
- Proposal → emerald
- SOW → ok (green tint)
- Welcome Letter → muted

**Unified merge (JS):**
```js
function buildDocumentList() {
  return [
    ...allQuotes.map(q => ({ ...q, _type:'Quote', _num:q.quote_number, _date:q.quote_date, _status:q.status })),
    ...allInvoices.map(i => ({ ...i, _type:'Invoice', _num:i.invoice_number, _date:i.invoice_date, _status:i.payment_status })),
    ...allProposals.map(p => ({ ...p, _type:'Proposal', _num:p.proposal_number, _date:p.proposal_date, _status:p.status })),
    ...allScopes.map(s => ({ ...s, _type:'SOW', _num:s.scope_number, _date:s.scope_date, _status:s.status })),
    ...allWelcomeLetters.map(w => ({ ...w, _type:'Welcome Letter', _num:w.letter_number, _date:w.created_at, _status:w.status })),
  ].sort((a,b) => new Date(b._date) - new Date(a._date));
}
```

Archive sets `archived = true` on the source table record. Archived docs excluded from default view; "Show Archived" toggle re-includes them.

**JS functions:** `buildDocumentList()`, `renderDocumentsTable(filter='all')`, `archiveDocument(type, id)`

---

## Proposal Editor (`#page-proposal-editor`)

**Entry points:**
- Client Profile → "Generate Proposal" button → `openProposalEditor(null, clientId)`
- Documents page row → "View" → `openProposalEditor(proposalId, null)`
- Services detail toolbar → "Generate Proposal" → `openProposalEditor(null, null, serviceId)`

**Layout:** two-column grid (`1.35fr / 0.65fr`), same as existing service detail page.

**Left column** — scrollable content sections, each in a `.mini-panel`:
1. Executive Summary (textarea)
2. Challenges (textarea)
3. Our Solution (textarea)
4. Deliverables (textarea)
5. Timeline (textarea)
6. Investment (setup fee number + monthly retainer number + investment narrative textarea — auto-fills from selected service)
7. Next Steps (textarea)

**Right column** — sticky meta panel:
- Client avatar + name (read-only display)
- Service (dropdown — triggers Investment auto-fill on change)
- Title (text input)
- Status (Draft / Sent / Approved / Rejected)
- Proposal Date + Expiry Date
- Total Amount (auto-calculated: setup_fee + monthly_retainer, read-only display)
- Action buttons: **Save Draft** · **Generate PDF** · **Generate SOW** (shown only when status = `'Approved'`)
- Back button: "← Back to [Client Name]" or "← Back to Documents"

**JS functions:** `openProposalEditor(proposalId, clientId, serviceId)`, `saveProposal()`, `renderProposalEditor(proposal)`

---

## SOW Editor (`#page-sow-editor`)

**Entry point:** "Generate SOW" button in Proposal editor meta panel (Approved proposals only).

Auto-fills client, service, deliverables, and timeline from the linked proposal.

**Layout:** same two-column pattern as Proposal Editor.

**Left column sections:**
1. Deliverables (pre-filled from proposal, editable)
2. Milestones (textarea)
3. Timeline (pre-filled from proposal, editable)
4. Responsibilities (textarea — client vs OPS)
5. Assumptions (textarea)
6. Exclusions (textarea)

**Right meta panel:** client (read-only), linked proposal number (read-only), title, status (Draft / Sent / Approved), scope date. Action buttons: **Save** · **Generate PDF**. Back button: "← Back to Proposal [number]".

**JS functions:** `openSOWEditor(scopeId, proposalId)`, `saveScope()`, `renderSOWEditor(scope, proposal)`

---

## Welcome Letter Modal

**Entry point:** "Generate Welcome Letter" button in Client Profile actions row.

Uses the existing wide modal pattern (`.modal-box.wide`).

**Auto-filled (read-only):** client name, company, plan (`client.selected_plan`), start date (`client.project_start_date`), assigned services (derived from `allQuotes` + `allInvoices` filtered by `client_id` — rendered as read-only chip list).

**Editable fields:**
- Welcome message (textarea, pre-seeded: `"Welcome to Oak & Pixel Studio, [name]. We're thrilled to have [company] on board..."`)
- Important information (textarea, optional)

**Modal footer:** Save as Draft · Save & Generate PDF

Clients can have multiple letters (no UNIQUE constraint on `client_id` — re-onboarding or plan changes are valid reasons for a new letter).

**JS functions:** `openWelcomeLetterModal(clientId)`, `saveWelcomeLetter(clientId, download=false)`

---

## PDF Templates

All five templates share the same outer structure with inline styles. Google Fonts (`Cormorant Garamond`, `Jost`, `DM Mono`) load via `useCORS: true` in html2canvas.

**Shared structure:**
```
[OPS logo 32px]                    [DOC NUMBER — DM Mono]
───────────────── gold rule (1px, #B8955A) ─────────────
[Client logo if set]               [Company name — Jost]
                                   [Address / Email / Phone]

DOCUMENT TITLE                                ← Cormorant, 28px
Type · Date                                   ← DM Mono, uppercase, muted

[Body sections — vary by type]

─────────────────────────────────────────────────────────
Oak & Pixel Studio · hello@oakandpixel.co.za     Generated: [date]
```

**Quote / Invoice body:** two info tiles (date + expiry/due date), then line items table:

| Description | Amount |
|---|---|
| Setup Fee | R x,xxx |
| Monthly Retainer | R x,xxx |
| [Additional items…] | R x,xxx |
| **Total** | **R xx,xxx** |

**Proposal body:** numbered sections rendered in order — Executive Summary → Challenges → Our Solution → Deliverables → Timeline → Investment (line items table) → Next Steps.

**SOW body:** numbered sections — Deliverables → Milestones → Timeline → Responsibilities → Assumptions → Exclusions. Ends with two-column signature block (OPS · Client).

**Welcome Letter body:** client logo centred (large, 80px), letter-style greeting paragraph, partnership overview table (Plan · Start Date · Services), important info section (if provided), OPS closing sign-off.

---

## Existing Page Enhancements

### Client Profile

Two new buttons in `profile-actions` row (guarded by `proposalSchemaReady`):
```
[Edit Details] [Logo] [Generate Quote] [Generate Invoice] [Generate Proposal] [Generate Welcome Letter] [New Task]
```

Two new mini-panels added to the `activity-grid`:
- **Proposals** — lists `allProposals.filter(p => p.client_id === client.id)` with proposal number, status chip, and "View" link → `openProposalEditor(proposal.id, null)`
- **Documents** — "View all documents →" link navigates to `#page-documents` with client filter pre-applied

### Services Detail Page

"Generate Proposal" button added to `detail-actions` toolbar:
```
[Edit] [Deactivate] [Generate Quote] [Generate Invoice] [Generate Proposal]
```
Calls `openProposalEditor(null, null, service.id)` — proposal editor opens with service pre-selected; client picker visible in right meta panel.

### Projects Kanban

Service tag added to each kanban card if the task's `client_id` matches a client linked to quotes or invoices. Read-only display only — no new data entry or schema change. Uses existing `.project-tag` CSS class.

---

## Implementation Notes

- `proposalSchemaReady` flag: flipped to `false` on any schema error from proposals/scopes/welcome_letters tables. Guards all creation buttons and Document page panels (same pattern as `financeSchemaReady`).
- Document numbers generated client-side via existing `docNumber(prefix)` JS function. New prefixes: `PROP`, `SOW`, `WL`.
- `openProposalEditor` and `openSOWEditor` call `switchPage('proposal-editor')` / `switchPage('sow-editor')` internally — no changes to the router.
- All new CSS follows existing naming conventions (`.proposal-*`, `.sow-*`, `.doc-hub-*`).
- No light-mode CSS omissions — all new dark-mode `rgba(245,244,241,*)` values get corresponding `[data-theme="light"]` overrides.
- JS syntax check (`node -e "new Function(js)"`) to be run before every commit.

---

## Out of Scope (this phase)

- Retainer Statements, Project Briefs, Completion Reports — stubbed in Documents filter UI, not built
- Email delivery of documents
- Client-facing document portal
- Multi-currency support
- E-signature integration
