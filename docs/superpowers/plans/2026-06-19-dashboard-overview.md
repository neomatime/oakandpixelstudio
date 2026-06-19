# Dashboard Overview Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the booking-only Overview page with a full business overview: 4 new stat cards (Active Leads / Total Clients / Pending Bookings / Open Slots), a unified recent-activity feed (leads + client conversions + bookings), a pipeline strip (Leads → Clients → Confirmed), and the existing 7-day trend chart.

**Architecture:** All changes are in `admin.html` — the single static file that ships as the admin dashboard. No schema migrations needed; all data already exists in Supabase (`contacts`, `clients`, `bookings`, `available_slots`). The donut chart (Bookings by Status) is removed; the trend chart stays but moves position. The `renderRecent()` function and its `#recent-list` DOM target are removed; a new `loadRecentActivity()` function replaces them.

**Tech Stack:** Vanilla JS, Supabase JS CDN (`sb` client already initialised), Chart.js v4 (already loaded), OPS design tokens in `:root`.

---

## File Structure

**Only file touched:** `admin.html`
(`C:\Users\Neo\OneDrive\Documents\Oak & Pixel Studio\OPS\oakandpixel\admin.html`)

Changes are spread across four areas in this file:
1. `<style>` block — CSS additions
2. `<section id="page-overview">` — HTML restructure
3. `loadStats()` JS function — business metrics + pipeline render
4. `loadBookings()`, `renderCharts()`, `loadAll()` — cleanup + new activity feed

---

### Task 1: CSS — overview layout, activity feed, pipeline, si-amber

**Files:**
- Modify: `admin.html` (CSS `<style>` block, lines ~13 and ~140–144)

No tests for pure CSS. Verify visually after Task 2.

- [ ] **Step 1: Add `--emerald-l` to `:root`**

Find the `:root` block (line 13). It currently ends with `--font-m:'DM Mono',monospace;`. Add `--emerald-l:#2D7A52;` after `--emerald:#1A5C3A;`:

```css
--emerald:#1A5C3A;--emerald-l:#2D7A52;--em-dim:rgba(26,92,58,.13);--em-mid:rgba(26,92,58,.25);
```

- [ ] **Step 2: Add `si-amber` stat icon class**

Find line 144: `.si-muted{background:rgba(245,244,241,.05);color:var(--mist);}`. Add `si-amber` immediately after it (line 145):

```css
.si-amber{background:var(--amber-dim);color:var(--amber);}
```

- [ ] **Step 3: Add overview layout, activity feed, and pipeline CSS**

Find the comment `/* ── CARDS ───` (line ~149). Insert the following block immediately **before** it:

```css
/* ── OVERVIEW CONTENT ────────────────────── */
.overview-content{display:grid;grid-template-columns:1.5fr 1fr;gap:1rem;margin-bottom:1rem;}
.overview-right{display:flex;flex-direction:column;gap:1rem;}

/* ── ACTIVITY FEED ───────────────────────── */
.activity-row{display:flex;align-items:flex-start;gap:.75rem;padding:.65rem 0;border-bottom:1px solid var(--border);}
.activity-row:last-child{border-bottom:none;}
.activity-icon{width:26px;height:26px;flex-shrink:0;border-radius:3px;display:flex;align-items:center;justify-content:center;font-family:var(--font-m);font-size:.58rem;margin-top:.1rem;}
.ai-lead{background:rgba(45,122,82,.18);color:var(--emerald-l);}
.ai-client{background:var(--gold-dim);color:var(--gold);}
.ai-booking-ok{background:var(--ok-dim);color:var(--ok);}
.ai-booking-pen{background:var(--amber-dim);color:var(--amber);}
.activity-body{flex:1;min-width:0;}
.activity-name{font-size:.82rem;color:var(--off-white);line-height:1.3;}
.activity-sub{font-size:.72rem;color:rgba(245,244,241,.35);margin-top:.1rem;}
.activity-time{font-family:var(--font-m);font-size:.6rem;color:rgba(245,244,241,.22);flex-shrink:0;padding-top:.15rem;}

/* ── PIPELINE ────────────────────────────── */
.pipeline-strip{display:flex;align-items:stretch;}
.pipe-step{flex:1;padding:.85rem .75rem;text-align:center;background:var(--card);border:1px solid var(--border);}
.pipe-step+.pipe-step{border-left:none;}
.pipe-num{font-family:var(--font-d);font-size:1.8rem;font-weight:400;line-height:1;margin-bottom:.25rem;}
.pipe-lbl{font-family:var(--font-m);font-size:.52rem;letter-spacing:.1em;text-transform:uppercase;color:rgba(245,244,241,.28);}
.pipe-arrow{display:flex;align-items:center;color:rgba(245,244,241,.14);padding:0 .1rem;font-size:.9rem;}
```

- [ ] **Step 4: Commit**

```bash
git add admin.html
git commit -m "style(admin): overview layout, activity feed, and pipeline CSS"
```

---

### Task 2: HTML — restructure the overview section

**Files:**
- Modify: `admin.html` (`<section id="page-overview">`, lines 442–488)

- [ ] **Step 1: Replace the entire overview section**

Find the block from `<section class="page active" id="page-overview">` to its closing `</section>` (lines 442–488). Replace it entirely with:

```html
      <section class="page active" id="page-overview">
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-icon si-emerald">
              <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
            </div>
            <div><div class="stat-num" id="stat-total">—</div><div class="stat-lbl">Active Leads</div></div>
          </div>
          <div class="stat-card">
            <div class="stat-icon si-gold">
              <svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/><polyline points="17 21 19 23 23 19"/></svg>
            </div>
            <div><div class="stat-num" id="stat-pending">—</div><div class="stat-lbl">Total Clients</div></div>
          </div>
          <div class="stat-card">
            <div class="stat-icon si-amber">
              <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            </div>
            <div><div class="stat-num" id="stat-confirmed">—</div><div class="stat-lbl">Pending Bookings</div></div>
          </div>
          <div class="stat-card">
            <div class="stat-icon si-muted">
              <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="16" y1="2" x2="16" y2="6"/></svg>
            </div>
            <div><div class="stat-num" id="stat-slots">—</div><div class="stat-lbl">Open Slots</div></div>
          </div>
        </div>

        <div class="overview-content">
          <div class="card" style="margin-bottom:0">
            <div class="card-header"><span class="card-title">Recent Activity</span></div>
            <div id="activity-feed" style="padding:0 1.5rem"><p class="loading-row">Loading…</p></div>
          </div>
          <div class="overview-right">
            <div class="card" style="margin-bottom:0">
              <div class="card-header"><span class="card-title">Pipeline</span></div>
              <div class="pipeline-strip" id="pipeline-row"></div>
            </div>
            <div class="card" style="margin-bottom:0">
              <div class="card-header"><span class="card-title">Last 7 Days</span></div>
              <div class="chart-wrap"><canvas id="chart-trend"></canvas></div>
            </div>
          </div>
        </div>
      </section>
```

- [ ] **Step 2: Verify HTML parses cleanly**

Open `admin.html` in a browser (file://) and confirm no obvious layout collapse. The overview section should show 4 stat cards (all showing "—"), an empty activity feed area, an empty pipeline area, and the trend chart canvas. The page won't have live data until Task 3 and 4.

- [ ] **Step 3: Commit**

```bash
git add admin.html
git commit -m "feat(admin): restructure overview section HTML for business dashboard"
```

---

### Task 3: JS — rewrite loadStats() + add renderPipeline()

**Files:**
- Modify: `admin.html` (JS globals block line ~615, `loadStats()` lines 726–745)

- [ ] **Step 1: Add `confirmedCount` global**

Find the globals block (around line 607):
```js
let statusChart, trendChart;
```
Add `confirmedCount` on the same line:
```js
let statusChart, trendChart;
let confirmedCount = 0;
```

- [ ] **Step 2: Replace `loadStats()`**

Find `async function loadStats()` (line 726). Replace the entire function with:

```js
async function loadStats() {
  const [bRes, sRes, leadsRes, clientsRes] = await Promise.all([
    sb.from('bookings').select('status'),
    sb.from('available_slots').select('is_booked').eq('is_booked', false).gte('date', todayStr()),
    sb.from('contacts').select('*', { count: 'exact', head: true }).is('converted_at', null),
    sb.from('clients').select('*', { count: 'exact', head: true })
  ]);
  const bookings      = bRes.data || [];
  const pending       = bookings.filter(b => b.status === 'pending').length;
  confirmedCount      = bookings.filter(b => b.status === 'confirmed').length;
  const slots         = (sRes.data || []).length;
  const leads         = leadsRes.count  ?? 0;
  const clients       = clientsRes.count ?? 0;

  $('stat-total').textContent     = leads;
  $('stat-pending').textContent   = clients;
  $('stat-confirmed').textContent = pending;
  $('stat-slots').textContent     = slots;

  const badge = $('pending-badge');
  if (pending > 0) { badge.textContent = pending; badge.classList.add('show'); }
  else badge.classList.remove('show');

  renderPipeline(leads, clients, confirmedCount);
}
```

- [ ] **Step 3: Add `renderPipeline()` immediately after `loadStats()`**

Insert this function immediately after the closing `}` of `loadStats()`:

```js
function renderPipeline(leads, clients, confirmed) {
  const c = $('pipeline-row');
  if (!c) return;
  c.innerHTML = `
    <div class="pipe-step"><div class="pipe-num" style="color:var(--emerald-l)">${leads}</div><div class="pipe-lbl">Leads</div></div>
    <div class="pipe-arrow">›</div>
    <div class="pipe-step"><div class="pipe-num" style="color:var(--gold)">${clients}</div><div class="pipe-lbl">Clients</div></div>
    <div class="pipe-arrow">›</div>
    <div class="pipe-step"><div class="pipe-num" style="color:var(--ok)">${confirmed}</div><div class="pipe-lbl">Confirmed</div></div>
  `;
}
```

- [ ] **Step 4: Verify in browser**

Log in to admin, navigate to Overview. The 4 stat cards should now show live counts:
- Active Leads = count of contacts where `converted_at IS NULL`
- Total Clients = count of rows in `clients` table
- Pending Bookings = bookings with `status = 'pending'`
- Open Slots = available slots from today onward

The pipeline strip should show three boxes with the same Leads / Clients / Confirmed counts.

- [ ] **Step 5: Commit**

```bash
git add admin.html
git commit -m "feat(admin): business stats and pipeline in overview loadStats"
```

---

### Task 4: JS — add timeAgo() + loadRecentActivity(), remove old code

**Files:**
- Modify: `admin.html` (multiple JS sections)

- [ ] **Step 1: Add `timeAgo()` helper**

Find the date helpers section (around line 617, near `fmtDate`, `fmtTime`). Add `timeAgo` immediately after `fmtTime`:

```js
function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60)  return `${Math.max(1, m)}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7)   return `${d}d ago`;
  return fmtDate(iso.split('T')[0]);
}
```

- [ ] **Step 2: Add `loadRecentActivity()` function**

Add this function immediately after `renderPipeline()` (the function added in Task 3):

```js
async function loadRecentActivity() {
  const [leadsRes, clientsRes, bookingsRes] = await Promise.all([
    sb.from('contacts').select('id,full_name,project_type,created_at').is('converted_at', null).order('created_at', { ascending: false }).limit(8),
    sb.from('clients').select('id,full_name,created_at').order('created_at', { ascending: false }).limit(8),
    sb.from('bookings').select('id,full_name,status,created_at,slot:slot_id(date,start_time)').order('created_at', { ascending: false }).limit(8)
  ]);
  const leads    = (leadsRes.data    || []).map(r => ({ ...r, _type: 'lead'    }));
  const clients  = (clientsRes.data  || []).map(r => ({ ...r, _type: 'client'  }));
  const bookings = (bookingsRes.data || []).map(r => ({ ...r, _type: 'booking' }));
  const all = [...leads, ...clients, ...bookings]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 8);

  const c = $('activity-feed');
  if (!c) return;
  if (!all.length) {
    c.innerHTML = emptyState('No activity yet', 'Activity will appear as leads, clients, and bookings come in.');
    return;
  }
  c.innerHTML = all.map(r => {
    let icon, primary, secondary;
    if (r._type === 'lead') {
      icon      = `<div class="activity-icon ai-lead">L</div>`;
      primary   = `New lead — <strong>${r.full_name}</strong>`;
      secondary = r.project_type || '—';
    } else if (r._type === 'client') {
      icon      = `<div class="activity-icon ai-client">C</div>`;
      primary   = `Converted to client — <strong>${r.full_name}</strong>`;
      secondary = 'via Contacts';
    } else {
      const ok  = r.status === 'confirmed';
      icon      = `<div class="activity-icon ${ok ? 'ai-booking-ok' : 'ai-booking-pen'}">B</div>`;
      const ds  = r.slot?.date ? fmtDate(r.slot.date) : '—';
      const ts  = fmtTime(r.slot?.start_time);
      primary   = `Booking ${r.status} — <strong>${ds}</strong>`;
      secondary = `${ts} · ${r.status}`;
    }
    return `<div class="activity-row">
      ${icon}
      <div class="activity-body">
        <div class="activity-name">${primary}</div>
        <div class="activity-sub">${secondary}</div>
      </div>
      <div class="activity-time">${timeAgo(r.created_at)}</div>
    </div>`;
  }).join('');
}
```

- [ ] **Step 3: Update `loadAll()` to include `loadRecentActivity()`**

Find `async function loadAll()` (line ~719):
```js
async function loadAll() {
  await Promise.all([loadStats(), loadBookings(), loadSlots(), loadServices(), loadContacts(), loadClients()]);
}
```
Replace with:
```js
async function loadAll() {
  await Promise.all([loadStats(), loadBookings(), loadSlots(), loadServices(), loadContacts(), loadClients(), loadRecentActivity()]);
}
```

- [ ] **Step 4: Remove `renderRecent()` call from `loadBookings()`**

Find `loadBookings()` (line ~748):
```js
async function loadBookings() {
  const { data } = await sb.from('bookings')
    .select('id,full_name,company,email,phone,status,created_at,service:service_id(name),slot:slot_id(date,start_time)')
    .order('created_at', { ascending: false });
  allBookings = data || [];
  renderBookings();
  renderRecent();
  renderCharts();
}
```
Remove the `renderRecent();` line:
```js
async function loadBookings() {
  const { data } = await sb.from('bookings')
    .select('id,full_name,company,email,phone,status,created_at,service:service_id(name),slot:slot_id(date,start_time)')
    .order('created_at', { ascending: false });
  allBookings = data || [];
  renderBookings();
  renderCharts();
}
```

- [ ] **Step 5: Remove `renderRecent()` function**

Find and delete the entire `renderRecent()` function (lines ~758–764):
```js
function renderRecent() {
  const c = $('recent-list');
  const recent = allBookings.slice(0, 5);
  if (!recent.length) { c.innerHTML = emptyState('No bookings yet'); return; }
  c.innerHTML = bookingTable(recent, true);
  wireBookingActions(c);
}
```
Delete these lines entirely.

- [ ] **Step 6: Remove donut chart from `renderCharts()`**

Find `renderCharts()` (line ~822). The function has two sections: the donut chart (ctx1 / statusChart) and the trend chart (ctx2 / trendChart). Remove the donut section. Replace the full function with only the trend chart portion:

```js
function renderCharts() {
  const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
  const textColor = isDark ? 'rgba(245,244,241,.45)' : 'rgba(26,26,24,.45)';
  const gridColor = isDark ? 'rgba(245,244,241,.05)' : 'rgba(26,26,24,.06)';

  const today = new Date();
  const days = Array.from({length:7}, (_,i) => {
    const d = new Date(today); d.setDate(d.getDate() - (6-i));
    return d.toISOString().split('T')[0];
  });
  const dayLabels = days.map(d => new Date(d+'T00:00:00').toLocaleDateString('en-ZA',{weekday:'short'}));
  const dayCounts = days.map(d => allBookings.filter(b => b.created_at?.startsWith(d)).length);

  const ctx2 = document.getElementById('chart-trend')?.getContext('2d');
  if (ctx2) {
    if (trendChart) trendChart.destroy();
    trendChart = new Chart(ctx2, {
      type: 'bar',
      data: {
        labels: dayLabels,
        datasets: [{ label: 'Bookings', data: dayCounts,
          backgroundColor: 'rgba(26,92,58,.55)', borderColor: 'rgba(26,92,58,.9)',
          borderWidth: 1, borderRadius: 3, borderSkipped: false }]
      },
      options: {
        responsive: true, maintainAspectRatio: true,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { color: gridColor }, ticks: { color: textColor, font: { family:"'DM Mono',monospace", size:10 } } },
          y: { grid: { color: gridColor }, ticks: { color: textColor, font: { family:"'DM Mono',monospace", size:10 }, stepSize:1 }, min:0, beginAtZero:true }
        }
      }
    });
  }
}
```

- [ ] **Step 7: Verify complete overview in browser**

Log in. Navigate to Overview. Confirm:
1. Stat cards: Active Leads / Total Clients / Pending Bookings / Open Slots all show real numbers
2. Pipeline strip: 3 boxes with Leads (emerald) → Clients (gold) → Confirmed (green)
3. Activity feed: up to 8 rows mixing L/C/B icons, names, sub-text, time-ago
4. Trend chart: bar chart for last 7 days still renders correctly
5. Navigate to Bookings page — booking list still works normally
6. Navigate to Contacts — still works; badge still reflects new leads count
7. Navigate to Clients — still works

- [ ] **Step 8: Commit**

```bash
git add admin.html
git commit -m "feat(admin): activity feed, remove donut chart, clean up renderRecent"
```

- [ ] **Step 9: Push**

```bash
git push origin main
```
