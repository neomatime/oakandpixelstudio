# Document Generation & Retainer Ecosystem Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend `admin.html` with Quotes/Invoices/Retainers/Documents management pages, full Proposal/SOW/Welcome Letter creation flows, and a PDF generation engine — all within the existing single-file architecture.

**Architecture:** All changes go into one file: `C:\Users\Neo\OneDrive\Documents\Oak & Pixel Studio\OPS\oakandpixel\admin.html` (~2956 lines → ~5500 lines). One new CDN (html2pdf.js). One new SQL migration file. No other new files.

**Tech Stack:** Vanilla JS, Supabase JS CDN v2 (`sb`), html2pdf.js 0.10.1, existing CSS design tokens. Existing patterns: `switchPage()`, `toast()`, `showModal()`, `docNumber()`, `$()`, `emptyState()`, `money()`, `esc()`, `compactDate()`.

**Spec:** `docs/superpowers/specs/2026-06-20-document-generation-retainer-ecosystem-design.md`

**JS syntax check** (run after every commit):
```bash
node -e "const fs=require('fs');new Function(fs.readFileSync('admin.html','utf8').match(/<script[\s\S]*?>([\s\S]*?)<\/script>/g).map(s=>s.replace(/<\/?script[^>]*>/g,'')).join(''))"
```

---

### Task 1: html2pdf.js CDN + PDF render zone + `generatePDF()`

**Files:**
- Modify: `admin.html` — add CDN, add render zone div, add JS function

- [ ] **Step 1: Add html2pdf.js CDN script tag**

Find the existing Flatpickr script in `<head>` (search for `flatpickr`). Add immediately after it:
```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
```

- [ ] **Step 2: Add PDF render zone to `<body>`**

Find `<div id="page-loader"` in the HTML. Insert immediately before it:
```html
<div id="pdf-render-zone" style="position:absolute;left:-9999px;top:0;width:210mm;background:#fff;"></div>
```

- [ ] **Step 3: Add `generatePDF()` function to JS**

Find `function docNumber(prefix)` at line ~1155. Insert immediately before it:
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

- [ ] **Step 4: Run JS syntax check**
```bash
cd "C:\Users\Neo\OneDrive\Documents\Oak & Pixel Studio\OPS\oakandpixel"
node -e "const fs=require('fs');new Function(fs.readFileSync('admin.html','utf8').match(/<script[\s\S]*?>([\s\S]*?)<\/script>/g).map(s=>s.replace(/<\/?script[^>]*>/g,'')).join(''))"
```
Expected: no output (clean).

- [ ] **Step 5: Commit**
```bash
git add admin.html
git commit -m "feat: add html2pdf.js CDN, pdf-render-zone, generatePDF helper"
```

---

### Task 2: Migration 007 — new tables + `archived` column

**Files:**
- Create: `migrations/007_documents_schema.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- ============================================================
-- OAK & PIXEL STUDIO — DOCUMENTS SCHEMA
-- Run in Supabase SQL Editor. Safe to run more than once.
-- ============================================================

-- ── PROPOSALS ───────────────────────────────────────────────
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
  archived          BOOLEAN     NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "auth_all" ON proposals FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── SCOPES (Scope of Work) ───────────────────────────────────
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
  archived         BOOLEAN     NOT NULL DEFAULT false,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE scopes ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "auth_all" ON scopes FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── WELCOME LETTERS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS welcome_letters (
  id                UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  letter_number     TEXT        NOT NULL UNIQUE,
  client_id         UUID        REFERENCES clients(id) ON DELETE SET NULL,
  status            TEXT        NOT NULL DEFAULT 'Draft',
  assigned_services TEXT[]      NOT NULL DEFAULT '{}',
  welcome_message   TEXT,
  important_info    TEXT,
  sent_at           TIMESTAMPTZ,
  archived          BOOLEAN     NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE welcome_letters ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "auth_all" ON welcome_letters FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── ADD archived COLUMN TO EXISTING TABLES ───────────────────
ALTER TABLE quotes   ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT false;
```

- [ ] **Step 2: Commit**
```bash
git add migrations/007_documents_schema.sql
git commit -m "feat: add migration 007 — proposals, scopes, welcome_letters, archived columns"
```

---

### Task 3: Global state, loaders, PAGE_TITLES, loadAll()

**Files:**
- Modify: `admin.html:963-974` (global state block)
- Modify: `admin.html:1235` (PAGE_TITLES)
- Modify: `admin.html:1272` (loadAll Promise.all)
- Modify: `admin.html:~1342` (after loadRetainerOverview — add new loaders)

- [ ] **Step 1: Extend global state block**

Find lines 963–974 (the state variables block). After `let financeSchemaReady = true;` add:
```js
let allRetainers = [];
let allProposals = [];
let allScopes = [];
let allWelcomeLetters = [];
let proposalSchemaReady = true;
let retainerSchemaReady = true;
let docFilter = 'all';
let docSearch = '';
let quotesFilter = 'all';
let invoicesFilter = 'all';
let showArchived = false;
```

- [ ] **Step 2: Update PAGE_TITLES (line 1235)**

Replace:
```js
const PAGE_TITLES = { overview:'Overview', bookings:'Bookings', availability:'Availability', projects:'Projects', services:'Services', 'service-detail':'Service Details', contacts:'Contacts', clients:'Clients', 'client-profile':'Client Profile' };
```
With:
```js
const PAGE_TITLES = { overview:'Overview', bookings:'Bookings', availability:'Availability', projects:'Projects', services:'Services', 'service-detail':'Service Details', contacts:'Contacts', clients:'Clients', 'client-profile':'Client Profile', quotes:'Quotes', invoices:'Invoices', retainers:'Retainers', documents:'Documents', 'proposal-editor':'Proposal', 'sow-editor':'Scope of Work' };
```

- [ ] **Step 3: Update loadAll() Promise.all (line 1272)**

Replace:
```js
  await Promise.all([loadStats(), loadBookings(), loadSlots(), loadServices(), loadContacts(), loadClients(), loadProjects(), loadRecentActivity(), loadRetainerOverview()]);
```
With:
```js
  await Promise.all([loadStats(), loadBookings(), loadSlots(), loadServices(), loadContacts(), loadClients(), loadProjects(), loadRecentActivity(), loadRetainerOverview(), loadQuotes(), loadInvoices(), loadRetainers(), loadProposals(), loadScopes(), loadWelcomeLetters()]);
```

- [ ] **Step 4: Add six loader functions after `loadRetainerOverview()` (after line ~1342)**

Find the closing `}` of `loadRetainerOverview()` and insert after it:
```js
async function loadQuotes() {
  if (!financeSchemaReady) return;
  const { data, error } = await sb.from('quotes').select('*').order('created_at', { ascending: false });
  if (error) { if (isSchemaError(error)) financeSchemaReady = false; return; }
  allQuotes = data || [];
  renderQuotesTable();
}
async function loadInvoices() {
  if (!financeSchemaReady) return;
  const { data, error } = await sb.from('invoices').select('*').order('created_at', { ascending: false });
  if (error) { if (isSchemaError(error)) financeSchemaReady = false; return; }
  allInvoices = data || [];
  renderInvoicesTable();
}
async function loadRetainers() {
  if (!financeSchemaReady) return;
  const { data, error } = await sb.from('retainers').select('*').order('created_at', { ascending: false });
  if (error) { if (isSchemaError(error)) retainerSchemaReady = false; return; }
  allRetainers = data || [];
  renderRetainersTable();
}
async function loadProposals() {
  const { data, error } = await sb.from('proposals').select('*').order('created_at', { ascending: false });
  if (error) { if (isSchemaError(error)) proposalSchemaReady = false; return; }
  allProposals = data || [];
}
async function loadScopes() {
  if (!proposalSchemaReady) return;
  const { data, error } = await sb.from('scopes').select('*').order('created_at', { ascending: false });
  if (error) return;
  allScopes = data || [];
}
async function loadWelcomeLetters() {
  if (!proposalSchemaReady) return;
  const { data, error } = await sb.from('welcome_letters').select('*').order('created_at', { ascending: false });
  if (error) return;
  allWelcomeLetters = data || [];
}
```

- [ ] **Step 5: Run JS syntax check, then commit**
```bash
node -e "const fs=require('fs');new Function(fs.readFileSync('admin.html','utf8').match(/<script[\s\S]*?>([\s\S]*?)<\/script>/g).map(s=>s.replace(/<\/?script[^>]*>/g,'')).join(''))"
git add admin.html
git commit -m "feat: add global state, loaders, updated PAGE_TITLES and loadAll"
```

---

### Task 4: Fix `renderServiceDetail()` global state conflict

**Files:**
- Modify: `admin.html:2641-2642` (local vars instead of global overwrite)

- [ ] **Step 1: Change lines 2641–2642 from global assignment to local**

Find (in `renderServiceDetail()`):
```js
  allQuotes = quotesRes.data || [];
  allInvoices = invoicesRes.data || [];
  const associatedClientNames = [...new Set([
    ...allQuotes.map(q => clientDisplayName(allClients.find(c => c.id === q.client_id) || {})).filter(Boolean),
    ...allInvoices.map(i => clientDisplayName(allClients.find(c => c.id === i.client_id) || {})).filter(Boolean)
  ])];
```
Replace with:
```js
  const serviceQuotes = quotesRes.data || [];
  const serviceInvoices = invoicesRes.data || [];
  const associatedClientNames = [...new Set([
    ...serviceQuotes.map(q => clientDisplayName(allClients.find(c => c.id === q.client_id) || {})).filter(Boolean),
    ...serviceInvoices.map(i => clientDisplayName(allClients.find(c => c.id === i.client_id) || {})).filter(Boolean)
  ])];
```

- [ ] **Step 2: Update all references to `allQuotes`/`allInvoices` within `renderServiceDetail()`**

Still inside `renderServiceDetail()`, find the HTML template (mini-panel for Quotes and Invoices). Replace `allQuotes` → `serviceQuotes` and `allInvoices` → `serviceInvoices` in:
```js
      <div class="mini-panel">
        <div class="mini-panel-head"><span class="mini-panel-title">Quotes</span><span class="badge badge-pending">${serviceQuotes.length}</span></div>
        <div class="mini-panel-body doc-list">${documentRows(serviceQuotes, 'quote') || '<p class="td-dim">No quotes generated yet.</p>'}</div>
      </div>
      <div class="mini-panel">
        <div class="mini-panel-head"><span class="mini-panel-title">Invoices</span><span class="badge badge-pending">${serviceInvoices.length}</span></div>
        <div class="mini-panel-body doc-list">${documentRows(serviceInvoices, 'invoice') || '<p class="td-dim">No invoices generated yet.</p>'}</div>
      </div>
```

- [ ] **Step 3: Update `saveDocumentWithClient()` post-save refresh (line ~2924)**

Find:
```js
  await Promise.all([selectedServiceId ? renderServiceDetail() : Promise.resolve(), selectedClientId ? renderClientProfile() : Promise.resolve(), loadRetainerOverview()]);
```
Replace with:
```js
  await Promise.all([selectedServiceId ? renderServiceDetail() : Promise.resolve(), selectedClientId ? renderClientProfile() : Promise.resolve(), loadRetainerOverview(), loadQuotes(), loadInvoices()]);
```

- [ ] **Step 4: Run syntax check, commit**
```bash
node -e "const fs=require('fs');new Function(fs.readFileSync('admin.html','utf8').match(/<script[\s\S]*?>([\s\S]*?)<\/script>/g).map(s=>s.replace(/<\/?script[^>]*>/g,'')).join(''))"
git add admin.html
git commit -m "fix: use local serviceQuotes/serviceInvoices in renderServiceDetail to preserve globals"
```

---

### Task 5: PDF templates — Quote and Invoice

**Files:**
- Modify: `admin.html` — add two template functions in JS (after `generatePDF`)

- [ ] **Step 1: Add shared PDF header/footer helpers + quoteTemplate + invoiceTemplate**

Find `async function generatePDF(templateHTML, filename)` (added in Task 1). Insert after its closing `}`:

```js
function _pdfStyles() {
  return `<style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Jost',sans-serif;color:#1a1a18;font-size:11pt;line-height:1.5}
    .pdf-wrap{padding:0}
    .pdf-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:1.5rem}
    .pdf-logo{font-family:'Jost',sans-serif;font-weight:700;font-size:18pt;letter-spacing:.04em}
    .pdf-doc-num{font-family:'DM Mono',monospace;font-size:8pt;color:#6b6b64;padding-top:.3rem}
    .pdf-rule{border:none;border-top:1px solid #B8955A;margin:1rem 0}
    .pdf-client-row{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:1.5rem}
    .pdf-client-info{font-size:9pt;color:#4a4a42}
    .pdf-title{font-family:'Cormorant Garamond',serif;font-size:28pt;font-weight:600;margin-bottom:.3rem}
    .pdf-subtitle{font-family:'DM Mono',monospace;font-size:8pt;text-transform:uppercase;letter-spacing:.08em;color:#6b6b64;margin-bottom:1.5rem}
    .pdf-tiles{display:flex;gap:1rem;margin-bottom:1.5rem}
    .pdf-tile{flex:1;border:1px solid #e0dfd8;border-radius:4px;padding:.75rem}
    .pdf-tile-lbl{font-size:8pt;text-transform:uppercase;letter-spacing:.06em;color:#6b6b64;margin-bottom:.25rem}
    .pdf-tile-val{font-size:11pt;font-weight:600}
    table.pdf-items{width:100%;border-collapse:collapse;margin-bottom:1.5rem}
    table.pdf-items th{text-align:left;font-size:8pt;text-transform:uppercase;letter-spacing:.06em;color:#6b6b64;padding:.5rem;border-bottom:1px solid #e0dfd8}
    table.pdf-items td{padding:.6rem .5rem;border-bottom:1px solid #f0efe8;font-size:10pt}
    table.pdf-items tr.total td{font-weight:700;border-top:2px solid #B8955A;border-bottom:none}
    .pdf-footer{margin-top:2rem;padding-top:1rem;border-top:1px solid #e0dfd8;font-size:8pt;color:#6b6b64;display:flex;justify-content:space-between}
    .pdf-section-title{font-size:9pt;font-weight:700;text-transform:uppercase;letter-spacing:.06em;margin-bottom:.5rem;color:#2d2d2b}
    .pdf-body-text{font-size:10pt;margin-bottom:1rem;color:#2d2d2b}
    .pdf-sig-block{display:flex;gap:2rem;margin-top:2rem}
    .pdf-sig-col{flex:1;border-top:1px solid #1a1a18;padding-top:.5rem;font-size:9pt}
  </style>`;
}

function _pdfHeader(docNum) {
  return `<div class="pdf-header">
    <div class="pdf-logo">Oak &amp; Pixel</div>
    <div class="pdf-doc-num">${docNum}</div>
  </div>
  <hr class="pdf-rule">`;
}

function _pdfClientBlock(client) {
  return `<div class="pdf-client-row">
    <div></div>
    <div class="pdf-client-info">
      <strong>${client.company || client.full_name || ''}</strong><br>
      ${client.company_address ? client.company_address + '<br>' : ''}
      ${client.company_email || client.email || ''}<br>
      ${client.company_phone || client.phone || ''}
    </div>
  </div>`;
}

function _pdfLineItems(doc, dueLbl) {
  const items = doc.additional_items || [];
  const rows = [
    { label: 'Setup Fee', amount: doc.setup_fee },
    { label: 'Monthly Retainer', amount: doc.monthly_retainer },
    ...items
  ].filter(r => Number(r.amount) > 0);
  return `<table class="pdf-items">
    <thead><tr><th>Description</th><th style="text-align:right">Amount</th></tr></thead>
    <tbody>
      ${rows.map(r => `<tr><td>${r.label}</td><td style="text-align:right">${money(Number(r.amount))}</td></tr>`).join('')}
      <tr class="total"><td>Total</td><td style="text-align:right">${money(doc.total_amount)}</td></tr>
    </tbody>
  </table>`;
}

function _pdfFooter() {
  return `<div class="pdf-footer">
    <span>Oak &amp; Pixel Studio &middot; hello@oakandpixel.co.za</span>
    <span>Generated: ${new Date().toLocaleDateString('en-ZA')}</span>
  </div>`;
}

function quoteTemplate(quote, client) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">${_pdfStyles()}</head><body><div class="pdf-wrap">
    ${_pdfHeader(quote.quote_number)}
    ${_pdfClientBlock(client)}
    <div class="pdf-title">${quote.service_name || 'Quotation'}</div>
    <div class="pdf-subtitle">Quote &middot; ${compactDate(quote.quote_date)}</div>
    <div class="pdf-tiles">
      <div class="pdf-tile"><div class="pdf-tile-lbl">Quote Date</div><div class="pdf-tile-val">${compactDate(quote.quote_date)}</div></div>
      <div class="pdf-tile"><div class="pdf-tile-lbl">Valid Until</div><div class="pdf-tile-val">${compactDate(quote.expiry_date) || '—'}</div></div>
      <div class="pdf-tile"><div class="pdf-tile-lbl">Status</div><div class="pdf-tile-val">${quote.status}</div></div>
    </div>
    ${_pdfLineItems(quote)}
    ${_pdfFooter()}
  </div></body></html>`;
}

function invoiceTemplate(invoice, client) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">${_pdfStyles()}</head><body><div class="pdf-wrap">
    ${_pdfHeader(invoice.invoice_number)}
    ${_pdfClientBlock(client)}
    <div class="pdf-title">${invoice.service_name || 'Invoice'}</div>
    <div class="pdf-subtitle">Invoice &middot; ${compactDate(invoice.invoice_date)}</div>
    <div class="pdf-tiles">
      <div class="pdf-tile"><div class="pdf-tile-lbl">Invoice Date</div><div class="pdf-tile-val">${compactDate(invoice.invoice_date)}</div></div>
      <div class="pdf-tile"><div class="pdf-tile-lbl">Due Date</div><div class="pdf-tile-val">${compactDate(invoice.due_date) || '—'}</div></div>
      <div class="pdf-tile"><div class="pdf-tile-lbl">Status</div><div class="pdf-tile-val">${invoice.payment_status}</div></div>
    </div>
    ${_pdfLineItems(invoice)}
    ${_pdfFooter()}
  </div></body></html>`;
}
```

- [ ] **Step 2: Run syntax check, commit**
```bash
node -e "const fs=require('fs');new Function(fs.readFileSync('admin.html','utf8').match(/<script[\s\S]*?>([\s\S]*?)<\/script>/g).map(s=>s.replace(/<\/?script[^>]*>/g,'')).join(''))"
git add admin.html
git commit -m "feat: add quoteTemplate and invoiceTemplate PDF generators"
```

---

### Task 6: PDF templates — Proposal, SOW, Welcome Letter

**Files:**
- Modify: `admin.html` — add three more template functions (after Task 5's functions)

- [ ] **Step 1: Add proposalTemplate**

After `invoiceTemplate`, insert:
```js
function proposalTemplate(proposal, client) {
  const sections = [
    { title: 'Executive Summary', body: proposal.executive_summary },
    { title: 'Challenges', body: proposal.challenges },
    { title: 'Our Solution', body: proposal.solution },
    { title: 'Deliverables', body: proposal.deliverables },
    { title: 'Timeline', body: proposal.timeline },
    { title: 'Next Steps', body: proposal.next_steps }
  ].filter(s => s.body);
  const investmentHTML = `<div class="pdf-section-title">Investment</div>
    <table class="pdf-items">
      <thead><tr><th>Item</th><th style="text-align:right">Amount</th></tr></thead>
      <tbody>
        ${Number(proposal.setup_fee) > 0 ? `<tr><td>Setup Fee</td><td style="text-align:right">${money(proposal.setup_fee)}</td></tr>` : ''}
        ${Number(proposal.monthly_retainer) > 0 ? `<tr><td>Monthly Retainer</td><td style="text-align:right">${money(proposal.monthly_retainer)}</td></tr>` : ''}
        <tr class="total"><td>Total</td><td style="text-align:right">${money(proposal.total_amount)}</td></tr>
      </tbody>
    </table>`;
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">${_pdfStyles()}</head><body><div class="pdf-wrap">
    ${_pdfHeader(proposal.proposal_number)}
    ${_pdfClientBlock(client)}
    <div class="pdf-title">${proposal.title || 'Proposal'}</div>
    <div class="pdf-subtitle">Proposal &middot; ${compactDate(proposal.proposal_date)}</div>
    ${sections.map(s => `<div class="pdf-section-title">${s.title}</div><div class="pdf-body-text">${s.body.replace(/\n/g,'<br>')}</div>`).join('')}
    ${investmentHTML}
    ${_pdfFooter()}
  </div></body></html>`;
}

function sowTemplate(scope, client, proposal) {
  const sections = [
    { title: 'Deliverables', body: scope.deliverables },
    { title: 'Milestones', body: scope.milestones },
    { title: 'Timeline', body: scope.timeline },
    { title: 'Responsibilities', body: scope.responsibilities },
    { title: 'Assumptions', body: scope.assumptions },
    { title: 'Exclusions', body: scope.exclusions }
  ].filter(s => s.body);
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">${_pdfStyles()}</head><body><div class="pdf-wrap">
    ${_pdfHeader(scope.scope_number)}
    ${_pdfClientBlock(client)}
    <div class="pdf-title">${scope.title || 'Scope of Work'}</div>
    <div class="pdf-subtitle">SOW &middot; ${compactDate(scope.scope_date)}${proposal ? ` &middot; Ref: ${proposal.proposal_number}` : ''}</div>
    ${sections.map((s,i) => `<div class="pdf-section-title">${i+1}. ${s.title}</div><div class="pdf-body-text">${s.body.replace(/\n/g,'<br>')}</div>`).join('')}
    <div class="pdf-sig-block">
      <div class="pdf-sig-col"><strong>Oak &amp; Pixel Studio</strong><br><br><br>Signature &amp; Date</div>
      <div class="pdf-sig-col"><strong>${client.company || client.full_name || 'Client'}</strong><br><br><br>Signature &amp; Date</div>
    </div>
    ${_pdfFooter()}
  </div></body></html>`;
}

function welcomeLetterTemplate(letter, client) {
  const services = (letter.assigned_services || []).join(', ') || '—';
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">${_pdfStyles()}</head><body><div class="pdf-wrap">
    ${_pdfHeader(letter.letter_number)}
    ${_pdfClientBlock(client)}
    <div class="pdf-title">Welcome to Oak &amp; Pixel Studio</div>
    <div class="pdf-subtitle">Welcome Letter &middot; ${compactDate(letter.created_at)}</div>
    <div class="pdf-body-text">${(letter.welcome_message || '').replace(/\n/g,'<br>')}</div>
    <table class="pdf-items" style="margin-bottom:1rem">
      <thead><tr><th>Detail</th><th>Information</th></tr></thead>
      <tbody>
        <tr><td>Plan</td><td>${client.selected_plan || '—'}</td></tr>
        <tr><td>Start Date</td><td>${compactDate(client.project_start_date) || '—'}</td></tr>
        <tr><td>Services</td><td>${services}</td></tr>
      </tbody>
    </table>
    ${letter.important_info ? `<div class="pdf-section-title">Important Information</div><div class="pdf-body-text">${letter.important_info.replace(/\n/g,'<br>')}</div>` : ''}
    ${_pdfFooter()}
  </div></body></html>`;
}
```

- [ ] **Step 2: Run syntax check, commit**
```bash
node -e "const fs=require('fs');new Function(fs.readFileSync('admin.html','utf8').match(/<script[\s\S]*?>([\s\S]*?)<\/script>/g).map(s=>s.replace(/<\/?script[^>]*>/g,'')).join(''))"
git add admin.html
git commit -m "feat: add proposalTemplate, sowTemplate, welcomeLetterTemplate PDF generators"
```

---

### Task 7: Sidebar "Finance & Documents" nav group

**Files:**
- Modify: `admin.html:693` — insert after the closing `</nav>` tag of the existing nav

- [ ] **Step 1: Add the new nav group**

Find (line 693):
```html
    </nav>

    <div class="sidebar-footer">
```
Replace with:
```html
    </nav>

    <nav class="sidebar-nav" style="margin-top:.5rem">
      <div class="nav-label">Finance &amp; Documents</div>

      <button class="nav-item" data-page="quotes">
        <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
        Quotes
      </button>

      <button class="nav-item" data-page="invoices">
        <svg viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
        Invoices
      </button>

      <button class="nav-item" data-page="retainers">
        <svg viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
        Retainers
      </button>

      <button class="nav-item" data-page="documents">
        <svg viewBox="0 0 24 24"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>
        Documents
      </button>
    </nav>

    <div class="sidebar-footer">
```

- [ ] **Step 2: Verify nav items wire up**

The existing event listener `document.querySelectorAll('.nav-item[data-page]')` at line ~1237 runs at page load, so new nav items won't auto-bind. Find that listener and ensure it uses event delegation or add a re-bind call, OR change to event delegation:

Find:
```js
document.querySelectorAll('.nav-item[data-page]').forEach(btn => {
  btn.addEventListener('click', () => switchPage(btn.dataset.page));
});
```
Replace with:
```js
document.addEventListener('click', e => {
  const btn = e.target.closest('.nav-item[data-page]');
  if (btn) switchPage(btn.dataset.page);
});
```

- [ ] **Step 3: Run syntax check, commit**
```bash
node -e "const fs=require('fs');new Function(fs.readFileSync('admin.html','utf8').match(/<script[\s\S]*?>([\s\S]*?)<\/script>/g).map(s=>s.replace(/<\/?script[^>]*>/g,'')).join(''))"
git add admin.html
git commit -m "feat: add Finance & Documents sidebar group with Quotes, Invoices, Retainers, Documents nav"
```

---

### Task 8: Quotes page HTML + JS

**Files:**
- Modify: `admin.html` — add `#page-quotes` section (HTML) + renderQuotesTable, openEditQuoteModal, deleteQuote, downloadQuotePDF functions (JS)

- [ ] **Step 1: Add Quotes page HTML**

Find `<section class="page" id="page-client-profile">` in the HTML. Locate where `#page-client-profile` closes. After the closing `</section>` of `#page-client-profile`, insert:
```html
<!-- ═══════════════════════════════════ QUOTES PAGE ═══════════════════════════════════ -->
<section class="page" id="page-quotes">
  <div class="page-toolbar">
    <input class="search-input" id="quotes-search" placeholder="Search quotes…" oninput="renderQuotesTable()">
    <div class="filter-tabs" id="quotes-tabs">
      <button class="filter-tab active" data-f="all" onclick="quotesFilter='all';renderQuotesTable()" >All</button>
      <button class="filter-tab" data-f="Draft" onclick="quotesFilter='Draft';renderQuotesTable()">Draft</button>
      <button class="filter-tab" data-f="Sent" onclick="quotesFilter='Sent';renderQuotesTable()">Sent</button>
      <button class="filter-tab" data-f="Accepted" onclick="quotesFilter='Accepted';renderQuotesTable()">Accepted</button>
      <button class="filter-tab" data-f="Declined" onclick="quotesFilter='Declined';renderQuotesTable()">Declined</button>
    </div>
    <button class="btn-add" onclick="openClientDocumentModal('quote',null)" id="quotes-new-btn">+ New Quote</button>
  </div>
  <div id="quotes-table-root"></div>
</section>
```

- [ ] **Step 2: Add JS — renderQuotesTable, downloadQuotePDF, deleteQuote**

Find `function documentRows(rows, type)` in the JS (line ~2689). Insert before it:
```js
function renderQuotesTable() {
  const root = $('quotes-table-root');
  if (!root) return;
  if (!financeSchemaReady) { root.innerHTML = schemaNotice('Apply migration 003 to enable quotes.'); return; }
  const search = ($('quotes-search')?.value || '').toLowerCase();
  const rows = allQuotes.filter(q => {
    if (quotesFilter !== 'all' && q.status !== quotesFilter) return false;
    if (search) {
      const client = allClients.find(c => c.id === q.client_id) || {};
      return (q.quote_number || '').toLowerCase().includes(search) || clientDisplayName(client).toLowerCase().includes(search);
    }
    return true;
  });
  if (!rows.length) { root.innerHTML = emptyState('No quotes found'); return; }
  root.innerHTML = `<table class="data-table">
    <thead><tr><th>Quote #</th><th>Client</th><th>Service</th><th>Amount</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
    <tbody>${rows.map(q => {
      const client = allClients.find(c => c.id === q.client_id) || {};
      const badgeCls = { Draft:'', Sent:'badge-pending', Accepted:'badge-confirmed', Declined:'badge-declined', Expired:'' }[q.status] || '';
      return `<tr>
        <td class="td-mono">${esc(q.quote_number)}</td>
        <td>${esc(clientDisplayName(client))}</td>
        <td>${esc(q.service_name || '—')}</td>
        <td>${money(q.total_amount)}</td>
        <td><span class="badge ${badgeCls}">${esc(q.status)}</span></td>
        <td>${compactDate(q.quote_date)}</td>
        <td class="td-actions">
          <button class="btn-ghost btn-sm" onclick="openEditQuoteModal('${q.id}')">Edit</button>
          <button class="btn-ghost btn-sm" onclick="downloadQuotePDF('${q.id}')">PDF</button>
          <button class="btn-ghost btn-sm btn-danger" onclick="deleteQuote('${q.id}')">Delete</button>
        </td>
      </tr>`;
    }).join('')}</tbody>
  </table>`;
}

async function downloadQuotePDF(quoteId) {
  const quote = allQuotes.find(q => q.id === quoteId);
  if (!quote) return;
  const client = allClients.find(c => c.id === quote.client_id) || {};
  await generatePDF(quoteTemplate(quote, client), `${quote.quote_number}.pdf`);
}

async function deleteQuote(quoteId) {
  if (!confirm('Delete this quote? This cannot be undone.')) return;
  const { error } = await sb.from('quotes').delete().eq('id', quoteId);
  if (error) { toast('Error deleting quote.'); return; }
  toast('Quote deleted.');
  await loadQuotes();
}

function openEditQuoteModal(quoteId) {
  const quote = allQuotes.find(q => q.id === quoteId);
  if (!quote) return;
  const client = allClients.find(c => c.id === quote.client_id) || {};
  showModal(`
    <div class="modal-hdr">
      <span class="modal-title">Edit Quote</span>
      <button class="modal-close" onclick="closeModal()">×</button>
    </div>
    <div class="modal-body">
      <div class="modal-field full"><label>Quote Number</label><input readonly value="${esc(quote.quote_number)}"></div>
      <div class="modal-field full"><label>Client</label><input readonly value="${esc(clientDisplayName(client))}"></div>
      <div class="modal-field"><label>Status</label><select id="eq-status">${DOC_STATUSES.map(s => `<option value="${s}" ${s===quote.status?'selected':''}>${s}</option>`).join('')}</select></div>
      <div class="modal-field"><label>Quote Date</label><input id="eq-date" type="date" value="${quote.quote_date || ''}"></div>
      <div class="modal-field"><label>Expiry Date</label><input id="eq-due" type="date" value="${quote.expiry_date || ''}"></div>
      <div class="modal-field"><label>Setup Fee (R)</label><input id="eq-setup" type="number" value="${quote.setup_fee || 0}"></div>
      <div class="modal-field"><label>Monthly Retainer (R)</label><input id="eq-retainer" type="number" value="${quote.monthly_retainer || 0}"></div>
    </div>
    <div class="modal-foot">
      <button class="btn-ghost" onclick="closeModal()">Cancel</button>
      <button class="btn-add" onclick="updateQuote('${quoteId}')">Save Changes</button>
    </div>
  `);
  $('modal-box').classList.add('wide');
}

async function updateQuote(quoteId) {
  const setup = Math.max(0, parseInt($('eq-setup').value) || 0);
  const retainer = Math.max(0, parseInt($('eq-retainer').value) || 0);
  const total = setup + retainer;
  const { error } = await sb.from('quotes').update({
    status: $('eq-status').value,
    quote_date: $('eq-date').value,
    expiry_date: $('eq-due').value,
    setup_fee: setup,
    monthly_retainer: retainer,
    total_amount: total
  }).eq('id', quoteId);
  if (error) { toast('Error updating quote.'); return; }
  closeModal();
  toast('Quote updated.');
  await loadQuotes();
}
```

- [ ] **Step 3: Add `.data-table` CSS if not present**

Search for `.data-table` in the CSS. If absent, find the existing `.doc-list` CSS block and add after it:
```css
.data-table { width:100%; border-collapse:collapse; font-size:.82rem; }
.data-table thead th { padding:.5rem .75rem; text-align:left; font-size:.7rem; text-transform:uppercase; letter-spacing:.06em; color:var(--mist); border-bottom:1px solid var(--border); }
.data-table tbody td { padding:.6rem .75rem; border-bottom:1px solid var(--border); }
.data-table tbody tr:hover { background:rgba(245,244,241,.03); }
.td-mono { font-family:var(--font-m); font-size:.78rem; }
.td-actions { display:flex; gap:.4rem; }
.btn-sm { padding:.2rem .55rem; font-size:.75rem; }
.btn-danger { color:var(--err); }
.page-toolbar { display:flex; gap:.75rem; align-items:center; flex-wrap:wrap; margin-bottom:1.25rem; }
.filter-tabs { display:flex; gap:.25rem; }
.filter-tab { background:none; border:1px solid var(--border); border-radius:4px; padding:.25rem .65rem; font-size:.75rem; color:var(--mist); cursor:pointer; font-family:var(--font-b); }
.filter-tab.active, .filter-tab:hover { border-color:var(--gold); color:var(--gold); }
```

- [ ] **Step 4: Run syntax check, commit**
```bash
node -e "const fs=require('fs');new Function(fs.readFileSync('admin.html','utf8').match(/<script[\s\S]*?>([\s\S]*?)<\/script>/g).map(s=>s.replace(/<\/?script[^>]*>/g,'')).join(''))"
git add admin.html
git commit -m "feat: add Quotes page with table, edit modal, delete, and PDF download"
```

---

### Task 9: Invoices page HTML + JS

**Files:**
- Modify: `admin.html` — add `#page-invoices` section + JS functions

- [ ] **Step 1: Add Invoices page HTML after `#page-quotes` closing `</section>`**

```html
<!-- ══════════════════════════════════ INVOICES PAGE ══════════════════════════════════ -->
<section class="page" id="page-invoices">
  <div class="page-toolbar">
    <input class="search-input" id="invoices-search" placeholder="Search invoices…" oninput="renderInvoicesTable()">
    <div class="filter-tabs">
      <button class="filter-tab active" onclick="invoicesFilter='all';renderInvoicesTable()">All</button>
      <button class="filter-tab" onclick="invoicesFilter='Draft';renderInvoicesTable()">Draft</button>
      <button class="filter-tab" onclick="invoicesFilter='Sent';renderInvoicesTable()">Sent</button>
      <button class="filter-tab" onclick="invoicesFilter='Paid';renderInvoicesTable()">Paid</button>
      <button class="filter-tab" onclick="invoicesFilter='Overdue';renderInvoicesTable()">Overdue</button>
    </div>
    <button class="btn-ghost" onclick="openInvoiceFromQuote()">From Quote</button>
    <button class="btn-add" onclick="openClientDocumentModal('invoice',null)">+ New Invoice</button>
  </div>
  <div id="invoices-table-root"></div>
</section>
```

- [ ] **Step 2: Add JS — renderInvoicesTable, downloadInvoicePDF, deleteInvoice, openInvoiceFromQuote, openEditInvoiceModal, updateInvoice**

Insert near the `renderQuotesTable` block:
```js
function renderInvoicesTable() {
  const root = $('invoices-table-root');
  if (!root) return;
  if (!financeSchemaReady) { root.innerHTML = schemaNotice('Apply migration 003 to enable invoices.'); return; }
  const search = ($('invoices-search')?.value || '').toLowerCase();
  const rows = allInvoices.filter(i => {
    if (invoicesFilter !== 'all' && i.payment_status !== invoicesFilter) return false;
    if (search) {
      const client = allClients.find(c => c.id === i.client_id) || {};
      return (i.invoice_number || '').toLowerCase().includes(search) || clientDisplayName(client).toLowerCase().includes(search);
    }
    return true;
  });
  if (!rows.length) { root.innerHTML = emptyState('No invoices found'); return; }
  root.innerHTML = `<table class="data-table">
    <thead><tr><th>Invoice #</th><th>Client</th><th>Service</th><th>Amount</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
    <tbody>${rows.map(inv => {
      const client = allClients.find(c => c.id === inv.client_id) || {};
      const badgeCls = { Draft:'', Sent:'badge-pending', Paid:'badge-confirmed', Overdue:'badge-declined', Cancelled:'' }[inv.payment_status] || '';
      return `<tr>
        <td class="td-mono">${esc(inv.invoice_number)}</td>
        <td>${esc(clientDisplayName(client))}</td>
        <td>${esc(inv.service_name || '—')}</td>
        <td>${money(inv.total_amount)}</td>
        <td><span class="badge ${badgeCls}">${esc(inv.payment_status)}</span></td>
        <td>${compactDate(inv.invoice_date)}</td>
        <td class="td-actions">
          <button class="btn-ghost btn-sm" onclick="openEditInvoiceModal('${inv.id}')">Edit</button>
          <button class="btn-ghost btn-sm" onclick="downloadInvoicePDF('${inv.id}')">PDF</button>
          <button class="btn-ghost btn-sm btn-danger" onclick="deleteInvoice('${inv.id}')">Delete</button>
        </td>
      </tr>`;
    }).join('')}</tbody>
  </table>`;
}

async function downloadInvoicePDF(invoiceId) {
  const invoice = allInvoices.find(i => i.id === invoiceId);
  if (!invoice) return;
  const client = allClients.find(c => c.id === invoice.client_id) || {};
  await generatePDF(invoiceTemplate(invoice, client), `${invoice.invoice_number}.pdf`);
}

async function deleteInvoice(invoiceId) {
  if (!confirm('Delete this invoice? This cannot be undone.')) return;
  const { error } = await sb.from('invoices').delete().eq('id', invoiceId);
  if (error) { toast('Error deleting invoice.'); return; }
  toast('Invoice deleted.');
  await loadInvoices();
}

function openEditInvoiceModal(invoiceId) {
  const invoice = allInvoices.find(i => i.id === invoiceId);
  if (!invoice) return;
  const client = allClients.find(c => c.id === invoice.client_id) || {};
  showModal(`
    <div class="modal-hdr">
      <span class="modal-title">Edit Invoice</span>
      <button class="modal-close" onclick="closeModal()">×</button>
    </div>
    <div class="modal-body">
      <div class="modal-field full"><label>Invoice Number</label><input readonly value="${esc(invoice.invoice_number)}"></div>
      <div class="modal-field full"><label>Client</label><input readonly value="${esc(clientDisplayName(client))}"></div>
      <div class="modal-field"><label>Payment Status</label><select id="ei-status">${INVOICE_STATUSES.map(s => `<option value="${s}" ${s===invoice.payment_status?'selected':''}>${s}</option>`).join('')}</select></div>
      <div class="modal-field"><label>Invoice Date</label><input id="ei-date" type="date" value="${invoice.invoice_date || ''}"></div>
      <div class="modal-field"><label>Due Date</label><input id="ei-due" type="date" value="${invoice.due_date || ''}"></div>
      <div class="modal-field"><label>Setup Fee (R)</label><input id="ei-setup" type="number" value="${invoice.setup_fee || 0}"></div>
      <div class="modal-field"><label>Monthly Retainer (R)</label><input id="ei-retainer" type="number" value="${invoice.monthly_retainer || 0}"></div>
    </div>
    <div class="modal-foot">
      <button class="btn-ghost" onclick="closeModal()">Cancel</button>
      <button class="btn-add" onclick="updateInvoice('${invoiceId}')">Save Changes</button>
    </div>
  `);
  $('modal-box').classList.add('wide');
}

async function updateInvoice(invoiceId) {
  const setup = Math.max(0, parseInt($('ei-setup').value) || 0);
  const retainer = Math.max(0, parseInt($('ei-retainer').value) || 0);
  const { error } = await sb.from('invoices').update({
    payment_status: $('ei-status').value,
    invoice_date: $('ei-date').value,
    due_date: $('ei-due').value,
    setup_fee: setup,
    monthly_retainer: retainer,
    total_amount: setup + retainer
  }).eq('id', invoiceId);
  if (error) { toast('Error updating invoice.'); return; }
  closeModal();
  toast('Invoice updated.');
  await loadInvoices();
}

function openInvoiceFromQuote() {
  const accepted = allQuotes.filter(q => q.status === 'Accepted');
  if (!accepted.length) { toast('No accepted quotes to convert.'); return; }
  showModal(`
    <div class="modal-hdr">
      <span class="modal-title">Invoice from Quote</span>
      <button class="modal-close" onclick="closeModal()">×</button>
    </div>
    <div class="modal-body">
      <p class="td-dim" style="margin-bottom:1rem">Select an accepted quote to pre-fill invoice details.</p>
      ${accepted.map(q => {
        const client = allClients.find(c => c.id === q.client_id) || {};
        return `<div class="doc-row" style="cursor:pointer" onclick="prefillInvoiceFromQuote('${q.id}')">
          <div><div class="doc-title">${esc(q.quote_number)}</div><div class="doc-meta">${esc(clientDisplayName(client))} · ${money(q.total_amount)}</div></div>
          <span class="badge badge-confirmed">Accepted</span>
        </div>`;
      }).join('')}
    </div>
  `);
}

function prefillInvoiceFromQuote(quoteId) {
  const quote = allQuotes.find(q => q.id === quoteId);
  if (!quote) return;
  closeModal();
  const client = allClients.find(c => c.id === quote.client_id) || {};
  selectedClientId = client.id || null;
  openClientDocumentModal('invoice', quote.client_id);
  setTimeout(() => {
    if ($('doc-service')) {
      const opt = [...$('doc-service').options].find(o => o.value === quote.service_id);
      if (opt) { $('doc-service').value = quote.service_id; $('doc-service').dispatchEvent(new Event('change')); }
    }
    if ($('doc-setup')) $('doc-setup').value = quote.setup_fee || 0;
    if ($('doc-retainer')) $('doc-retainer').value = quote.monthly_retainer || 0;
  }, 100);
}
```

- [ ] **Step 3: Run syntax check, commit**
```bash
node -e "const fs=require('fs');new Function(fs.readFileSync('admin.html','utf8').match(/<script[\s\S]*?>([\s\S]*?)<\/script>/g).map(s=>s.replace(/<\/?script[^>]*>/g,'')).join(''))"
git add admin.html
git commit -m "feat: add Invoices page with table, edit, delete, PDF, and From Quote flow"
```

---

### Task 10: Retainers page HTML + JS

**Files:**
- Modify: `admin.html` — add `#page-retainers` section + renderRetainersTable, computeRetainerMetrics, openRecordPaymentModal

- [ ] **Step 1: Add Retainers page HTML after `#page-invoices`**

```html
<!-- ══════════════════════════════════ RETAINERS PAGE ══════════════════════════════════ -->
<section class="page" id="page-retainers">
  <div class="stat-strip" id="retainer-metrics" style="margin-bottom:1.5rem">
    <div class="stat-card"><div class="stat-label">Total MRR</div><div class="stat-value" id="rm-mrr">R 0</div></div>
    <div class="stat-card"><div class="stat-label">Active Retainers</div><div class="stat-value" id="rm-active">0</div></div>
    <div class="stat-card"><div class="stat-label">Due This Month</div><div class="stat-value" id="rm-due">0</div></div>
    <div class="stat-card"><div class="stat-label">Outstanding</div><div class="stat-value" id="rm-overdue">0</div></div>
  </div>
  <div id="retainers-table-root"></div>
</section>
```

- [ ] **Step 2: Add JS — computeRetainerMetrics, renderRetainersTable, openRecordPaymentModal, saveRetainerPayment**

```js
function computeRetainerMetrics() {
  if (!$('rm-mrr')) return;
  const today = todayStr();
  const thisMonthStart = today.slice(0,7) + '-01';
  const thisMonthEnd = new Date(today.slice(0,4), parseInt(today.slice(5,7)), 0).toISOString().slice(0,10);
  const active = allRetainers.filter(r => r.payment_status !== 'Cancelled');
  const mrr = active.reduce((s,r) => s + (Number(r.monthly_retainer)||0), 0);
  const due = allRetainers.filter(r => r.next_payment_date && r.next_payment_date >= thisMonthStart && r.next_payment_date <= thisMonthEnd).length;
  const overdue = allRetainers.filter(r => r.payment_status === 'Overdue').length;
  $('rm-mrr').textContent = money(mrr);
  $('rm-active').textContent = active.length;
  $('rm-due').textContent = due;
  $('rm-overdue').textContent = overdue;
}

function renderRetainersTable() {
  const root = $('retainers-table-root');
  if (!root) return;
  computeRetainerMetrics();
  if (!retainerSchemaReady) { root.innerHTML = schemaNotice('Apply migration 003 to enable retainers.'); return; }
  if (!allRetainers.length) { root.innerHTML = emptyState('No retainers found', 'Create retainers from a client profile.'); return; }
  root.innerHTML = `<table class="data-table">
    <thead><tr><th>Client</th><th>Plan</th><th>Monthly</th><th>Billing Day</th><th>Next Payment</th><th>Status</th><th>Actions</th></tr></thead>
    <tbody>${allRetainers.map(r => {
      const client = allClients.find(c => c.id === r.client_id) || {};
      const badgeCls = { Paid:'badge-confirmed', Pending:'badge-pending', Overdue:'badge-declined', Failed:'badge-declined' }[r.payment_status] || '';
      return `<tr>
        <td>${esc(clientDisplayName(client))}</td>
        <td>${esc(r.assigned_plan || '—')}</td>
        <td>${money(r.monthly_retainer)}</td>
        <td>${r.billing_day || '—'}</td>
        <td>${compactDate(r.next_payment_date) || '—'}</td>
        <td><span class="badge ${badgeCls}">${esc(r.payment_status || 'Pending')}</span></td>
        <td class="td-actions">
          <button class="btn-ghost btn-sm" onclick="openRetainerModal('${r.client_id}')">History</button>
          <button class="btn-ghost btn-sm" onclick="openRecordPaymentModal('${r.id}')">Record Payment</button>
        </td>
      </tr>`;
    }).join('')}</tbody>
  </table>`;
}

function openRecordPaymentModal(retainerId) {
  const retainer = allRetainers.find(r => r.id === retainerId);
  if (!retainer) return;
  const client = allClients.find(c => c.id === retainer.client_id) || {};
  showModal(`
    <div class="modal-hdr">
      <span class="modal-title">Record Payment</span>
      <button class="modal-close" onclick="closeModal()">×</button>
    </div>
    <div class="modal-body">
      <div class="modal-field full"><label>Client</label><input readonly value="${esc(clientDisplayName(client))}"></div>
      <div class="modal-field"><label>Month (e.g. June 2026)</label><input id="rp-month" placeholder="June 2026"></div>
      <div class="modal-field"><label>Amount (R)</label><input id="rp-amount" type="number" value="${retainer.monthly_retainer || 0}"></div>
      <div class="modal-field"><label>Payment Date</label><input id="rp-date" type="date" value="${todayStr()}"></div>
      <div class="modal-field"><label>Status</label><select id="rp-status">
        ${PAYMENT_STATUSES.map(s => `<option value="${s}">${s}</option>`).join('')}
      </select></div>
    </div>
    <div class="modal-foot">
      <button class="btn-ghost" onclick="closeModal()">Cancel</button>
      <button class="btn-add" onclick="saveRetainerPayment('${retainerId}')">Record</button>
    </div>
  `);
}

async function saveRetainerPayment(retainerId) {
  const month = $('rp-month').value.trim();
  const amount = Math.max(0, parseInt($('rp-amount').value) || 0);
  const date = $('rp-date').value;
  const status = $('rp-status').value;
  if (!month) { toast('Enter a month.'); return; }
  const { error } = await sb.from('retainer_payments').insert({
    retainer_id: retainerId, month, amount, payment_date: date, payment_status: status,
    invoice_number: docNumber('RET')
  });
  if (error) { toast('Error recording payment.'); return; }
  await sb.from('retainers').update({ payment_status: status, last_payment_date: date }).eq('id', retainerId);
  closeModal();
  toast('Payment recorded.');
  await Promise.all([loadRetainers(), loadRetainerOverview()]);
}
```

- [ ] **Step 3: Run syntax check, commit**
```bash
node -e "const fs=require('fs');new Function(fs.readFileSync('admin.html','utf8').match(/<script[\s\S]*?>([\s\S]*?)<\/script>/g).map(s=>s.replace(/<\/?script[^>]*>/g,'')).join(''))"
git add admin.html
git commit -m "feat: add Retainers page with metrics strip, table, and record payment modal"
```

---

### Task 11: Documents page HTML + JS

**Files:**
- Modify: `admin.html` — add `#page-documents` section + buildDocumentList, renderDocumentsTable, archiveDocument

- [ ] **Step 1: Add Documents page HTML after `#page-retainers`**

```html
<!-- ══════════════════════════════════ DOCUMENTS PAGE ══════════════════════════════════ -->
<section class="page" id="page-documents">
  <div class="page-toolbar">
    <input class="search-input" id="doc-hub-search" placeholder="Search documents…" oninput="renderDocumentsTable()">
    <div class="filter-tabs">
      <button class="filter-tab active" onclick="docFilter='all';renderDocumentsTable()">All</button>
      <button class="filter-tab" onclick="docFilter='Quote';renderDocumentsTable()">Quotes</button>
      <button class="filter-tab" onclick="docFilter='Invoice';renderDocumentsTable()">Invoices</button>
      <button class="filter-tab" onclick="docFilter='Proposal';renderDocumentsTable()">Proposals</button>
      <button class="filter-tab" onclick="docFilter='SOW';renderDocumentsTable()">SOW</button>
      <button class="filter-tab" onclick="docFilter='Welcome Letter';renderDocumentsTable()">Welcome Letters</button>
      <button class="filter-tab" onclick="docFilter='__retainer-statements';renderDocumentsTable()">Retainer Statements</button>
      <button class="filter-tab" onclick="docFilter='__project-briefs';renderDocumentsTable()">Project Briefs</button>
      <button class="filter-tab" onclick="docFilter='__completion';renderDocumentsTable()">Completion Reports</button>
    </div>
    <label class="filter-tab" style="cursor:pointer"><input type="checkbox" id="doc-show-archived" onchange="showArchived=this.checked;renderDocumentsTable()" style="margin-right:.3rem">Archived</label>
  </div>
  <div id="doc-hub-root"></div>
</section>
```

- [ ] **Step 2: Add JS — buildDocumentList, renderDocumentsTable, archiveDocument**

```js
function buildDocumentList() {
  return [
    ...allQuotes.map(q => ({ ...q, _type:'Quote', _num:q.quote_number, _date:q.quote_date, _status:q.status, _title:q.service_name||'Quote' })),
    ...allInvoices.map(i => ({ ...i, _type:'Invoice', _num:i.invoice_number, _date:i.invoice_date, _status:i.payment_status, _title:i.service_name||'Invoice' })),
    ...allProposals.map(p => ({ ...p, _type:'Proposal', _num:p.proposal_number, _date:p.proposal_date, _status:p.status, _title:p.title||'Proposal' })),
    ...allScopes.map(s => ({ ...s, _type:'SOW', _num:s.scope_number, _date:s.scope_date, _status:s.status, _title:s.title||'Scope of Work' })),
    ...allWelcomeLetters.map(w => ({ ...w, _type:'Welcome Letter', _num:w.letter_number, _date:w.created_at, _status:w.status, _title:'Welcome Letter' })),
  ].sort((a,b) => new Date(b._date) - new Date(a._date));
}

function renderDocumentsTable() {
  const root = $('doc-hub-root');
  if (!root) return;
  if (['__retainer-statements','__project-briefs','__completion'].includes(docFilter)) {
    root.innerHTML = emptyState('Coming soon', 'This document type will be available in a future update.');
    return;
  }
  const search = ($('doc-hub-search')?.value || '').toLowerCase();
  let rows = buildDocumentList();
  if (!showArchived) rows = rows.filter(r => !r.archived);
  if (docFilter !== 'all') rows = rows.filter(r => r._type === docFilter);
  if (search) rows = rows.filter(r => {
    const client = allClients.find(c => c.id === r.client_id) || {};
    return (r._num||'').toLowerCase().includes(search) || clientDisplayName(client).toLowerCase().includes(search) || (r._title||'').toLowerCase().includes(search);
  });
  if (!rows.length) { root.innerHTML = emptyState('No documents found'); return; }
  const typeBadge = { Quote:'badge-gold', Invoice:'badge-amber', Proposal:'badge-emerald', SOW:'badge-ok', 'Welcome Letter':'' };
  root.innerHTML = `<table class="data-table">
    <thead><tr><th>#</th><th>Type</th><th>Client</th><th>Title</th><th>Date</th><th>Status</th><th>Actions</th></tr></thead>
    <tbody>${rows.map(r => {
      const client = allClients.find(c => c.id === r.client_id) || {};
      return `<tr ${r.archived ? 'style="opacity:.5"' : ''}>
        <td class="td-mono">${esc(r._num||'—')}</td>
        <td><span class="badge ${typeBadge[r._type]||''}">${esc(r._type)}</span></td>
        <td>${esc(clientDisplayName(client))}</td>
        <td>${esc(r._title)}</td>
        <td>${compactDate(r._date)}</td>
        <td>${esc(r._status||'—')}</td>
        <td class="td-actions">
          ${r._type==='Proposal' ? `<button class="btn-ghost btn-sm" onclick="openProposalEditor('${r.id}',null,null)">View</button>` : ''}
          ${r._type==='SOW' ? `<button class="btn-ghost btn-sm" onclick="openSOWEditor('${r.id}',null)">View</button>` : ''}
          ${r._type==='Quote' ? `<button class="btn-ghost btn-sm" onclick="downloadQuotePDF('${r.id}')">PDF</button>` : ''}
          ${r._type==='Invoice' ? `<button class="btn-ghost btn-sm" onclick="downloadInvoicePDF('${r.id}')">PDF</button>` : ''}
          ${!r.archived ? `<button class="btn-ghost btn-sm" onclick="archiveDocument('${r._type}','${r.id}')">Archive</button>` : ''}
        </td>
      </tr>`;
    }).join('')}</tbody>
  </table>`;
}

async function archiveDocument(type, id) {
  const tableMap = { Quote:'quotes', Invoice:'invoices', Proposal:'proposals', SOW:'scopes', 'Welcome Letter':'welcome_letters' };
  const table = tableMap[type];
  if (!table) return;
  const { error } = await sb.from(table).update({ archived: true }).eq('id', id);
  if (error) { toast('Error archiving document.'); return; }
  toast('Document archived.');
  await Promise.all([loadQuotes(), loadInvoices(), loadProposals(), loadScopes(), loadWelcomeLetters()]);
  renderDocumentsTable();
}
```

- [ ] **Step 3: Add badge colour variants to CSS**

After `.badge-declined` CSS, add:
```css
.badge-gold { background:rgba(184,149,90,.15); color:var(--gold); border-color:rgba(184,149,90,.3); }
.badge-amber { background:rgba(196,150,58,.15); color:var(--amber); border-color:rgba(196,150,58,.3); }
.badge-emerald { background:rgba(26,92,58,.25); color:var(--ok); border-color:rgba(26,92,58,.4); }
.badge-ok { background:rgba(90,158,111,.15); color:var(--ok); border-color:rgba(90,158,111,.3); }
```

- [ ] **Step 4: Run syntax check, commit**
```bash
node -e "const fs=require('fs');new Function(fs.readFileSync('admin.html','utf8').match(/<script[\s\S]*?>([\s\S]*?)<\/script>/g).map(s=>s.replace(/<\/?script[^>]*>/g,'')).join(''))"
git add admin.html
git commit -m "feat: add Documents repository page with unified list, type filters, and archive"
```

---

### Task 12: Proposal editor HTML + CSS

**Files:**
- Modify: `admin.html` — add `#page-proposal-editor` section after `#page-documents`

- [ ] **Step 1: Add proposal editor CSS**

Find the `.service-detail-grid` CSS block. After it add:
```css
.editor-grid { display:grid; grid-template-columns:1.35fr 0.65fr; gap:1.5rem; align-items:start; }
.editor-meta-panel { position:sticky; top:1.5rem; }
.editor-section { margin-bottom:1rem; }
.editor-section label { display:block; font-size:.75rem; text-transform:uppercase; letter-spacing:.06em; color:var(--mist); margin-bottom:.4rem; }
.editor-section textarea { width:100%; min-height:5rem; background:var(--card); border:1px solid var(--border); border-radius:6px; color:var(--off-white); font-family:var(--font-b); font-size:.85rem; padding:.65rem .8rem; resize:vertical; line-height:1.5; }
.editor-section textarea:focus { outline:none; border-color:var(--border-hi); }
.editor-total { font-family:var(--font-m); font-size:1.1rem; color:var(--gold); padding:.5rem 0; }
.editor-back { font-size:.78rem; color:var(--mist); margin-bottom:1rem; cursor:pointer; }
.editor-back:hover { color:var(--off-white); }
```

- [ ] **Step 2: Add proposal editor HTML**

After `#page-documents` closing `</section>`, insert:
```html
<!-- ══════════════════════════════════ PROPOSAL EDITOR ══════════════════════════════════ -->
<section class="page" id="page-proposal-editor">
  <div id="proposal-back-btn" class="editor-back" onclick="proposalGoBack()">← Back</div>
  <div class="editor-grid">
    <!-- Left: content sections -->
    <div>
      <div class="mini-panel editor-section">
        <div class="mini-panel-head"><span class="mini-panel-title">Executive Summary</span></div>
        <div class="mini-panel-body"><textarea id="pe-summary" placeholder="Briefly describe what you understand about the client's situation…"></textarea></div>
      </div>
      <div class="mini-panel editor-section">
        <div class="mini-panel-head"><span class="mini-panel-title">Challenges</span></div>
        <div class="mini-panel-body"><textarea id="pe-challenges" placeholder="What pain points or problems does the client face?"></textarea></div>
      </div>
      <div class="mini-panel editor-section">
        <div class="mini-panel-head"><span class="mini-panel-title">Our Solution</span></div>
        <div class="mini-panel-body"><textarea id="pe-solution" placeholder="How does Oak & Pixel solve those challenges?"></textarea></div>
      </div>
      <div class="mini-panel editor-section">
        <div class="mini-panel-head"><span class="mini-panel-title">Deliverables</span></div>
        <div class="mini-panel-body"><textarea id="pe-deliverables" placeholder="List what will be delivered…"></textarea></div>
      </div>
      <div class="mini-panel editor-section">
        <div class="mini-panel-head"><span class="mini-panel-title">Timeline</span></div>
        <div class="mini-panel-body"><textarea id="pe-timeline" placeholder="Outline key phases or milestones…"></textarea></div>
      </div>
      <div class="mini-panel editor-section">
        <div class="mini-panel-head"><span class="mini-panel-title">Investment</span></div>
        <div class="mini-panel-body">
          <div class="modal-body" style="padding:0">
            <div class="modal-field"><label>Setup Fee (R)</label><input id="pe-setup" type="number" min="0" step="1" value="0" oninput="updateProposalTotal()"></div>
            <div class="modal-field"><label>Monthly Retainer (R)</label><input id="pe-retainer" type="number" min="0" step="1" value="0" oninput="updateProposalTotal()"></div>
          </div>
          <div class="editor-total" id="pe-total">Total: R 0</div>
          <textarea id="pe-investment" placeholder="Additional investment narrative (optional)…" style="margin-top:.5rem"></textarea>
        </div>
      </div>
      <div class="mini-panel editor-section">
        <div class="mini-panel-head"><span class="mini-panel-title">Next Steps</span></div>
        <div class="mini-panel-body"><textarea id="pe-next-steps" placeholder="What happens after this proposal is accepted?"></textarea></div>
      </div>
    </div>
    <!-- Right: meta panel -->
    <div class="editor-meta-panel">
      <div class="mini-panel">
        <div class="mini-panel-head"><span class="mini-panel-title">Proposal Details</span></div>
        <div class="mini-panel-body">
          <div id="pe-client-display" style="margin-bottom:1rem"></div>
          <div class="modal-body" style="padding:0">
            <div class="modal-field full"><label>Client</label><select id="pe-client" onchange="syncProposalService()"><option value="">— Select Client —</option></select></div>
            <div class="modal-field full"><label>Service</label><select id="pe-service" onchange="syncProposalPricing()"><option value="">— Select Service —</option></select></div>
            <div class="modal-field full"><label>Title</label><input id="pe-title" placeholder="Proposal title…"></div>
            <div class="modal-field"><label>Status</label><select id="pe-status">
              <option value="Draft">Draft</option><option value="Sent">Sent</option><option value="Approved">Approved</option><option value="Rejected">Rejected</option>
            </select></div>
            <div class="modal-field"><label>Proposal Date</label><input id="pe-date" type="date"></div>
            <div class="modal-field"><label>Expiry Date</label><input id="pe-expiry" type="date"></div>
          </div>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:.5rem;margin-top:1rem">
        <button class="btn-ghost" onclick="saveProposal(false)">Save Draft</button>
        <button class="btn-add" onclick="downloadProposalPDF()">Generate PDF</button>
        <button class="btn-ghost" id="pe-gen-sow-btn" style="display:none" onclick="openSOWEditorFromProposal()">Generate SOW</button>
      </div>
    </div>
  </div>
</section>
```

- [ ] **Step 3: Run syntax check, commit**
```bash
node -e "const fs=require('fs');new Function(fs.readFileSync('admin.html','utf8').match(/<script[\s\S]*?>([\s\S]*?)<\/script>/g).map(s=>s.replace(/<\/?script[^>]*>/g,'')).join(''))"
git add admin.html
git commit -m "feat: add Proposal editor page HTML and CSS"
```

---

### Task 13: Proposal editor JS

**Files:**
- Modify: `admin.html` — add proposal editor JS functions

- [ ] **Step 1: Add proposal editor JS**

Find `function buildDocumentList()` and insert before it:
```js
let _currentProposalId = null;
let _proposalBackContext = null;

function openProposalEditor(proposalId, clientId, serviceId) {
  _currentProposalId = proposalId || null;
  _proposalBackContext = clientId ? { type:'client', id:clientId } : { type:'documents' };
  const proposal = proposalId ? allProposals.find(p => p.id === proposalId) : null;
  switchPage('proposal-editor');
  const dateVal = proposal ? proposal.proposal_date : todayStr();
  const expiryVal = proposal ? (proposal.expiry_date || '') : addDays(todayStr(), 30);
  if ($('pe-date')) $('pe-date').value = dateVal;
  if ($('pe-expiry')) $('pe-expiry').value = expiryVal;
  const clientSel = $('pe-client');
  if (clientSel) { clientSel.innerHTML = '<option value="">— Select Client —</option>' + allClients.map(c => `<option value="${c.id}">${esc(c.company || c.full_name || 'Unnamed')}</option>`).join(''); }
  const svcSel = $('pe-service');
  if (svcSel) { svcSel.innerHTML = '<option value="">— Select Service —</option>' + allServices.map(s => `<option value="${s.id}">${esc(s.name)}</option>`).join(''); }
  if (proposal) {
    $('pe-summary').value = proposal.executive_summary || '';
    $('pe-challenges').value = proposal.challenges || '';
    $('pe-solution').value = proposal.solution || '';
    $('pe-deliverables').value = proposal.deliverables || '';
    $('pe-timeline').value = proposal.timeline || '';
    $('pe-investment').value = proposal.investment || '';
    $('pe-next-steps').value = proposal.next_steps || '';
    $('pe-setup').value = proposal.setup_fee || 0;
    $('pe-retainer').value = proposal.monthly_retainer || 0;
    $('pe-title').value = proposal.title || '';
    if ($('pe-status')) $('pe-status').value = proposal.status || 'Draft';
    if ($('pe-client') && proposal.client_id) $('pe-client').value = proposal.client_id;
    if ($('pe-service') && proposal.service_id) $('pe-service').value = proposal.service_id;
    const showSOW = proposal.status === 'Approved';
    if ($('pe-gen-sow-btn')) $('pe-gen-sow-btn').style.display = showSOW ? '' : 'none';
  } else {
    ['pe-summary','pe-challenges','pe-solution','pe-deliverables','pe-timeline','pe-investment','pe-next-steps','pe-title'].forEach(id => { if ($(id)) $(id).value = ''; });
    if ($('pe-setup')) $('pe-setup').value = 0;
    if ($('pe-retainer')) $('pe-retainer').value = 0;
    if ($('pe-status')) $('pe-status').value = 'Draft';
    if ($('pe-gen-sow-btn')) $('pe-gen-sow-btn').style.display = 'none';
    if (clientId && $('pe-client')) $('pe-client').value = clientId;
    if (serviceId && $('pe-service')) { $('pe-service').value = serviceId; syncProposalPricing(); }
  }
  updateProposalTotal();
  const backBtn = $('proposal-back-btn');
  if (backBtn) {
    if (clientId) {
      const client = allClients.find(c => c.id === clientId) || {};
      backBtn.textContent = `← Back to ${clientDisplayName(client) || 'Client'}`;
    } else {
      backBtn.textContent = '← Back to Documents';
    }
  }
}

function proposalGoBack() {
  if (_proposalBackContext?.type === 'client') {
    selectedClientId = _proposalBackContext.id;
    switchPage('client-profile');
    renderClientProfile();
  } else {
    switchPage('documents');
    renderDocumentsTable();
  }
}

function updateProposalTotal() {
  const setup = Math.max(0, parseInt($('pe-setup')?.value) || 0);
  const ret = Math.max(0, parseInt($('pe-retainer')?.value) || 0);
  if ($('pe-total')) $('pe-total').textContent = `Total: ${money(setup + ret)}`;
}

function syncProposalPricing() {
  const serviceId = $('pe-service')?.value;
  if (!serviceId) return;
  const service = allServices.find(s => s.id === serviceId);
  if (!service) return;
  if ($('pe-setup')) $('pe-setup').value = service.setup_fee || 0;
  if ($('pe-retainer')) $('pe-retainer').value = service.monthly_retainer || 0;
  updateProposalTotal();
}

function syncProposalService() {}

async function saveProposal(redirect) {
  const title = $('pe-title')?.value.trim();
  if (!title) { toast('Add a title first.'); return; }
  const clientId = $('pe-client')?.value;
  if (!clientId) { toast('Select a client.'); return; }
  const setup = Math.max(0, parseInt($('pe-setup')?.value) || 0);
  const ret = Math.max(0, parseInt($('pe-retainer')?.value) || 0);
  const payload = {
    title,
    client_id: clientId,
    service_id: $('pe-service')?.value || null,
    status: $('pe-status')?.value || 'Draft',
    proposal_date: $('pe-date')?.value || todayStr(),
    expiry_date: $('pe-expiry')?.value || null,
    executive_summary: $('pe-summary')?.value || null,
    challenges: $('pe-challenges')?.value || null,
    solution: $('pe-solution')?.value || null,
    deliverables: $('pe-deliverables')?.value || null,
    timeline: $('pe-timeline')?.value || null,
    investment: $('pe-investment')?.value || null,
    next_steps: $('pe-next-steps')?.value || null,
    setup_fee: setup,
    monthly_retainer: ret,
    total_amount: setup + ret
  };
  let error;
  if (_currentProposalId) {
    ({ error } = await sb.from('proposals').update(payload).eq('id', _currentProposalId));
  } else {
    payload.proposal_number = docNumber('PROP');
    const res = await sb.from('proposals').insert(payload).select().single();
    error = res.error;
    if (!error) _currentProposalId = res.data.id;
  }
  if (error) { toast('Error saving proposal.'); console.error(error); return; }
  toast('Proposal saved.');
  const showSOW = payload.status === 'Approved';
  if ($('pe-gen-sow-btn')) $('pe-gen-sow-btn').style.display = showSOW ? '' : 'none';
  await loadProposals();
}

async function downloadProposalPDF() {
  await saveProposal(false);
  const proposal = allProposals.find(p => p.id === _currentProposalId);
  if (!proposal) return;
  const client = allClients.find(c => c.id === proposal.client_id) || {};
  await generatePDF(proposalTemplate(proposal, client), `${proposal.proposal_number}.pdf`);
}

function openSOWEditorFromProposal() {
  if (!_currentProposalId) return;
  openSOWEditor(null, _currentProposalId);
}
```

- [ ] **Step 2: Run syntax check, commit**
```bash
node -e "const fs=require('fs');new Function(fs.readFileSync('admin.html','utf8').match(/<script[\s\S]*?>([\s\S]*?)<\/script>/g).map(s=>s.replace(/<\/?script[^>]*>/g,'')).join(''))"
git add admin.html
git commit -m "feat: add Proposal editor JS — open, save, PDF, SOW handoff"
```

---

### Task 14: SOW editor HTML + JS

**Files:**
- Modify: `admin.html` — add `#page-sow-editor` section + JS

- [ ] **Step 1: Add SOW editor HTML after `#page-proposal-editor`**

```html
<!-- ═══════════════════════════════════ SOW EDITOR ═══════════════════════════════════ -->
<section class="page" id="page-sow-editor">
  <div id="sow-back-btn" class="editor-back" onclick="sowGoBack()">← Back to Proposal</div>
  <div class="editor-grid">
    <div>
      <div class="mini-panel editor-section"><div class="mini-panel-head"><span class="mini-panel-title">Deliverables</span></div><div class="mini-panel-body"><textarea id="sow-deliverables" placeholder="List all deliverables…"></textarea></div></div>
      <div class="mini-panel editor-section"><div class="mini-panel-head"><span class="mini-panel-title">Milestones</span></div><div class="mini-panel-body"><textarea id="sow-milestones" placeholder="Key project milestones and dates…"></textarea></div></div>
      <div class="mini-panel editor-section"><div class="mini-panel-head"><span class="mini-panel-title">Timeline</span></div><div class="mini-panel-body"><textarea id="sow-timeline" placeholder="Project timeline and phases…"></textarea></div></div>
      <div class="mini-panel editor-section"><div class="mini-panel-head"><span class="mini-panel-title">Responsibilities</span></div><div class="mini-panel-body"><textarea id="sow-responsibilities" placeholder="Client vs OPS responsibilities…"></textarea></div></div>
      <div class="mini-panel editor-section"><div class="mini-panel-head"><span class="mini-panel-title">Assumptions</span></div><div class="mini-panel-body"><textarea id="sow-assumptions" placeholder="Conditions assumed to be true…"></textarea></div></div>
      <div class="mini-panel editor-section"><div class="mini-panel-head"><span class="mini-panel-title">Exclusions</span></div><div class="mini-panel-body"><textarea id="sow-exclusions" placeholder="What is explicitly not included…"></textarea></div></div>
    </div>
    <div class="editor-meta-panel">
      <div class="mini-panel">
        <div class="mini-panel-head"><span class="mini-panel-title">SOW Details</span></div>
        <div class="mini-panel-body">
          <div id="sow-linked-proposal" class="td-dim" style="margin-bottom:.75rem;font-size:.78rem"></div>
          <div class="modal-body" style="padding:0">
            <div class="modal-field full"><label>Title</label><input id="sow-title" placeholder="Scope of Work title…"></div>
            <div class="modal-field"><label>Status</label><select id="sow-status">
              <option value="Draft">Draft</option><option value="Sent">Sent</option><option value="Approved">Approved</option>
            </select></div>
            <div class="modal-field"><label>Scope Date</label><input id="sow-date" type="date"></div>
          </div>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:.5rem;margin-top:1rem">
        <button class="btn-ghost" onclick="saveScope()">Save</button>
        <button class="btn-add" onclick="downloadSOWPDF()">Generate PDF</button>
      </div>
    </div>
  </div>
</section>
```

- [ ] **Step 2: Add SOW editor JS**

```js
let _currentScopeId = null;
let _currentScopeProposalId = null;

function openSOWEditor(scopeId, proposalId) {
  _currentScopeId = scopeId || null;
  _currentScopeProposalId = proposalId || null;
  switchPage('sow-editor');
  if ($('sow-date')) $('sow-date').value = todayStr();
  const proposal = proposalId ? allProposals.find(p => p.id === proposalId) : null;
  const scope = scopeId ? allScopes.find(s => s.id === scopeId) : null;
  const linked = $('sow-linked-proposal');
  if (linked) linked.textContent = proposal ? `Linked Proposal: ${proposal.proposal_number}` : '';
  const backBtn = $('sow-back-btn');
  if (backBtn) backBtn.textContent = proposal ? `← Back to Proposal ${proposal.proposal_number}` : '← Back';
  if (scope) {
    $('sow-title').value = scope.title || '';
    $('sow-deliverables').value = scope.deliverables || '';
    $('sow-milestones').value = scope.milestones || '';
    $('sow-timeline').value = scope.timeline || '';
    $('sow-responsibilities').value = scope.responsibilities || '';
    $('sow-assumptions').value = scope.assumptions || '';
    $('sow-exclusions').value = scope.exclusions || '';
    if ($('sow-status')) $('sow-status').value = scope.status || 'Draft';
    if ($('sow-date')) $('sow-date').value = scope.scope_date || todayStr();
    _currentScopeProposalId = scope.proposal_id || proposalId;
  } else if (proposal) {
    $('sow-title').value = proposal.title ? `SOW — ${proposal.title}` : '';
    $('sow-deliverables').value = proposal.deliverables || '';
    $('sow-timeline').value = proposal.timeline || '';
    ['sow-milestones','sow-responsibilities','sow-assumptions','sow-exclusions'].forEach(id => { if ($(id)) $(id).value = ''; });
    if ($('sow-status')) $('sow-status').value = 'Draft';
  }
}

function sowGoBack() {
  if (_currentScopeProposalId) {
    openProposalEditor(_currentScopeProposalId, null, null);
  } else {
    switchPage('documents');
    renderDocumentsTable();
  }
}

async function saveScope() {
  const title = $('sow-title')?.value.trim();
  if (!title) { toast('Add a title first.'); return; }
  const proposal = _currentScopeProposalId ? allProposals.find(p => p.id === _currentScopeProposalId) : null;
  const payload = {
    title,
    proposal_id: _currentScopeProposalId || null,
    client_id: proposal?.client_id || null,
    service_id: proposal?.service_id || null,
    status: $('sow-status')?.value || 'Draft',
    scope_date: $('sow-date')?.value || todayStr(),
    deliverables: $('sow-deliverables')?.value || null,
    milestones: $('sow-milestones')?.value || null,
    timeline: $('sow-timeline')?.value || null,
    responsibilities: $('sow-responsibilities')?.value || null,
    assumptions: $('sow-assumptions')?.value || null,
    exclusions: $('sow-exclusions')?.value || null
  };
  let error;
  if (_currentScopeId) {
    ({ error } = await sb.from('scopes').update(payload).eq('id', _currentScopeId));
  } else {
    payload.scope_number = docNumber('SOW');
    const res = await sb.from('scopes').insert(payload).select().single();
    error = res.error;
    if (!error) _currentScopeId = res.data.id;
  }
  if (error) { toast('Error saving scope.'); console.error(error); return; }
  toast('Scope saved.');
  await loadScopes();
}

async function downloadSOWPDF() {
  await saveScope();
  const scope = allScopes.find(s => s.id === _currentScopeId);
  if (!scope) return;
  const client = allClients.find(c => c.id === scope.client_id) || {};
  const proposal = allProposals.find(p => p.id === scope.proposal_id) || null;
  await generatePDF(sowTemplate(scope, client, proposal), `${scope.scope_number}.pdf`);
}
```

- [ ] **Step 3: Run syntax check, commit**
```bash
node -e "const fs=require('fs');new Function(fs.readFileSync('admin.html','utf8').match(/<script[\s\S]*?>([\s\S]*?)<\/script>/g).map(s=>s.replace(/<\/?script[^>]*>/g,'')).join(''))"
git add admin.html
git commit -m "feat: add SOW editor page HTML and JS"
```

---

### Task 15: Welcome Letter modal JS

**Files:**
- Modify: `admin.html` — add openWelcomeLetterModal + saveWelcomeLetter functions

- [ ] **Step 1: Add welcome letter JS functions**

Insert near the proposal functions:
```js
function openWelcomeLetterModal(clientId) {
  if (!proposalSchemaReady) { toast('Apply migration 007 to enable welcome letters.'); return; }
  const client = clientById(clientId) || {};
  const assignedServices = [
    ...allQuotes.filter(q => q.client_id === clientId).map(q => q.service_name),
    ...allInvoices.filter(i => i.client_id === clientId).map(i => i.service_name)
  ].filter((s,i,a) => s && a.indexOf(s) === i);
  const greeting = `Welcome to Oak & Pixel Studio, ${client.full_name || client.company || 'there'}. We're thrilled to have ${client.company || 'you'} on board and look forward to a great partnership.`;
  showModal(`
    <div class="modal-hdr">
      <span class="modal-title">Generate Welcome Letter</span>
      <button class="modal-close" onclick="closeModal()">×</button>
    </div>
    <div class="modal-body">
      <div class="modal-field full" style="align-items:center">${clientAvatar(client, 'lg')}</div>
      <div class="modal-field full"><label>Client</label><input readonly value="${esc(clientDisplayName(client))}"></div>
      <div class="modal-field full"><label>Plan</label><input readonly value="${esc(client.selected_plan || '—')}"></div>
      <div class="modal-field full"><label>Start Date</label><input readonly value="${esc(client.project_start_date || '—')}"></div>
      <div class="modal-field full"><label>Assigned Services</label><input readonly value="${esc(assignedServices.join(', ') || 'None yet')}"></div>
      <div class="modal-field full"><label>Welcome Message</label><textarea id="wl-message" rows="4">${esc(greeting)}</textarea></div>
      <div class="modal-field full"><label>Important Information (optional)</label><textarea id="wl-info" rows="3" placeholder="Office hours, key contacts, payment details…"></textarea></div>
    </div>
    <div class="modal-foot">
      <button class="btn-ghost" onclick="closeModal()">Cancel</button>
      <button class="btn-ghost" onclick="saveWelcomeLetter('${clientId}', false)">Save as Draft</button>
      <button class="btn-add" onclick="saveWelcomeLetter('${clientId}', true)">Save &amp; Generate PDF</button>
    </div>
  `);
  $('modal-box').classList.add('wide');
}

async function saveWelcomeLetter(clientId, download) {
  const client = clientById(clientId) || {};
  const assignedServices = [
    ...allQuotes.filter(q => q.client_id === clientId).map(q => q.service_name),
    ...allInvoices.filter(i => i.client_id === clientId).map(i => i.service_name)
  ].filter((s,i,a) => s && a.indexOf(s) === i);
  const payload = {
    letter_number: docNumber('WL'),
    client_id: clientId,
    status: download ? 'Sent' : 'Draft',
    assigned_services: assignedServices,
    welcome_message: $('wl-message')?.value.trim() || null,
    important_info: $('wl-info')?.value.trim() || null,
    sent_at: download ? new Date().toISOString() : null
  };
  const { data, error } = await sb.from('welcome_letters').insert(payload).select().single();
  if (error) { toast('Error saving welcome letter.'); return; }
  closeModal();
  toast('Welcome letter saved.');
  await loadWelcomeLetters();
  if (download) {
    await generatePDF(welcomeLetterTemplate(data, client), `${data.letter_number}.pdf`);
  }
}
```

- [ ] **Step 2: Run syntax check, commit**
```bash
node -e "const fs=require('fs');new Function(fs.readFileSync('admin.html','utf8').match(/<script[\s\S]*?>([\s\S]*?)<\/script>/g).map(s=>s.replace(/<\/?script[^>]*>/g,'')).join(''))"
git add admin.html
git commit -m "feat: add Welcome Letter modal and PDF generation"
```

---

### Task 16: Client Profile enhancements

**Files:**
- Modify: `admin.html` — update `renderClientProfile()` to add Generate Proposal + Welcome Letter buttons and Proposals mini-panel

- [ ] **Step 1: Find the existing profile-actions buttons inside renderClientProfile()**

Search for `openClientDocumentModal('quote'` inside the `renderClientProfile` function. Find the line that renders the "Generate Quote" and "Generate Invoice" buttons in the `profile-actions` row. Add two more buttons after the invoice button:
```js
${proposalSchemaReady ? `<button class="btn-ghost" onclick="openProposalEditor(null,'${client.id}',null)">Generate Proposal</button>` : ''}
${proposalSchemaReady ? `<button class="btn-ghost" onclick="openWelcomeLetterModal('${client.id}')">Generate Welcome Letter</button>` : ''}
```

- [ ] **Step 2: Add Proposals mini-panel to the client profile activity grid**

Find where the Quotes and Invoices mini-panels are rendered in `renderClientProfile()`. After the Invoices panel, add:
```js
${proposalSchemaReady ? `
<div class="mini-panel">
  <div class="mini-panel-head"><span class="mini-panel-title">Proposals</span><span class="badge badge-pending">${allProposals.filter(p => p.client_id === client.id).length}</span></div>
  <div class="mini-panel-body doc-list">
    ${allProposals.filter(p => p.client_id === client.id).slice(0,5).map(p => `
      <div class="doc-row" style="cursor:pointer" onclick="openProposalEditor('${p.id}',null,null)">
        <div><div class="doc-title">${esc(p.proposal_number)}</div><div class="doc-meta">${esc(p.title||'Untitled')} · ${compactDate(p.proposal_date)}</div></div>
        <span class="badge ${p.status==='Approved'?'badge-confirmed':p.status==='Rejected'?'badge-declined':p.status==='Sent'?'badge-pending':''}">${esc(p.status)}</span>
      </div>`).join('') || '<p class="td-dim">No proposals yet.</p>'}
    ${allProposals.filter(p => p.client_id === client.id).length > 0 ? `<div style="margin-top:.5rem"><button class="btn-ghost btn-sm" onclick="docFilter='Proposal';switchPage('documents');renderDocumentsTable()">View all documents →</button></div>` : ''}
  </div>
</div>` : ''}
```

- [ ] **Step 3: Run syntax check, commit**
```bash
node -e "const fs=require('fs');new Function(fs.readFileSync('admin.html','utf8').match(/<script[\s\S]*?>([\s\S]*?)<\/script>/g).map(s=>s.replace(/<\/?script[^>]*>/g,'')).join(''))"
git add admin.html
git commit -m "feat: add Generate Proposal/Welcome Letter buttons and Proposals panel to Client Profile"
```

---

### Task 17: Services detail + Projects kanban enhancements

**Files:**
- Modify: `admin.html` — update `renderServiceDetail()` to add "Generate Proposal" button

- [ ] **Step 1: Add "Generate Proposal" to service detail toolbar**

Find (in `renderServiceDetail()`, the `detail-actions` div):
```js
${financeSchemaReady ? `<button class="btn-add" onclick="openQuoteModal('${service.id}')">Generate Quote</button><button class="btn-add" onclick="openInvoiceModal('${service.id}')">Generate Invoice</button>` : ''}
```
Replace with:
```js
${financeSchemaReady ? `<button class="btn-add" onclick="openQuoteModal('${service.id}')">Generate Quote</button><button class="btn-add" onclick="openInvoiceModal('${service.id}')">Generate Invoice</button>` : ''}
${proposalSchemaReady ? `<button class="btn-ghost" onclick="openProposalEditor(null,null,'${service.id}')">Generate Proposal</button>` : ''}
```

- [ ] **Step 2: Run syntax check, commit**
```bash
node -e "const fs=require('fs');new Function(fs.readFileSync('admin.html','utf8').match(/<script[\s\S]*?>([\s\S]*?)<\/script>/g).map(s=>s.replace(/<\/?script[^>]*>/g,'')).join(''))"
git add admin.html
git commit -m "feat: add Generate Proposal button to Service Detail toolbar"
```

---

### Task 18: Light mode CSS overrides

**Files:**
- Modify: `admin.html` — add `[data-theme="light"]` overrides for all new elements

- [ ] **Step 1: Find the existing light mode block**

Search for `[data-theme="light"]` in the CSS. Find the end of the light mode overrides block. Append:
```css
[data-theme="light"] .data-table tbody tr:hover { background:rgba(10,10,9,.04); }
[data-theme="light"] .filter-tab { border-color:rgba(10,10,9,.15); color:rgba(10,10,9,.55); }
[data-theme="light"] .filter-tab.active, [data-theme="light"] .filter-tab:hover { border-color:var(--gold); color:var(--gold); }
[data-theme="light"] .editor-section textarea { background:rgba(255,255,255,.9); border-color:rgba(10,10,9,.12); color:var(--bg); }
[data-theme="light"] .editor-section textarea:focus { border-color:var(--border-hi); }
[data-theme="light"] .editor-total { color:var(--gold); }
[data-theme="light"] .editor-back { color:rgba(10,10,9,.5); }
[data-theme="light"] .editor-back:hover { color:var(--bg); }
```

- [ ] **Step 2: Run syntax check, commit**
```bash
node -e "const fs=require('fs');new Function(fs.readFileSync('admin.html','utf8').match(/<script[\s\S]*?>([\s\S]*?)<\/script>/g).map(s=>s.replace(/<\/?script[^>]*>/g,'')).join(''))"
git add admin.html
git commit -m "feat: add light mode CSS overrides for all new finance and document UI elements"
```

---

### Task 19: Final wiring, syntax check, and integration commit

**Files:**
- Modify: `admin.html` — wire up `renderQuotesTable()` / `renderInvoicesTable()` / `renderRetainersTable()` / `renderDocumentsTable()` calls into `switchPage()`

- [ ] **Step 1: Hook render calls into page navigation**

Find `function switchPage(name)`. After the existing two lines inside it, add:
```js
  if (name === 'quotes') renderQuotesTable();
  if (name === 'invoices') renderInvoicesTable();
  if (name === 'retainers') renderRetainersTable();
  if (name === 'documents') renderDocumentsTable();
```

- [ ] **Step 2: Ensure `openClientDocumentModal` handles null clientId (for "New Quote" from Quotes page)**

Find `function openClientDocumentModal(type, clientId)`. Currently assumes a real client. Update the top:
```js
function openClientDocumentModal(type, clientId) {
  if (!clientId) {
    // Opened from top-level page — show client select
    showDocumentModal(type, {});
    return;
  }
  const client = clientById(clientId) || {};
  // ... rest unchanged
```

Wait — `showDocumentModal` already shows a client dropdown. So the simplest fix: if `clientId` is null, call `showDocumentModal(type, {})` which shows the full client+service selectors. Implement this: in `openClientDocumentModal`, wrap existing body in `if (clientId) { ... } else { showDocumentModal(type === 'quote' ? 'quote' : 'invoice', {}); }`.

- [ ] **Step 3: Final JS syntax check**
```bash
node -e "const fs=require('fs');new Function(fs.readFileSync('admin.html','utf8').match(/<script[\s\S]*?>([\s\S]*?)<\/script>/g).map(s=>s.replace(/<\/?script[^>]*>/g,'')).join(''))"
```
Expected: no output.

- [ ] **Step 4: Manual smoke test checklist**

Open `admin.html` in browser, log in, and verify:
- [ ] Sidebar shows "Finance & Documents" group with Quotes, Invoices, Retainers, Documents
- [ ] Quotes page loads, shows table with data after first load
- [ ] "New Quote" from Quotes page opens client+service modal
- [ ] Invoices page loads with "From Quote" button
- [ ] Retainers page shows metric strip
- [ ] Documents page shows All tab with unified list
- [ ] Documents "Retainer Statements" tab shows "Coming soon"
- [ ] Client Profile shows "Generate Proposal" + "Generate Welcome Letter" buttons
- [ ] Service Detail shows "Generate Proposal" button
- [ ] Proposal editor opens from client profile, saves, generates PDF
- [ ] SOW editor opens from approved proposal, saves, generates PDF
- [ ] Welcome Letter modal opens, generates PDF
- [ ] Light mode toggle looks correct on all new pages

- [ ] **Step 5: Final commit**
```bash
git add admin.html
git commit -m "feat: wire switchPage render hooks + fix openClientDocumentModal null clientId — document ecosystem complete"
```

---

## Summary of Changes

| File | Change |
|------|--------|
| `admin.html` | ~2956 → ~5500 lines. 1 CDN added, 6 page sections, 4 sidebar items, ~60 new JS functions |
| `migrations/007_documents_schema.sql` | New file — 3 tables + `archived` columns on quotes/invoices |

## Status Constant Reference

- `DOC_STATUSES` = `['Draft','Sent','Accepted','Declined']` (quotes)
- `INVOICE_STATUSES` = `['Draft','Sent','Paid','Overdue','Cancelled']`
- `PAYMENT_STATUSES` = `['Paid','Pending','Overdue','Failed']` (retainer payments)
- Proposal status: `Draft | Sent | Approved | Rejected`
- SOW status: `Draft | Sent | Approved`
- Welcome Letter status: `Draft | Sent`
