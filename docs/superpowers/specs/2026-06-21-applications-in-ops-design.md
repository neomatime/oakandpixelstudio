# Applications in OPS Command Center — Design

**Date:** 2026-06-21
**Status:** Approved
**File:** `admin.html` (single-file admin dashboard, vanilla JS, Supabase JS v2 CDN)

---

## Goal

Surface partnership applications submitted via the public website inside OPS Studio Command Center, with status management and a one-click "Convert to Client" action that creates a Lead-stage client record and navigates to their profile.

---

## Context

The `applications` table was created as part of the Partnership Application feature (migration `013_applications.sql`). Every submission from the public website lands there with `status = 'new'`. The OPS Command Center (`admin.html`) already has a contacts page that follows the load/render/status-select pattern — this feature follows the same conventions exactly.

---

## Scope

**In scope:**
- New "Applications" nav item in the sidebar
- New `page-applications` section with a data table
- `loadApplications()` function wired into `loadAll()`
- `allApplications` global array
- Nav badge showing count of `status = 'new'` applications
- Status badge+select inline dropdown (new → reviewing → declined)
- "Convert to Client" button: duplicate email check, client insert, status update, navigate to profile
- `accepted` status set automatically by Convert — not manually selectable

**Out of scope:**
- Viewing full application details in a modal or side panel
- Filtering or searching applications
- Sending emails or notifications from within OPS
- Bulk actions

---

## Nav Item

Inserted in the sidebar after the Contacts button and before the Clients button.

```html
<button class="nav-item" data-page="applications">
  <svg viewBox="0 0 24 24">
    <path d="M9 12h6M9 8h6M9 16h4M5 20V4a1 1 0 011-1h12a1 1 0 011 1v16l-3-2-3 2-3-2-3 2z"/>
  </svg>
  Applications
  <span class="nav-badge" id="new-application-badge"></span>
</button>
```

The `nav-badge` span uses the existing `.nav-badge` CSS class (same as contacts). It shows the count of `status = 'new'` applications and is hidden when count is 0.

---

## Page Section

Added after `page-contacts` section:

```html
<section class="page" id="page-applications">
  <div id="applications-table"></div>
</section>
```

---

## Data

### Global array

```javascript
let allApplications = [];
```

Added alongside the other `let allX = []` globals at the top of the script.

### `loadApplications()`

```javascript
async function loadApplications() {
  $('applications-table').innerHTML = skelTable(5, 8);
  const { data } = await sb.from('applications')
    .select('*')
    .order('created_at', { ascending: false });
  allApplications = data || [];
  renderApplications();
  const newCount = allApplications.filter(a => a.status === 'new').length;
  const badge = $('new-application-badge');
  if (badge) {
    if (newCount > 0) { badge.textContent = newCount; badge.classList.add('show'); }
    else badge.classList.remove('show');
  }
}
```

Add `loadApplications()` to the `Promise.all([...])` call in `loadAll()`.

### `PAGE_TITLES` addition

```javascript
applications: 'Applications'
```

---

## Table

### Columns

| Column | Source | Notes |
|---|---|---|
| Date | `created_at` | Formatted with `fmtDate()` |
| Company | `company_name` | `title` tooltip shows `business_challenges` |
| Contact | `full_name` + `job_title` | Two lines: name bold, title dim |
| Industry | `industry` | |
| Services | `services_of_interest` | Truncated via CSS `max-width:180px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap`; full text in `title` tooltip |
| Investment | `investment_range` | |
| Status | `status` | Badge+select inline dropdown |
| Action | — | "Convert to Client" button or "—" |

### Status dropdown

Uses existing `status-select` CSS pattern. Options:

```html
<select class="status-select" data-id="${r.id}">
  <option value="new"    ${r.status==='new'     ?' selected':''}>New</option>
  <option value="reviewing" ${r.status==='reviewing'?' selected':''}>Reviewing</option>
  <option value="declined"  ${r.status==='declined' ?' selected':''}>Declined</option>
</select>
```

`accepted` is intentionally absent from the dropdown — it is set only by the Convert action. Badge classes:

| Status | Badge class |
|---|---|
| `new` | `badge-new` |
| `reviewing` | `badge-amber` |
| `accepted` | `badge-confirmed` |
| `declined` | `badge-declined` |

### Action column

- Status is `new` or `reviewing`: show `<button class="act-btn convert-app" data-id="${r.id}">Convert to Client</button>`
- Status is `accepted` or `declined`: show `—` (no button)

---

## Convert to Client

### `convertApplication(applicationId)`

```javascript
async function convertApplication(applicationId) {
  const app = allApplications.find(a => a.id === applicationId);
  if (!app) return;

  // Duplicate email check against in-memory clients
  if (allClients.some(c => c.email?.toLowerCase() === app.email?.toLowerCase())) {
    toast('A client with this email already exists.');
    return;
  }

  const btn = document.querySelector(`.convert-app[data-id="${applicationId}"]`);
  if (btn) { btn.disabled = true; btn.textContent = 'Converting…'; }

  const now = new Date().toISOString();

  // Insert client
  const { data: newClient, error } = await sb.from('clients').insert({
    full_name:       app.full_name,
    email:           app.email,
    phone:           app.phone,
    company:         app.company_name,
    lifecycle_stage: 'Lead',
    stage_entered_at: now,
  }).select().single();

  if (error) {
    toast('Error creating client. Please try again.');
    if (btn) { btn.disabled = false; btn.textContent = 'Convert to Client'; }
    return;
  }

  // Mark application accepted
  await sb.from('applications').update({ status: 'accepted' }).eq('id', applicationId);
  const idx = allApplications.findIndex(a => a.id === applicationId);
  if (idx !== -1) allApplications[idx].status = 'accepted';

  // Add to in-memory clients and navigate
  allClients.push(newClient);
  toast(`${app.full_name} added as a Lead-stage client.`);
  renderApplications();
  openClientProfile(newClient.id);
}
```

### Wire up button listeners in `renderApplications()`

```javascript
c.querySelectorAll('.convert-app').forEach(btn => {
  btn.addEventListener('click', () => convertApplication(btn.dataset.id));
});
```

---

## Status change handler

Same pattern as contacts:

```javascript
c.querySelectorAll('.status-select').forEach(sel => {
  sel.addEventListener('change', async () => {
    await sb.from('applications').update({ status: sel.value }).eq('id', sel.dataset.id);
    const idx = allApplications.findIndex(a => a.id === sel.dataset.id);
    if (idx !== -1) allApplications[idx].status = sel.value;
    toast(`Application marked as ${sel.value}.`);
    renderApplications();
    loadApplications(); // refresh badge count
  });
});
```

---

## `switchPage` addition

```javascript
if (name === 'applications') renderApplications();
```

Added in the `switchPage()` function alongside existing page-specific render calls.

---

## File Changes Summary

All changes are in `admin.html`:

| Area | Change |
|---|---|
| Globals | Add `let allApplications = [];` |
| Nav | Add Applications nav item with badge after Contacts |
| HTML | Add `page-applications` section |
| `PAGE_TITLES` | Add `applications: 'Applications'` |
| `loadAll()` | Add `loadApplications()` to Promise.all |
| `switchPage()` | Add `if (name === 'applications') renderApplications();` |
| New functions | `loadApplications()`, `renderApplications()`, `convertApplication()` |

No new files. No Supabase migrations. No new CSS classes — all styling uses existing patterns.

---

## Conventions

- `$('id')` — existing helper for `document.getElementById`
- `skelTable(rows, cols)` — existing skeleton loader
- `emptyState(title, subtitle)` — existing empty state helper
- `fmtDate(dateStr)` — existing date formatter
- `toast(msg)` — existing toast notification
- `openClientProfile(clientId)` — existing function to navigate to client profile
- `sb` — existing Supabase JS v2 client
- `badge-new`, `badge-amber`, `badge-confirmed`, `badge-declined` — all existing badge classes
- `status-select` — existing CSS class for inline badge+select dropdowns
- `act-btn` — existing CSS class for action buttons
- `nav-badge` — existing CSS class for sidebar count badges
