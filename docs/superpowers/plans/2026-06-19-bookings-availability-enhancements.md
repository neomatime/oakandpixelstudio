# Bookings & Availability Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add search, edit (full modal), and delete to the Bookings page, and add time-editing to unbooked availability slots.

**Architecture:** All changes are additive edits to the single file `admin.html` — no new files. A shared modal overlay component (HTML + CSS + JS helpers) is introduced first and reused by both the booking edit modal and the slot edit modal. No schema changes required.

**Tech Stack:** Static HTML, Supabase JS CDN v2, existing design tokens (CSS custom properties), flatpickr (already loaded), no additional libraries.

---

## Context for implementers

- `admin.html` is a single-file admin dashboard (~1260 lines). All CSS, HTML, and JS live in it.
- Supabase client is `sb`. Helper `$(id)` = `document.getElementById(id)`.
- Existing globals: `allBookings`, `allContacts`, `allClients`, `currentFilter`, `trendChart`, `confirmedCount`.
- `loadAll()` calls `loadStats()`, `loadBookings()`, `loadSlots()`, `loadServices()`, `loadContacts()`, `loadClients()`, `loadRecentActivity()` in parallel via `Promise.all`.
- Existing toast: `toast(msg)` shows a notification.
- Existing helpers: `fmtDate(dateStr)`, `fmtTime(timeStr)`, `fmtDateLong(dateStr)`, `emptyState(title, sub)`.
- Design tokens: `--bg:#0A0A09`, `--card:#161614`, `--border`, `--border-hi`, `--emerald:#1A5C3A`, `--emerald-l:#2D7A52`, `--gold:#B8955A`, `--ok:#5a9e6f`, `--err:#e07070`, `--off-white:#F5F4F1`, `--mist:#9B9B94`, `--font-d` (Cormorant), `--font-b` (Jost), `--font-m` (DM Mono).

---

## Files

- **Modify:** `admin.html` — all 5 tasks touch this file only

---

## Task 1: Shared modal infrastructure

**Files:**
- Modify: `admin.html` (CSS section, HTML body, JS section)

- [ ] **Step 1: Add modal CSS**

Find the `/* ── CHARTS` comment in the CSS (around line 352). Insert this block **before** it:

```css
/* ── MODAL ───────────────────────────────── */
.modal-overlay{position:fixed;inset:0;background:rgba(10,10,9,.82);display:flex;align-items:center;justify-content:center;z-index:200;}
.modal-box{background:var(--card);border:1px solid var(--border-hi);width:min(480px,94vw);}
.modal-hdr{padding:1rem 1.5rem;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;}
.modal-title{font-family:var(--font-d);font-size:1.15rem;font-weight:400;}
.modal-close{background:none;border:none;color:rgba(245,244,241,.3);font-size:1.1rem;cursor:pointer;padding:0;line-height:1;}
.modal-close:hover{color:var(--off-white);}
.modal-body{padding:1.25rem 1.5rem;display:grid;grid-template-columns:1fr 1fr;gap:.85rem;}
.modal-field{display:flex;flex-direction:column;gap:.3rem;}
.modal-field.full{grid-column:1/-1;}
.modal-field label{font-family:var(--font-m);font-size:.54rem;letter-spacing:.11em;text-transform:uppercase;color:rgba(245,244,241,.32);}
.modal-field input,.modal-field select{background:rgba(245,244,241,.04);border:1px solid var(--border-hi);color:var(--off-white);font-family:var(--font-b);font-size:.82rem;padding:.55rem .75rem;outline:none;transition:border-color .2s;}
.modal-field input:focus,.modal-field select:focus{border-color:var(--emerald);}
.modal-field input[readonly]{opacity:.5;cursor:default;}
.modal-field select option{background:var(--card);}
.modal-divider{grid-column:1/-1;border:none;border-top:1px solid var(--border);margin:.1rem 0;}
.modal-foot{padding:.85rem 1.5rem;border-top:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;}
.modal-foot-right{display:flex;gap:.5rem;}
.btn-danger{background:none;border:1px solid rgba(224,112,112,.25);color:var(--err);font-family:var(--font-m);font-size:.58rem;letter-spacing:.08em;padding:.4rem .85rem;cursor:pointer;transition:opacity .2s;}
.btn-danger:hover{opacity:.75;}
.btn-ghost{background:none;border:1px solid rgba(245,244,241,.1);color:rgba(245,244,241,.45);font-family:var(--font-m);font-size:.58rem;letter-spacing:.08em;padding:.4rem .85rem;cursor:pointer;transition:opacity .2s;}
.btn-ghost:hover{opacity:.75;}
```

- [ ] **Step 2: Add modal HTML**

Find `<div class="toast" id="toast"></div>` (line 618). Insert this **after** it, before the `<script>` tags:

```html
<div id="modal-overlay" class="modal-overlay" style="display:none" role="dialog" aria-modal="true">
  <div id="modal-box" class="modal-box"></div>
</div>
```

- [ ] **Step 3: Add showModal / closeModal JS helpers**

Find the `/* ── Load all data ── */` comment in the JS section (just before `async function loadAll()`). Insert this block **before** it:

```js
/* ── Modal ── */
function showModal(html) {
  $('modal-box').innerHTML = html;
  $('modal-overlay').style.display = 'flex';
}
function closeModal() {
  $('modal-overlay').style.display = 'none';
  $('modal-box').innerHTML = '';
}
$('modal-overlay').addEventListener('click', e => {
  if (e.target === $('modal-overlay')) closeModal();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && $('modal-overlay').style.display !== 'none') closeModal();
});
```

- [ ] **Step 4: Verify modal opens and closes**

Open `admin.html` in browser (login), open DevTools console, run:
```js
showModal('<div class="modal-hdr"><span class="modal-title">Test</span><button class="modal-close" onclick="closeModal()">✕</button></div><div class="modal-body" style="grid-template-columns:1fr"><div class="modal-field full"><label>Hello</label><input value="World"></div></div>')
```

Expected: dark overlay appears, modal card with "Test" title and input. Press Escape or click outside — modal closes. Run `closeModal()` in console to reset.

- [ ] **Step 5: Commit**

```bash
git add admin.html
git commit -m "feat(admin): add shared modal overlay infrastructure"
```

---

## Task 2: Bookings — search bar + allServices global

**Files:**
- Modify: `admin.html` (globals, HTML, CSS, JS)

- [ ] **Step 1: Add new globals**

Find the globals block (around line 630):
```js
let allBookings = [];
let allContacts = [];
```

Add two new globals immediately after `let allClients = [];`:
```js
let allServices = [];
let bookingSearch = '';
```

- [ ] **Step 2: Populate allServices in loadServices()**

Find `async function loadServices()`. The function currently starts with:
```js
async function loadServices() {
  const c = $('services-grid');
  const { data } = await sb.from('services').select('id,name,description,price,active,sort_order').order('sort_order');
  if (!data?.length) { c.innerHTML = emptyState('No services found'); return; }
```

Add `allServices = data || [];` after the `{ data }` destructuring line so services are always cached (even the empty case):

Replace:
```js
  const { data } = await sb.from('services').select('id,name,description,price,active,sort_order').order('sort_order');
  if (!data?.length) { c.innerHTML = emptyState('No services found'); return; }
```

With:
```js
  const { data } = await sb.from('services').select('id,name,description,price,active,sort_order').order('sort_order');
  allServices = data || [];
  if (!data?.length) { c.innerHTML = emptyState('No services found'); return; }
```

- [ ] **Step 3: Add booking-toolbar CSS**

Find the `/* ── CONTACTS` comment in the CSS. Insert this rule **before** it:

```css
/* ── BOOKING TOOLBAR ─────────────────────── */
.booking-toolbar{display:flex;align-items:center;gap:.75rem;padding:.75rem 1rem;border-bottom:1px solid var(--border);flex-wrap:wrap;}
.booking-toolbar .filter-row{margin:0;gap:.3rem;}
```

- [ ] **Step 4: Update bookings HTML to add search**

Find `<section class="page" id="page-bookings">`. Replace the content inside it up to `<div class="card">`:

Replace:
```html
      <section class="page" id="page-bookings">
        <div class="filter-row">
          <button class="f-tab active" data-filter="all">All</button>
          <button class="f-tab" data-filter="pending">Pending</button>
          <button class="f-tab" data-filter="confirmed">Confirmed</button>
          <button class="f-tab" data-filter="declined">Declined</button>
        </div>
```

With:
```html
      <section class="page" id="page-bookings">
        <div class="booking-toolbar">
          <input type="text" class="search-input" id="booking-search" placeholder="Search by name or email…">
          <div class="filter-row" style="margin:0;gap:.3rem;">
            <button class="f-tab active" data-filter="all">All</button>
            <button class="f-tab" data-filter="pending">Pending</button>
            <button class="f-tab" data-filter="confirmed">Confirmed</button>
            <button class="f-tab" data-filter="declined">Declined</button>
          </div>
        </div>
```

- [ ] **Step 5: Apply search filter in renderBookings()**

Find `function renderBookings()`. Replace it entirely:

```js
function renderBookings() {
  const c = $('bookings-table');
  let filtered = currentFilter === 'all' ? allBookings : allBookings.filter(b => b.status === currentFilter);
  if (bookingSearch) {
    const q = bookingSearch.toLowerCase();
    filtered = filtered.filter(b => b.full_name?.toLowerCase().includes(q) || b.email?.toLowerCase().includes(q));
  }
  if (!filtered.length) { c.innerHTML = emptyState('No bookings found'); return; }
  c.innerHTML = bookingTable(filtered, false);
  wireBookingActions(c);
}
```

- [ ] **Step 6: Wire search input**

Find the block `document.querySelectorAll('.f-tab[data-filter]').forEach(tab => {`. Add the following **after** the closing `});` of that block:

```js
$('booking-search')?.addEventListener('input', e => {
  bookingSearch = e.target.value.trim();
  renderBookings();
});
```

- [ ] **Step 7: Verify search works**

Navigate to Bookings in the browser. Type a name in the search box — bookings should filter in real time. Clear the search — all bookings return. Switch status tab while search text is active — combined filter should apply.

- [ ] **Step 8: Commit**

```bash
git add admin.html
git commit -m "feat(admin): booking search bar and allServices global"
```

---

## Task 3: Bookings — Edit modal

**Files:**
- Modify: `admin.html` (JS: loadBookings query, bookingTable, openEditBookingModal, saveEditBooking, wireBookingActions)

- [ ] **Step 1: Fetch service_id and slot_id in loadBookings()**

Find `loadBookings()`:
```js
async function loadBookings() {
  const { data } = await sb.from('bookings')
    .select('id,full_name,company,email,phone,status,created_at,service:service_id(name),slot:slot_id(date,start_time)')
```

Add `service_id,slot_id` to the select so those raw IDs are available on each booking object:
```js
async function loadBookings() {
  const { data } = await sb.from('bookings')
    .select('id,full_name,company,email,phone,status,created_at,service_id,slot_id,service:service_id(name),slot:slot_id(date,start_time)')
```

- [ ] **Step 2: Update bookingTable() to include Edit + Delete buttons**

Find `function bookingTable(rows, compact)`. Replace the entire function:

```js
function bookingTable(rows, compact) {
  return `<table class="a-table">
    <thead><tr>
      <th>Name</th><th>Service</th><th>Date &amp; Time</th>
      ${compact ? '' : '<th>Company</th><th>Contact</th>'}
      <th>Status</th><th>Actions</th>
    </tr></thead>
    <tbody>${rows.map(b => {
      const date = b.slot?.date ? fmtDate(b.slot.date) : '—';
      const time = fmtTime(b.slot?.start_time);
      const pendingActions = b.status === 'pending'
        ? `<button class="act-btn confirm" data-id="${b.id}" data-action="confirmed">Confirm</button>
           <button class="act-btn decline" data-id="${b.id}" data-action="declined">Decline</button>`
        : '';
      const actions = `<div class="act-group">
        ${pendingActions}
        <button class="act-btn edit-booking" data-id="${b.id}">Edit</button>
        <button class="act-btn delete-booking" data-id="${b.id}" data-slot="${b.slot_id || ''}">Delete</button>
      </div>`;
      return `<tr>
        <td class="td-name">${b.full_name}</td>
        <td style="color:rgba(245,244,241,.55);font-size:.76rem">${b.service?.name || '—'}</td>
        <td><div class="td-stack"><span>${date}</span><span class="td-dim">${time}</span></div></td>
        ${compact ? '' : `<td>${b.company || '—'}</td><td><div class="td-stack"><span style="font-size:.75rem">${b.email}</span><span class="td-dim">${b.phone || '—'}</span></div></td>`}
        <td><span class="badge badge-${b.status}">${b.status}</span></td>
        <td>${actions}</td>
      </tr>`;
    }).join('')}</tbody>
  </table>`;
}
```

- [ ] **Step 3: Add openEditBookingModal()**

Insert this function **after** the `bookingTable()` function:

```js
async function openEditBookingModal(id) {
  const booking = allBookings.find(b => b.id === id);
  if (!booking) return;

  const [{ data: openSlots }, { data: currSlot }] = await Promise.all([
    sb.from('available_slots').select('id,date,start_time').eq('is_booked', false).order('date').order('start_time'),
    booking.slot_id
      ? sb.from('available_slots').select('id,date,start_time').eq('id', booking.slot_id).single()
      : Promise.resolve({ data: null })
  ]);

  const slotList = openSlots || [];
  if (currSlot && !slotList.find(s => s.id === currSlot.id)) slotList.unshift(currSlot);

  const noSlotOpt = booking.slot_id ? '' : '<option value="">— No slot assigned —</option>';
  const slotOptions = noSlotOpt + slotList.map(s => {
    const isCurrent = s.id === booking.slot_id;
    return `<option value="${s.id}"${isCurrent ? ' selected' : ''}>${fmtDate(s.date)} — ${fmtTime(s.start_time)}${isCurrent ? ' (current)' : ''}</option>`;
  }).join('');

  const serviceOptions = allServices.map(s =>
    `<option value="${s.id}"${s.id === booking.service_id ? ' selected' : ''}>${s.name}</option>`
  ).join('');

  const esc = v => (v || '').replace(/"/g, '&quot;');
  showModal(`
    <div class="modal-hdr">
      <span class="modal-title">Edit Booking</span>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <div class="modal-body">
      <div class="modal-field"><label>Full Name</label><input id="eb-name" value="${esc(booking.full_name)}"></div>
      <div class="modal-field"><label>Company</label><input id="eb-company" value="${esc(booking.company)}"></div>
      <div class="modal-field"><label>Email</label><input id="eb-email" value="${esc(booking.email)}"></div>
      <div class="modal-field"><label>Phone</label><input id="eb-phone" value="${esc(booking.phone)}"></div>
      <hr class="modal-divider">
      <div class="modal-field"><label>Service</label><select id="eb-service">${serviceOptions}</select></div>
      <div class="modal-field"><label>Status</label>
        <select id="eb-status">
          <option value="pending"${booking.status==='pending'?' selected':''}>Pending</option>
          <option value="confirmed"${booking.status==='confirmed'?' selected':''}>Confirmed</option>
          <option value="declined"${booking.status==='declined'?' selected':''}>Declined</option>
        </select>
      </div>
      <div class="modal-field full"><label>Date &amp; Time Slot</label><select id="eb-slot">${slotOptions}</select></div>
    </div>
    <div class="modal-foot">
      <button class="btn-danger" onclick="deleteBooking('${booking.id}','${booking.slot_id||''}')">Delete booking</button>
      <div class="modal-foot-right">
        <button class="btn-ghost" onclick="closeModal()">Cancel</button>
        <button class="btn-add" onclick="saveEditBooking('${booking.id}','${booking.slot_id||''}')">Save Changes</button>
      </div>
    </div>
  `);
}
```

- [ ] **Step 4: Add saveEditBooking()**

Insert immediately after `openEditBookingModal()`:

```js
async function saveEditBooking(bookingId, oldSlotId) {
  const newSlotId  = $('eb-slot')?.value  || null;
  const prevSlotId = oldSlotId             || null;
  const update = {
    full_name:  ($('eb-name').value  || '').trim(),
    company:    ($('eb-company').value || '').trim() || null,
    email:      ($('eb-email').value  || '').trim(),
    phone:      ($('eb-phone').value  || '').trim() || null,
    service_id: $('eb-service').value || null,
    status:     $('eb-status').value,
    slot_id:    newSlotId,
  };

  if (newSlotId !== prevSlotId) {
    if (prevSlotId) await sb.from('available_slots').update({ is_booked: false }).eq('id', prevSlotId);
    if (newSlotId)  await sb.from('available_slots').update({ is_booked: true  }).eq('id', newSlotId);
  }

  const { error } = await sb.from('bookings').update(update).eq('id', bookingId);
  if (error) { toast('Error saving changes.'); return; }

  closeModal();
  toast('Booking updated.');
  await Promise.all([loadStats(), loadBookings(), loadRecentActivity()]);
}
```

- [ ] **Step 5: Wire Edit button in wireBookingActions()**

Find `function wireBookingActions(container)`. The current function wires `.act-btn[data-action]` buttons. Add the Edit wiring **inside** that function, after the existing `forEach`:

```js
function wireBookingActions(container) {
  container.querySelectorAll('.act-btn[data-action]').forEach(btn => {
    btn.addEventListener('click', async () => {
      await sb.from('bookings').update({ status: btn.dataset.action }).eq('id', btn.dataset.id);
      toast(`Booking ${btn.dataset.action}.`);
      await Promise.all([loadStats(), loadBookings()]);
    });
  });
  container.querySelectorAll('.edit-booking').forEach(btn => {
    btn.addEventListener('click', () => openEditBookingModal(btn.dataset.id));
  });
}
```

(Leave `.delete-booking` wiring for Task 4.)

- [ ] **Step 6: Verify edit modal**

Navigate to Bookings. Click **Edit** on any booking — modal should open with all fields pre-populated. Change the Full Name field. Click **Save Changes**. Booking should update in the table with the new name and `toast('Booking updated.')` appears. Open the modal again — new name persists.

- [ ] **Step 7: Commit**

```bash
git add admin.html
git commit -m "feat(admin): booking edit modal with full field editing"
```

---

## Task 4: Bookings — Delete

**Files:**
- Modify: `admin.html` (JS: deleteBooking, wireBookingActions)

- [ ] **Step 1: Add deleteBooking()**

Insert this function immediately after `saveEditBooking()`:

```js
async function deleteBooking(id, slotId) {
  if (!confirm('Delete this booking? This cannot be undone.')) return;
  closeModal();
  if (slotId) await sb.from('available_slots').update({ is_booked: false }).eq('id', slotId);
  const { error } = await sb.from('bookings').delete().eq('id', id);
  if (error) { toast('Error deleting booking.'); return; }
  toast('Booking deleted.');
  await Promise.all([loadStats(), loadBookings(), loadRecentActivity()]);
}
```

- [ ] **Step 2: Wire Delete button in wireBookingActions()**

Find `function wireBookingActions(container)`. Add the Delete wiring after the `.edit-booking` block added in Task 3:

```js
function wireBookingActions(container) {
  container.querySelectorAll('.act-btn[data-action]').forEach(btn => {
    btn.addEventListener('click', async () => {
      await sb.from('bookings').update({ status: btn.dataset.action }).eq('id', btn.dataset.id);
      toast(`Booking ${btn.dataset.action}.`);
      await Promise.all([loadStats(), loadBookings()]);
    });
  });
  container.querySelectorAll('.edit-booking').forEach(btn => {
    btn.addEventListener('click', () => openEditBookingModal(btn.dataset.id));
  });
  container.querySelectorAll('.delete-booking').forEach(btn => {
    btn.addEventListener('click', () => deleteBooking(btn.dataset.id, btn.dataset.slot));
  });
}
```

- [ ] **Step 3: Verify delete from table row**

Navigate to Bookings. Click **Delete** on a row — browser `confirm()` appears. Click Cancel — nothing happens, booking stays. Click Delete again, click OK — `toast('Booking deleted.')` appears and booking disappears from table. Stats update (Pending Bookings card decrements if it was pending).

- [ ] **Step 4: Verify delete from inside edit modal**

Click **Edit** on any booking to open the modal. Click **Delete booking** (red, bottom-left of modal) — `confirm()` appears. Click OK — modal closes, booking deleted, table refreshes.

- [ ] **Step 5: Commit**

```bash
git add admin.html
git commit -m "feat(admin): booking delete with slot release"
```

---

## Task 5: Availability — Edit slot time

**Files:**
- Modify: `admin.html` (CSS, loadSlots JS, openEditSlotModal, saveEditSlot)

- [ ] **Step 1: Add edit-slot button CSS**

Find `.slot-chip` in the CSS. The existing rule block will have `.slot-chip`, `.slot-chip.booked`, `.slot-chip-t`, `.booked-lbl`, `.btn-rm`. Add this new rule **after** the `.btn-rm` rule in that section:

```css
.slot-chip .btn-edit-slot{background:none;border:none;border-left:1px solid var(--border);color:rgba(245,244,241,.28);font-size:.68rem;cursor:pointer;padding:0 .25rem 0 .3rem;margin-left:.2rem;line-height:1;transition:color .15s;}
.slot-chip .btn-edit-slot:hover{color:var(--off-white);}
```

- [ ] **Step 2: Add ✎ button to unbooked slot chips in loadSlots()**

Find `loadSlots()`. Inside the `.map()` that renders slot chips, find the ternary for booked vs unbooked:

```js
${s.is_booked
  ? '<span class="booked-lbl">Booked</span>'
  : `<button class="btn-rm" data-id="${s.id}" title="Remove">✕</button>`}
```

Replace with:

```js
${s.is_booked
  ? '<span class="booked-lbl">Booked</span>'
  : `<button class="btn-edit-slot" data-id="${s.id}" data-date="${s.date}" data-time="${s.start_time}" title="Edit time">✎</button><button class="btn-rm" data-id="${s.id}" title="Remove">✕</button>`}
```

- [ ] **Step 3: Wire the ✎ button in loadSlots()**

Still inside `loadSlots()`, find the block that wires `.btn-rm`:

```js
  c.querySelectorAll('.btn-rm').forEach(btn => {
    btn.addEventListener('click', async () => {
      await sb.from('available_slots').delete().eq('id', btn.dataset.id);
      toast('Slot removed.');
      loadSlots(); loadStats();
    });
  });
```

Add the `.btn-edit-slot` wiring **before** the `.btn-rm` block:

```js
  c.querySelectorAll('.btn-edit-slot').forEach(btn => {
    btn.addEventListener('click', () => openEditSlotModal(btn.dataset.id, btn.dataset.date, btn.dataset.time));
  });
  c.querySelectorAll('.btn-rm').forEach(btn => {
    btn.addEventListener('click', async () => {
      await sb.from('available_slots').delete().eq('id', btn.dataset.id);
      toast('Slot removed.');
      loadSlots(); loadStats();
    });
  });
```

- [ ] **Step 4: Add openEditSlotModal()**

Insert this function after `saveEditBooking()` (or after `deleteBooking()` — keep all booking functions together, then add slot functions after):

```js
function openEditSlotModal(slotId, date, currentTime) {
  const times = [];
  for (let h = 7; h <= 19; h++) {
    times.push(`${String(h).padStart(2,'0')}:00`);
    if (h < 19) times.push(`${String(h).padStart(2,'0')}:30`);
  }
  const pills = times.map(t =>
    `<button class="time-pill${t === currentTime ? ' selected' : ''}" data-time="${t}" type="button">${fmtTime(t)}</button>`
  ).join('');

  showModal(`
    <div class="modal-hdr">
      <span class="modal-title">Edit Slot Time</span>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <div class="modal-body" style="grid-template-columns:1fr">
      <div class="modal-field full">
        <label>Date (locked)</label>
        <input value="${fmtDateLong(date)}" readonly>
      </div>
      <div class="modal-field full">
        <label>New Time</label>
        <div class="time-pill-grid" id="edit-slot-pills">${pills}</div>
      </div>
    </div>
    <div class="modal-foot">
      <div></div>
      <div class="modal-foot-right">
        <button class="btn-ghost" onclick="closeModal()">Cancel</button>
        <button class="btn-add" onclick="saveEditSlot('${slotId}','${date}')">Update Slot</button>
      </div>
    </div>
  `);

  $('edit-slot-pills').querySelectorAll('.time-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      $('edit-slot-pills').querySelectorAll('.time-pill').forEach(p => p.classList.remove('selected'));
      pill.classList.add('selected');
    });
  });
}
```

- [ ] **Step 5: Add saveEditSlot()**

Insert immediately after `openEditSlotModal()`:

```js
async function saveEditSlot(slotId, date) {
  const selected = $('edit-slot-pills')?.querySelector('.time-pill.selected');
  if (!selected) { toast('Select a time.'); return; }
  const newTime = selected.dataset.time;

  const { data: conflict } = await sb.from('available_slots')
    .select('id').eq('date', date).eq('start_time', newTime).neq('id', slotId)
    .maybeSingle();
  if (conflict) { toast('A slot already exists at that time on this date.'); return; }

  const { error } = await sb.from('available_slots').update({ start_time: newTime }).eq('id', slotId);
  if (error) { toast('Error updating slot.'); return; }

  closeModal();
  toast('Slot updated.');
  loadSlots();
  loadStats();
}
```

- [ ] **Step 6: Verify slot editing**

Navigate to Availability. Unbooked slot chips should show a small `✎` icon before the `✕`. Click `✎` — modal opens showing the slot date (locked) and a time pill grid with the current time pre-selected. Pick a different time. Click **Update Slot** — modal closes, slot chip updates to the new time, `toast('Slot updated.')` appears.

Verify conflict protection: if another slot at the new time already exists on that date, `toast('A slot already exists at that time on this date.')` appears and no update is made.

Verify booked chips: slots marked as "Booked" show no `✎` button.

- [ ] **Step 7: Commit**

```bash
git add admin.html
git commit -m "feat(admin): edit time of unbooked availability slots"
```

---

## Self-Review Checklist (for plan author — already verified)

- [x] Search: Task 2 ✓
- [x] Edit booking (all fields incl. service + slot): Tasks 3 ✓
- [x] Delete booking (with slot release): Task 4 ✓
- [x] `allServices` global populated from `loadServices()`: Task 2 Step 2 ✓
- [x] Slot dropdown includes current slot even if booked: Task 3 Step 3 (`slotList.unshift(currSlot)`) ✓
- [x] Null slot_id handled: Task 3 Step 3 (`noSlotOpt`) ✓
- [x] Modal backdrop click + Escape close: Task 1 Step 3 ✓
- [x] Availability: pencil icon on unbooked only: Task 5 Steps 2–3 ✓
- [x] Availability: conflict check before update: Task 5 Step 5 ✓
- [x] No schema changes: confirmed — all ops use existing tables ✓
- [x] `loadRecentActivity()` called after booking edits/deletes: Tasks 3–4 ✓
- [x] XSS: user data in innerHTML uses `esc()` helper for attribute values ✓
