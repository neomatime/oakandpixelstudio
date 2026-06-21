# Applications in OPS Command Center — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Surface partnership applications in the OPS Command Center with status management and a "Convert to Client" button.

**Architecture:** All changes are in `admin.html` (single ~7000-line vanilla JS file, no build step). Task 1 adds the static structure (global, nav, HTML, PAGE_TITLES). Task 2 wires in the data layer and interaction logic (load, render, status changes, convert action).

**Tech Stack:** Vanilla JS, Supabase JS v2 (CDN, `sb` client), inline CSS, no build tooling.

## Global Constraints

- No new files. No Supabase migrations. No new CSS classes — use only existing patterns.
- Supabase client is `sb` (already initialised). Never use the service role key in browser code.
- `$('id')` is the existing shorthand for `document.getElementById`.
- All badge classes used: `badge-new`, `badge-amber`, `badge-confirmed`, `badge-declined` — all verified present in admin.html.
- `status-select`, `act-btn`, `nav-badge`, `a-table`, `emptyState`, `skelTable`, `fmtDate`, `toast`, `openClientProfile` — all verified present.
- Nav item inserted between Contacts (line 1031) and Clients (line 1037) in admin.html.
- `page-applications` section inserted after `page-contacts` closing tag (line 1291).
- `let allApplications = []` inserted after `let allMandates = []` (line 1574).

---

### Task 1: Static scaffold — global, nav item, page section, PAGE_TITLES

**Files:**
- Modify: `admin.html` (4 isolated insertions/edits)

**Interfaces:**
- Produces: `allApplications` global array; `page-applications` DOM section; `applications` nav item; `new-application-badge` span; `applications-table` div; `applications` key in PAGE_TITLES

**How to verify (no test suite — manual):**
Open admin.html in the browser, sign in, and confirm:
1. "Applications" nav item appears in the sidebar between Contacts and Clients
2. Clicking it sets the page title to "Applications" and makes `page-applications` visible
3. The `new-application-badge` span is present (hidden until data loads — that's Task 2)
4. No JS errors in the browser console

---

- [ ] **Step 1: Add `let allApplications = [];` global**

In `admin.html`, find line 1574:
```
let allMandates = [];
```

Add the new array immediately after it:
```javascript
let allMandates = [];
let allApplications = [];
```

- [ ] **Step 2: Add the Applications nav item**

In `admin.html`, find the Contacts nav button (lines 1031–1035):
```html
      <button class="nav-item" data-page="contacts">
        <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
        Contacts
        <span class="nav-badge" id="new-contact-badge"></span>
      </button>
```

Insert the Applications nav item immediately after (between Contacts and Clients):
```html
      <button class="nav-item" data-page="contacts">
        <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
        Contacts
        <span class="nav-badge" id="new-contact-badge"></span>
      </button>

      <button class="nav-item" data-page="applications">
        <svg viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round"><path d="M9 12h6M9 8h6M9 16h4M5 20V4a1 1 0 011-1h12a1 1 0 011 1v16l-3-2-3 2-3-2-3 2z"/></svg>
        Applications
        <span class="nav-badge" id="new-application-badge"></span>
      </button>
```

- [ ] **Step 3: Add the page-applications section**

In `admin.html`, find the end of the contacts section (lines 1290–1293):
```html
          <div id="contacts-table"><p class="loading-row">Loading…</p></div>
        </div>
      </section>

      <!-- ── CLIENTS ── -->
```

Insert the applications page section between the contacts section and the clients comment:
```html
          <div id="contacts-table"><p class="loading-row">Loading…</p></div>
        </div>
      </section>

      <!-- ── APPLICATIONS ── -->
      <section class="page" id="page-applications">
        <div class="card">
          <div id="applications-table"><p class="loading-row">Loading…</p></div>
        </div>
      </section>

      <!-- ── CLIENTS ── -->
```

- [ ] **Step 4: Add `applications` to PAGE_TITLES**

In `admin.html`, find line 3079:
```javascript
const PAGE_TITLES = { overview:'Overview', bookings:'Bookings', availability:'Availability', projects:'Projects', services:'Services', 'service-detail':'Service Details', contacts:'Contacts', clients:'Clients', 'client-profile':'Client Profile', pipeline:'Pipeline', quotes:'Quotes', invoices:'Invoices', retainers:'Retainers', documents:'Documents', 'proposal-editor':'Proposal', 'sow-editor':'Scope of Work' };
```

Add `applications:'Applications'` after `contacts:'Contacts'`:
```javascript
const PAGE_TITLES = { overview:'Overview', bookings:'Bookings', availability:'Availability', projects:'Projects', services:'Services', 'service-detail':'Service Details', contacts:'Contacts', applications:'Applications', clients:'Clients', 'client-profile':'Client Profile', pipeline:'Pipeline', quotes:'Quotes', invoices:'Invoices', retainers:'Retainers', documents:'Documents', 'proposal-editor':'Proposal', 'sow-editor':'Scope of Work' };
```

- [ ] **Step 5: Manual verification**

Open admin.html in a browser. Sign in. Confirm:
- "Applications" nav item is visible between Contacts and Clients
- Clicking it sets the page title to "Applications"
- The page content area is empty (no JS errors — data loading comes in Task 2)
- Open DevTools console: no errors

- [ ] **Step 6: Commit**

```bash
git add admin.html
git commit -m "feat(admin): applications page — static scaffold (nav, section, global, PAGE_TITLES)"
```

---

### Task 2: Load, render, status changes, and Convert to Client

**Files:**
- Modify: `admin.html` (3 function additions + 2 wiring edits)

**Interfaces:**
- Consumes: `allApplications` (from Task 1); `allClients` (existing global); `sb` (Supabase client); `$`, `skelTable`, `emptyState`, `fmtDate`, `toast`, `openClientProfile` (all existing helpers)
- Produces: `loadApplications()`, `renderApplications()`, `convertApplication(id)`

**How to verify (no test suite — manual):**
Open admin.html in the browser, sign in, navigate to Applications, and confirm:
1. Table loads with rows from the `applications` Supabase table
2. The nav badge shows the count of `status = 'new'` applications (or is hidden if none)
3. Changing a status dropdown updates the badge colour and persists on page refresh
4. "Convert to Client" button is visible for `new`/`reviewing` rows; absent for `accepted`/`declined`
5. Clicking "Convert to Client" on a row: creates a client record, toasts a success message, and navigates to the new client profile
6. Attempting "Convert to Client" on a row whose email matches an existing client shows the "already exists" toast and stops

---

- [ ] **Step 1: Add `loadApplications()` to the `loadAll()` Promise.all**

In `admin.html`, find line 3525:
```javascript
  await Promise.all([loadStats(), loadBookings(), loadSlots(), loadServices(), loadContacts(), loadClients(), loadProjects(), loadRecentActivity(), loadRetainerOverview(), loadQuotes(), loadInvoices(), loadRetainers(), loadProposalEcosystem(), loadSigningRequests(), loadMandates()]);
```

Append `loadApplications()`:
```javascript
  await Promise.all([loadStats(), loadBookings(), loadSlots(), loadServices(), loadContacts(), loadClients(), loadProjects(), loadRecentActivity(), loadRetainerOverview(), loadQuotes(), loadInvoices(), loadRetainers(), loadProposalEcosystem(), loadSigningRequests(), loadMandates(), loadApplications()]);
```

- [ ] **Step 2: Add `renderApplications()` call to `switchPage()`**

In `admin.html`, find line 3138:
```javascript
  if (name === 'pipeline') renderPipelinePage();
```

Add the applications render call on the next line:
```javascript
  if (name === 'pipeline') renderPipelinePage();
  if (name === 'applications') renderApplications();
```

- [ ] **Step 3: Add `loadApplications()`, `renderApplications()`, and `convertApplication()` functions**

Find the `loadContacts()` function (around line 4196). Insert the three new functions immediately before it:

```javascript
/* ── Applications ── */
async function loadApplications() {
  const el = $('applications-table');
  if (el) el.innerHTML = skelTable(5, 8);
  const { data } = await sb.from('applications').select('*').order('created_at', { ascending: false });
  allApplications = data || [];
  renderApplications();
  const newCount = allApplications.filter(a => a.status === 'new').length;
  const badge = $('new-application-badge');
  if (badge) {
    if (newCount > 0) { badge.textContent = newCount; badge.classList.add('show'); }
    else badge.classList.remove('show');
  }
}

function renderApplications() {
  const c = $('applications-table');
  if (!c) return;
  if (!allApplications.length) {
    c.innerHTML = emptyState('No applications yet', 'Partnership applications from the website will appear here.');
    return;
  }
  c.innerHTML = `<table class="a-table">
    <thead><tr>
      <th>Date</th><th>Company</th><th>Contact</th><th>Industry</th><th>Services</th><th>Investment</th><th>Status</th><th></th>
    </tr></thead>
    <tbody>${allApplications.map(r => {
      const canConvert = r.status === 'new' || r.status === 'reviewing';
      const badgeClass = r.status === 'new' ? 'badge-new'
        : r.status === 'reviewing' ? 'badge-amber'
        : r.status === 'accepted'  ? 'badge-confirmed'
        : 'badge-declined';
      return `<tr>
        <td class="td-dim">${fmtDate(r.created_at?.split('T')[0])}</td>
        <td class="td-name" title="${(r.business_challenges||'').replace(/"/g,'&quot;')}">${r.company_name || '—'}</td>
        <td><span style="display:block;font-size:.8rem">${r.full_name || '—'}</span><span style="display:block;font-size:.72rem;color:rgba(245,244,241,.45)">${r.job_title || ''}</span></td>
        <td class="td-dim">${r.industry || '—'}</td>
        <td style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:.74rem;color:rgba(245,244,241,.45)" title="${(r.services_of_interest||'').replace(/"/g,'&quot;')}">${r.services_of_interest || '—'}</td>
        <td class="td-dim">${r.investment_range || '—'}</td>
        <td>
          ${r.status === 'accepted'
            ? `<span class="badge badge-confirmed">Accepted</span>`
            : `<span class="badge ${badgeClass}" style="cursor:pointer">
            <select class="status-select" data-id="${r.id}">
              <option value="new"${r.status==='new'?' selected':''}>New</option>
              <option value="reviewing"${r.status==='reviewing'?' selected':''}>Reviewing</option>
              <option value="declined"${r.status==='declined'?' selected':''}>Declined</option>
            </select>
          </span>`}
        </td>
        <td>${canConvert ? `<button class="act-btn convert-app" data-id="${r.id}" style="white-space:nowrap">Convert to Client</button>` : '—'}</td>
      </tr>`;
    }).join('')}</tbody>
  </table>`;

  c.querySelectorAll('.status-select').forEach(sel => {
    sel.addEventListener('change', async () => {
      const newStatus = sel.value;
      await sb.from('applications').update({ status: newStatus }).eq('id', sel.dataset.id);
      const idx = allApplications.findIndex(a => a.id === sel.dataset.id);
      if (idx !== -1) allApplications[idx].status = newStatus;
      toast(`Application marked as ${newStatus}.`);
      renderApplications();
      loadApplications();
    });
  });

  c.querySelectorAll('.convert-app').forEach(btn => {
    btn.addEventListener('click', () => convertApplication(btn.dataset.id));
  });
}

async function convertApplication(applicationId) {
  const app = allApplications.find(a => a.id === applicationId);
  if (!app) return;
  if (allClients.some(c => c.email?.toLowerCase() === app.email?.toLowerCase())) {
    toast('A client with this email already exists.');
    return;
  }
  const btn = document.querySelector(`.convert-app[data-id="${applicationId}"]`);
  if (btn) { btn.disabled = true; btn.textContent = 'Converting…'; }
  const now = new Date().toISOString();
  const { data: newClient, error } = await sb.from('clients').insert({
    full_name:        app.full_name,
    email:            app.email,
    phone:            app.phone,
    company:          app.company_name,
    lifecycle_stage:  'Lead',
    stage_entered_at: now,
  }).select().single();
  if (error) {
    toast('Error creating client. Please try again.');
    if (btn) { btn.disabled = false; btn.textContent = 'Convert to Client'; }
    return;
  }
  await sb.from('applications').update({ status: 'accepted' }).eq('id', applicationId);
  const idx = allApplications.findIndex(a => a.id === applicationId);
  if (idx !== -1) allApplications[idx].status = 'accepted';
  allClients.push(newClient);
  toast(`${app.full_name} added as a Lead-stage client.`);
  renderApplications();
  openClientProfile(newClient.id);
}

```

- [ ] **Step 4: Manual verification — data**

Open admin.html, sign in, click Applications in the nav.
- Table must render with application rows (Date, Company, Contact, Industry, Services, Investment, Status, action column)
- Nav badge shows count of `new` applications (or is hidden)
- Page title reads "Applications"
- No console errors

- [ ] **Step 5: Manual verification — status change**

Click a status dropdown on any application row, change it to "Reviewing".
- Badge colour updates to amber immediately
- Page refresh: status persists (verify in Supabase dashboard or re-open the page)
- Badge count decreases by 1 if the row was "New"

- [ ] **Step 6: Manual verification — convert to client**

Pick a `new` or `reviewing` application and click "Convert to Client".
- Button disables and shows "Converting…"
- Toast appears: "[Full Name] added as a Lead-stage client."
- Page navigates to the new client's profile
- Client profile shows the correct name, email, phone, company, lifecycle stage = Lead
- Return to Applications: the converted row now shows status "Accepted" with `badge-confirmed`, no button

- [ ] **Step 7: Manual verification — duplicate email guard**

If a client with the same email already exists in `allClients`, clicking "Convert to Client" must show:
- Toast: "A client with this email already exists."
- No navigation, no new client created

- [ ] **Step 8: Commit**

```bash
git add admin.html
git commit -m "feat(admin): applications page — load, render, status changes, convert to client"
```
