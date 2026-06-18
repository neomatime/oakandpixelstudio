# Build A — Service Pricing & Lead-to-Client Conversion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a fixed price to each service (visible in admin and on the public site) and allow contacts to be promoted to a dedicated Clients page.

**Architecture:** Three Supabase SQL migrations lay the foundation; `admin.html` gets price editing on Services, a "Make Client" button on Contacts, and a new Clients page; `index.html` gets `data-service` attributes on service cards and a JS snippet that injects prices from Supabase on page load.

**Tech Stack:** Vanilla JS, Supabase REST API (CDN), CSS custom properties.

---

## File Map

| File | What changes |
|---|---|
| Supabase schema | `ALTER TABLE services ADD COLUMN price`; new `clients` table; `ALTER TABLE contacts ADD COLUMN converted_at` |
| `admin.html:534–546` | Add price input to Add Service form |
| `admin.html:1006–1053` | Rewrite `loadServices()` + `add-svc-btn` handler to handle price |
| `admin.html:680` | Add `clients` to `PAGE_TITLES` |
| `admin.html:584–590` | Add `allClients` global variable |
| `admin.html:696–698` | Add `loadClients()` to `loadAll()` |
| `admin.html:399–403` | Add Clients nav item after Contacts nav |
| `admin.html:551–566` | Add `page-clients` section after `page-contacts` |
| `admin.html:936–1004` | Update `loadContacts()` + `renderContacts()` with `converted_at` filter + Make Client button |
| `admin.html:1054` | Add `convertToClient()` + `loadClients()` + `renderClients()` functions |
| `admin.html:218–224` | Add `.svc-price` CSS |
| `index.html:353–357` | Add `.service-price` CSS after `.service-name` block |
| `index.html:1548–1633` | Add `data-service` attributes to all 6 service card divs |
| `index.html:3276` | Add price-injection `<script>` block before `</body>` |

---

## Task 1: Supabase schema migrations

**Files:** Supabase SQL Editor (project `wdbsmcxzhmdkfjoftulm`) or Supabase MCP `execute_sql`

- [ ] **Step 1: Add `price` column to `services` table**

Run in Supabase SQL Editor:
```sql
ALTER TABLE services ADD COLUMN price INTEGER NOT NULL DEFAULT 0;
```

Expected: command returns successfully, no error.

- [ ] **Step 2: Create `clients` table**

```sql
CREATE TABLE IF NOT EXISTS clients (
  id                UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name         TEXT        NOT NULL,
  email             TEXT        NOT NULL,
  company           TEXT,
  phone             TEXT,
  website           TEXT,
  project_type      TEXT,
  budget            TEXT,
  brief             TEXT,
  source_contact_id UUID        REFERENCES contacts(id),
  created_at        TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_insert" ON clients FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "auth_all"    ON clients FOR ALL    TO authenticated USING (true);
```

Expected: table `clients` appears in Supabase Table Editor.

- [ ] **Step 3: Add `converted_at` column to `contacts`**

```sql
ALTER TABLE contacts ADD COLUMN converted_at TIMESTAMPTZ;
```

Expected: `contacts` table now has a `converted_at` column (nullable timestamptz, default null).

- [ ] **Step 4: Commit migration record**

```bash
git add -A
git commit -m "feat(db): add services.price, clients table, contacts.converted_at"
```

---

## Task 2: Admin — Service cards with price

**Files:** `admin.html`

This task updates the Services page: adds a price field to the "Add Service" form, shows price on each service card with click-to-edit, and adds a `.svc-price` CSS rule.

- [ ] **Step 1: Add `.svc-price` CSS**

Find the existing `.svc-card` CSS block (around line 222):
```css
/* ── SERVICE CARDS ────────────────────────── */
.services-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:1rem;}
.svc-card{background:var(--card);border:1px solid var(--border);padding:1.25rem 1.4rem;display:flex;flex-direction:column;transition:border-color .2s;}
.svc-card:hover{border-color:var(--border-hi);}
```

Add after `.svc-card:hover` line:
```css
.svc-price{font-size:.8rem;color:var(--emerald-l,#2D7A52);letter-spacing:.04em;margin:.25rem 0 .5rem;cursor:pointer;}
.svc-price:hover{opacity:.8;}
.svc-price-input{width:100%;font-size:.8rem;background:var(--input);color:var(--off-white);border:1px solid var(--border-hi);padding:.25rem .5rem;border-radius:4px;margin:.25rem 0 .5rem;}
```

- [ ] **Step 2: Add price input to "Add Service" form**

Find the form row in `page-services` (around line 534):
```html
            <div class="form-row">
              <div class="f-grp">
                <label>Service Name</label>
                <input type="text" id="svc-name" placeholder="e.g. Brand Strategy Session">
              </div>
              <div class="f-grp" style="flex:2">
                <label>Description (optional)</label>
                <input type="text" id="svc-desc" placeholder="Brief description for the booking modal">
              </div>
              <button class="btn-add" id="add-svc-btn">Add</button>
            </div>
```

Replace with:
```html
            <div class="form-row">
              <div class="f-grp">
                <label>Service Name</label>
                <input type="text" id="svc-name" placeholder="e.g. Brand Strategy Session">
              </div>
              <div class="f-grp" style="flex:2">
                <label>Description (optional)</label>
                <input type="text" id="svc-desc" placeholder="Brief description for the booking modal">
              </div>
              <div class="f-grp" style="flex:0;min-width:110px">
                <label>Price (R)</label>
                <input type="number" id="svc-price" min="0" step="1" placeholder="0">
              </div>
              <button class="btn-add" id="add-svc-btn">Add</button>
            </div>
```

- [ ] **Step 3: Rewrite `loadServices()` to include price and inline edit**

Find and replace the entire `loadServices` function (lines ~1006–1042):

```js
/* ── Services ── */
async function loadServices() {
  const c = $('services-grid');
  const { data } = await sb.from('services').select('id,name,description,price,active,sort_order').order('sort_order');
  if (!data?.length) { c.innerHTML = emptyState('No services found'); return; }
  c.innerHTML = data.map(s => {
    const priceLabel = s.price > 0
      ? `R ${s.price.toLocaleString('en-ZA')}`
      : '<span style="opacity:.4;font-weight:400">— No price set —</span>';
    return `
    <div class="svc-card">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:.45rem">
        <div class="svc-card-name">${s.name}</div>
        <span class="badge ${s.active ? 'badge-confirmed' : 'badge-declined'}" style="margin-left:.5rem;flex-shrink:0">${s.active ? 'Active' : 'Hidden'}</span>
      </div>
      <div class="svc-price" data-id="${s.id}" data-price="${s.price}" title="Click to edit price">${priceLabel}</div>
      <div class="svc-card-desc">${s.description || 'No description.'}</div>
      <div class="svc-card-footer">
        <div class="toggle" data-id="${s.id}" data-active="${s.active}">
          <div class="toggle-track ${s.active ? 'on' : ''}"><div class="toggle-thumb"></div></div>
          <span class="toggle-lbl">${s.active ? 'Visible' : 'Hidden'}</span>
        </div>
        <button class="act-btn delete" data-id="${s.id}">Delete</button>
      </div>
    </div>`;
  }).join('');

  c.querySelectorAll('.svc-price').forEach(el => {
    el.addEventListener('click', () => {
      const id = el.dataset.id;
      const current = el.dataset.price || '0';
      const input = document.createElement('input');
      input.type = 'number'; input.min = '0'; input.step = '1';
      input.value = current; input.className = 'svc-price-input';
      el.replaceWith(input);
      input.focus(); input.select();
      input.addEventListener('blur', async () => {
        const newPrice = Math.max(0, parseInt(input.value) || 0);
        await sb.from('services').update({ price: newPrice }).eq('id', id);
        toast('Price updated.');
        loadServices();
      });
      input.addEventListener('keydown', e => { if (e.key === 'Enter') input.blur(); });
    });
  });

  c.querySelectorAll('.toggle').forEach(t => {
    t.addEventListener('click', async () => {
      const isActive = t.dataset.active === 'true';
      await sb.from('services').update({ active: !isActive }).eq('id', t.dataset.id);
      toast(isActive ? 'Service hidden.' : 'Service activated.');
      loadServices();
    });
  });
  c.querySelectorAll('.act-btn.delete').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Delete this service? This cannot be undone.')) return;
      await sb.from('services').delete().eq('id', btn.dataset.id);
      toast('Service deleted.');
      loadServices();
    });
  });
}
```

- [ ] **Step 4: Update `add-svc-btn` handler to save price**

Find and replace the handler (lines ~1044–1053):
```js
$('add-svc-btn').addEventListener('click', async () => {
  const name = $('svc-name').value.trim();
  const desc = $('svc-desc').value.trim();
  if (!name) { toast('Service name is required.'); return; }
  const { error } = await sb.from('services').insert({ name, description: desc || null, active: true, sort_order: 99 });
  if (error) { toast('Error adding service.'); return; }
  $('svc-name').value = ''; $('svc-desc').value = '';
  toast('Service added.');
  loadServices();
});
```

Replace with:
```js
$('add-svc-btn').addEventListener('click', async () => {
  const name  = $('svc-name').value.trim();
  const desc  = $('svc-desc').value.trim();
  const price = Math.max(0, parseInt($('svc-price').value) || 0);
  if (!name) { toast('Service name is required.'); return; }
  const { error } = await sb.from('services').insert({ name, description: desc || null, price, active: true, sort_order: 99 });
  if (error) { toast('Error adding service.'); return; }
  $('svc-name').value = ''; $('svc-desc').value = ''; $('svc-price').value = '';
  toast('Service added.');
  loadServices();
});
```

- [ ] **Step 5: Verify in browser**

Open admin → Services. Confirm:
- "Add Service" form now has a "Price (R)" field
- Existing service cards show "— No price set —" in muted text
- Clicking that text reveals a number input; type `25000`, press Enter → card shows "R 25,000"

- [ ] **Step 6: Commit**

```bash
git add admin.html
git commit -m "feat(admin): service cards with inline price editing"
```

---

## Task 3: Admin — Contacts "Make Client" button

**Files:** `admin.html`

Updates `loadContacts()` to hide converted contacts, adds a "Make Client" button column to the contacts table, and adds a `convertToClient()` function.

- [ ] **Step 1: Update `loadContacts()` to filter converted contacts**

Find `loadContacts` (around line 937):
```js
async function loadContacts() {
  const { data } = await sb.from('contacts').select('*').order('created_at', { ascending: false });
  allContacts = data || [];
  renderContacts();
  const newCount = allContacts.filter(c => c.status === 'new').length;
  const badge = $('new-contact-badge');
  if (newCount > 0) { badge.textContent = newCount; badge.classList.add('show'); }
  else badge.classList.remove('show');
}
```

Replace with:
```js
async function loadContacts() {
  const { data } = await sb.from('contacts').select('*').is('converted_at', null).order('created_at', { ascending: false });
  allContacts = data || [];
  renderContacts();
  const newCount = allContacts.filter(c => c.status === 'new').length;
  const badge = $('new-contact-badge');
  if (newCount > 0) { badge.textContent = newCount; badge.classList.add('show'); }
  else badge.classList.remove('show');
}
```

- [ ] **Step 2: Add "Make Client" column to `renderContacts()` table**

Find the `renderContacts` table HTML string (around line 956):
```js
  c.innerHTML = `<table class="a-table">
    <thead><tr>
      <th>Name</th><th>Company</th><th>Email</th><th>Budget</th><th>Project</th><th>Brief</th><th>Status</th><th>Date</th>
    </tr></thead>
    <tbody>${rows.map(r => `<tr>
      <td class="td-name">${r.full_name}</td>
      <td style="font-size:.76rem;color:rgba(245,244,241,.5)">${r.company || '—'}</td>
      <td class="td-dim">${r.email}</td>
      <td class="td-dim">${r.budget || '—'}</td>
      <td style="font-size:.74rem;color:rgba(245,244,241,.45)">${r.project_type || '—'}</td>
      <td class="contact-brief-cell" title="${(r.brief||'').replace(/"/g,'&quot;')}">${r.brief || '—'}</td>
      <td>
        <span class="badge badge-${r.status}" style="cursor:pointer">
          <select class="status-select" data-id="${r.id}">
            <option value="new"${r.status==='new'?' selected':''}>New</option>
            <option value="contacted"${r.status==='contacted'?' selected':''}>Contacted</option>
            <option value="qualified"${r.status==='qualified'?' selected':''}>Qualified</option>
            <option value="closed"${r.status==='closed'?' selected':''}>Closed</option>
          </select>
        </span>
      </td>
      <td class="td-dim">${fmtDate(r.created_at?.split('T')[0])}</td>
    </tr>`).join('')}</tbody>
  </table>`;
```

Replace with:
```js
  c.innerHTML = `<table class="a-table">
    <thead><tr>
      <th>Name</th><th>Company</th><th>Email</th><th>Budget</th><th>Project</th><th>Brief</th><th>Status</th><th>Date</th><th></th>
    </tr></thead>
    <tbody>${rows.map(r => `<tr>
      <td class="td-name">${r.full_name}</td>
      <td style="font-size:.76rem;color:rgba(245,244,241,.5)">${r.company || '—'}</td>
      <td class="td-dim">${r.email}</td>
      <td class="td-dim">${r.budget || '—'}</td>
      <td style="font-size:.74rem;color:rgba(245,244,241,.45)">${r.project_type || '—'}</td>
      <td class="contact-brief-cell" title="${(r.brief||'').replace(/"/g,'&quot;')}">${r.brief || '—'}</td>
      <td>
        <span class="badge badge-${r.status}" style="cursor:pointer">
          <select class="status-select" data-id="${r.id}">
            <option value="new"${r.status==='new'?' selected':''}>New</option>
            <option value="contacted"${r.status==='contacted'?' selected':''}>Contacted</option>
            <option value="qualified"${r.status==='qualified'?' selected':''}>Qualified</option>
            <option value="closed"${r.status==='closed'?' selected':''}>Closed</option>
          </select>
        </span>
      </td>
      <td class="td-dim">${fmtDate(r.created_at?.split('T')[0])}</td>
      <td><button class="act-btn make-client" data-id="${r.id}" style="white-space:nowrap">Make Client</button></td>
    </tr>`).join('')}</tbody>
  </table>`;
```

- [ ] **Step 3: Wire up "Make Client" button click handlers in `renderContacts()`**

Find the event listener block at the end of `renderContacts()` (after the table innerHTML, around line 981):
```js
  c.querySelectorAll('.status-select').forEach(sel => {
    sel.addEventListener('change', async () => {
      const newStatus = sel.value;
      await sb.from('contacts').update({ status: newStatus }).eq('id', sel.dataset.id);
      toast(`Contact marked as ${newStatus}.`);
      loadContacts();
    });
  });
```

Add after that block (still inside `renderContacts()`):
```js
  c.querySelectorAll('.act-btn.make-client').forEach(btn => {
    btn.addEventListener('click', () => convertToClient(btn.dataset.id));
  });
```

- [ ] **Step 4: Add `convertToClient()` function**

Add directly after the closing `}` of `renderContacts()`, before the filter-tab event listeners:
```js
async function convertToClient(id) {
  const contact = allContacts.find(c => c.id === id);
  if (!contact) return;
  const { error } = await sb.from('clients').insert({
    full_name:         contact.full_name,
    email:             contact.email,
    company:           contact.company   || null,
    phone:             contact.phone     || null,
    website:           contact.website   || null,
    project_type:      contact.project_type || null,
    budget:            contact.budget    || null,
    brief:             contact.brief     || null,
    source_contact_id: contact.id,
  });
  if (error) { toast('Error converting contact. Please try again.'); return; }
  await sb.from('contacts').update({ converted_at: new Date().toISOString() }).eq('id', id);
  toast('Lead converted to client.');
  loadContacts();
  loadClients();
}
```

- [ ] **Step 5: Verify in browser**

Open admin → Contacts. Confirm:
- Each contact row has a "Make Client" button in the last column
- Clicking it removes the row from the table, shows toast "Lead converted to client"
- Check Supabase → `clients` table: row should be present with all fields copied
- Check Supabase → `contacts` table: `converted_at` should be non-null for that row

- [ ] **Step 6: Commit**

```bash
git add admin.html
git commit -m "feat(admin): convert contact to client from contacts CRM"
```

---

## Task 4: Admin — Clients page

**Files:** `admin.html`

Adds a Clients sidebar nav item, a new `page-clients` section, the `loadClients()` / `renderClients()` functions, and wires everything into `loadAll()`.

- [ ] **Step 1: Add `allClients` global variable**

Find the global variable declarations (around line 584):
```js
let currentFilter = 'all';
let allBookings = [];
let allContacts = [];
let contactFilter = 'all';
let contactSearch = '';
let datePicker;
let statusChart, trendChart;
```

Replace with:
```js
let currentFilter = 'all';
let allBookings = [];
let allContacts = [];
let allClients  = [];
let contactFilter = 'all';
let contactSearch = '';
let datePicker;
let statusChart, trendChart;
```

- [ ] **Step 2: Add `clients` to `PAGE_TITLES`**

Find (around line 680):
```js
const PAGE_TITLES = { overview:'Overview', bookings:'Bookings', availability:'Availability', services:'Services', contacts:'Contacts' };
```

Replace with:
```js
const PAGE_TITLES = { overview:'Overview', bookings:'Bookings', availability:'Availability', services:'Services', contacts:'Contacts', clients:'Clients' };
```

- [ ] **Step 3: Add Clients nav item after Contacts**

Find the Contacts nav button (around line 399):
```html
      <button class="nav-item" data-page="contacts">
        <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
        Contacts
        <span class="nav-badge" id="new-contact-badge"></span>
      </button>
    </nav>
```

Replace with:
```html
      <button class="nav-item" data-page="contacts">
        <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
        Contacts
        <span class="nav-badge" id="new-contact-badge"></span>
      </button>

      <button class="nav-item" data-page="clients">
        <svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/><path d="M16 3.13a4 4 0 010 7.75"/><polyline points="17 21 19 23 23 19"/></svg>
        Clients
        <span class="nav-badge" id="clients-badge"></span>
      </button>
    </nav>
```

- [ ] **Step 4: Add `page-clients` section HTML**

Find the Contacts section (around line 551):
```html
      <!-- ── CONTACTS ── -->
      <section class="page" id="page-contacts">
        ...
      </section>

    </div><!-- /page-content -->
```

After the closing `</section>` of `page-contacts` and before `</div><!-- /page-content -->`, insert:
```html
      <!-- ── CLIENTS ── -->
      <section class="page" id="page-clients">
        <div class="card">
          <div class="contacts-toolbar">
            <input type="text" class="search-input" id="client-search" placeholder="Search by name or email…">
          </div>
          <div id="clients-table"><p class="loading-row">Loading…</p></div>
        </div>
      </section>
```

- [ ] **Step 5: Add `loadClients()` and `renderClients()` functions**

Add these two functions immediately after `convertToClient()`:
```js
/* ── Clients ── */
async function loadClients() {
  const { data } = await sb.from('clients').select('*').order('created_at', { ascending: false });
  allClients = data || [];
  renderClients();
  const badge = $('clients-badge');
  if (allClients.length > 0) { badge.textContent = allClients.length; badge.classList.add('show'); }
  else badge.classList.remove('show');
}

let clientSearch = '';

function renderClients() {
  const c = $('clients-table');
  if (!c) return;
  let rows = allClients;
  if (clientSearch) {
    const q = clientSearch.toLowerCase();
    rows = rows.filter(r => r.full_name?.toLowerCase().includes(q) || r.email?.toLowerCase().includes(q));
  }
  if (!rows.length) {
    c.innerHTML = emptyState('No clients yet', 'Convert a lead from the Contacts page.');
    return;
  }
  c.innerHTML = `<table class="a-table">
    <thead><tr>
      <th>Name</th><th>Company</th><th>Email</th><th>Project Type</th><th>Budget</th><th>Date Converted</th>
    </tr></thead>
    <tbody>${rows.map(r => `<tr>
      <td class="td-name">${r.full_name}</td>
      <td style="font-size:.76rem;color:rgba(245,244,241,.5)">${r.company || '—'}</td>
      <td class="td-dim">${r.email}</td>
      <td style="font-size:.74rem;color:rgba(245,244,241,.45)">${r.project_type || '—'}</td>
      <td class="td-dim">${r.budget || '—'}</td>
      <td class="td-dim">${fmtDate(r.created_at?.split('T')[0])}</td>
    </tr>`).join('')}</tbody>
  </table>`;
}

$('client-search')?.addEventListener('input', e => {
  clientSearch = e.target.value.trim();
  renderClients();
});
```

- [ ] **Step 6: Add `loadClients()` to `loadAll()`**

Find (around line 696):
```js
async function loadAll() {
  await Promise.all([loadStats(), loadBookings(), loadSlots(), loadServices(), loadContacts()]);
}
```

Replace with:
```js
async function loadAll() {
  await Promise.all([loadStats(), loadBookings(), loadSlots(), loadServices(), loadContacts(), loadClients()]);
}
```

- [ ] **Step 7: Verify in browser**

Open admin. Confirm:
- "Clients" nav item appears below "Contacts" in the sidebar
- Clicking Clients shows an empty state "No clients yet. Convert a lead from the Contacts page."
- Convert a contact from the Contacts page → it disappears from Contacts and appears in Clients
- Clients badge shows the correct count
- Client search input filters by name/email

- [ ] **Step 8: Commit**

```bash
git add admin.html
git commit -m "feat(admin): clients page with lead-to-client conversion"
```

---

## Task 5: Public site — service price injection

**Files:** `index.html`

Adds a `.service-price` CSS rule, `data-service` attributes to each service card, and a JS snippet that fetches prices from Supabase and injects them on page load.

- [ ] **Step 1: Add `.service-price` CSS**

Find the `.service-name` CSS block (around line 353):
```css
.service-name{
  font-family:var(--font-display);font-size:1.5rem;
  font-weight:400;color:var(--white);margin-bottom:1rem;
  line-height:1.2;
}
```

Add immediately after:
```css
.service-price{
  font-family:var(--font-body);font-size:.85rem;
  color:var(--emerald-l);letter-spacing:.04em;
  margin-top:-.5rem;margin-bottom:1rem;
}
```

- [ ] **Step 2: Note exact service names from admin**

Before adding `data-service` attributes, open the admin dashboard → Services page. Note the **exact** name of each service as it appears there (names are case-sensitive). You will use these exact strings as `data-service` attribute values.

The 6 public service cards map to these service names (update the `data-service` value to match the exact Supabase name if different):

| Card # | Heading in index.html | Expected `data-service` value |
|---|---|---|
| 1 | Premium Website | `Premium Website` |
| 2 | Online Booking Experience | `Online Booking Experience` |
| 3 | Lead Capture Experience | `Lead Capture Experience` |
| 4 | Client Onboarding Experience | `Client Onboarding Experience` |
| 5 | CRM & Payment Integration | `CRM & Payment Integration` |
| 6 | Digital Presence Management | `Digital Presence Management` |

- [ ] **Step 3: Add `data-service` attributes to service card divs**

Find each `.service-card` div and add the `data-service` attribute. There are 6 cards.

**Card 1** (around line 1548) — change:
```html
      <div class="service-card reveal">
```
to:
```html
      <div class="service-card reveal" data-service="Premium Website">
```

**Card 2** (around line 1561):
```html
      <div class="service-card reveal reveal-delay-1">
```
to:
```html
      <div class="service-card reveal reveal-delay-1" data-service="Online Booking Experience">
```

**Card 3** (around line 1576):
```html
      <div class="service-card reveal reveal-delay-2">
```
to:
```html
      <div class="service-card reveal reveal-delay-2" data-service="Lead Capture Experience">
```

**Card 4** (around line 1591):
```html
      <div class="service-card reveal reveal-delay-1">
```
to:
```html
      <div class="service-card reveal reveal-delay-1" data-service="Client Onboarding Experience">
```

**Card 5** (around line 1606):
```html
      <div class="service-card reveal reveal-delay-2">
```
to:
```html
      <div class="service-card reveal reveal-delay-2" data-service="CRM &amp; Payment Integration">
```

**Card 6** (around line 1623):
```html
      <div class="service-card reveal reveal-delay-3">
```
to:
```html
      <div class="service-card reveal reveal-delay-3" data-service="Digital Presence Management">
```

- [ ] **Step 4: Add price injection script**

Find the closing `</body>` tag (around line 3279). Add before it:
```html
<script>
(async () => {
  const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndkYnNtY3h6aG1ka2Zqb2Z0dWxtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4MDEwMTQsImV4cCI6MjA5NzM3NzAxNH0.xo9x29q_QVmDl81soUI3OMDzJBKmqEme-I6v5IZmeN0';
  const data = await fetch(
    'https://wdbsmcxzhmdkfjoftulm.supabase.co/rest/v1/services?select=name,price&active=eq.true',
    { headers: { apikey: ANON } }
  ).then(r => r.json()).catch(() => []);
  (data || []).forEach(({ name, price }) => {
    if (!price) return;
    const card = document.querySelector(`[data-service="${name}"]`);
    if (!card) return;
    const el = document.createElement('p');
    el.className = 'service-price';
    el.textContent = `R ${price.toLocaleString('en-ZA')}`;
    card.querySelector('.service-name').after(el);
  });
})();
</script>
```

- [ ] **Step 5: Set prices in admin and verify on public site**

1. Open admin → Services
2. Click "— No price set —" on a service card, enter a price (e.g. `25000`), press Enter
3. Open `index.html` in the browser (via local server or Vercel preview)
4. Confirm the matching service card now shows "R 25,000" in emerald green below the service name
5. Confirm cards with no price set show no price element (not "R 0")

- [ ] **Step 6: Commit and push**

```bash
git add index.html
git commit -m "feat(site): inject service prices from Supabase on public service cards"
git push origin main
```

---

## Self-Review Checklist

- [x] **Spec coverage:** All 3 data model changes covered (Task 1). Service price in admin covered (Task 2). Contacts "Make Client" covered (Task 3). Clients page covered (Task 4). Public site injection covered (Task 5).
- [x] **No placeholders:** All steps contain complete code.
- [x] **Type consistency:** `allClients` declared in Task 4 Step 1, used in `loadClients()` Task 4 Step 5. `convertToClient(id)` defined in Task 3 Step 4, called via button handler in Task 3 Step 3. `loadClients()` defined in Task 4 Step 5, added to `loadAll()` in Task 4 Step 6. `clientSearch` declared and used in `renderClients()` (Task 4 Step 5).
- [x] **CRM & Payment Integration card:** `data-service` uses HTML entity `&amp;` in the HTML attribute — correct for HTML source.
