# Bookings & Availability Enhancements — Design Spec

**Date:** 2026-06-19
**Status:** Approved
**Sub-project:** A+B of the admin dashboard enhancement series

---

## Goal

Add search, edit, and delete to the Bookings page, and add time-editing to individual availability slots on the Availability page. No page rebuilds — these are additive enhancements to existing sections.

---

## What Exists Today

**Bookings page (`#page-bookings`):**
- Filter tabs (All / Pending / Confirmed / Declined)
- Table with columns: Name, Service, Date & Time, Company, Contact, Status, Actions
- Actions: Confirm and Decline buttons (pending only)
- No search, no edit, no delete

**Availability page (`#page-availability`):**
- Left column: Add Time Slots form (date picker + time pill grid + quick-select buttons)
- Right column: Upcoming Slots list (grouped by date, each slot shown as a chip with remove `✕` button)
- Only future slots shown (gte today)
- No edit of existing slots

---

## What Changes

### 1. Bookings — Search

Add a text search input above the filter tabs. Filters client-side against `allBookings` by `full_name` or `email` (case-insensitive, same pattern as the contacts page). Toolbar layout:

```
[ search input ············ ]  [ All ] [ Pending ] [ Confirmed ] [ Declined ]
```

A new module-level `let bookingSearch = ''` variable is introduced, set on `input` event of the search field. `renderBookings()` applies both the status filter and the search filter.

### 2. Bookings — Edit (modal)

Each booking row gains an **Edit** button in the Actions column. Pending rows keep Confirm / Decline alongside Edit; non-pending rows show only Edit + Delete.

Clicking Edit opens a modal overlay (`#modal-overlay`) with the booking's current values pre-populated.

**Modal fields:**

| Field | Type | Notes |
|---|---|---|
| Full Name | text input | |
| Company | text input | |
| Email | text input | |
| Phone | text input | |
| Service | `<select>` | Options from `allServices[]` global (populated by `loadServices()` at startup) |
| Status | `<select>` | pending / confirmed / declined |
| Date & Time Slot | `<select>` | Options: current slot (always included) + available (unbooked) future slots, formatted as "DD Mon YYYY — HH:MM AM/PM" |

**Slot dropdown population:** When opening the modal, fetch `available_slots` where `is_booked = false` or `id = booking.slot_id`, ordered by date then start_time. The current slot is always shown even if already booked. If `booking.slot_id` is null, show "— No slot assigned —" as the first option and only list available slots.

**On Save:**
1. If `slot_id` changed: `UPDATE available_slots SET is_booked = false WHERE id = oldSlotId` then `UPDATE available_slots SET is_booked = true WHERE id = newSlotId`
2. `UPDATE bookings SET full_name, company, email, phone, service_id, status, slot_id WHERE id = booking.id`
3. Close modal, `toast('Booking updated.')`, reload `loadStats()`, `loadBookings()`, `loadRecentActivity()`

**On error:** `toast('Error saving changes.')`, keep modal open.

**Cancel / backdrop click:** close modal without saving.

### 3. Bookings — Delete

A **Delete** button appears on every row (next to Edit). Clicking it shows a `confirm()` dialog: *"Delete this booking? This cannot be undone."*

On confirm:
1. If booking has a `slot_id`: `UPDATE available_slots SET is_booked = false WHERE id = slot_id` (best-effort — proceed even if this fails)
2. `DELETE FROM bookings WHERE id = booking.id`
3. `toast('Booking deleted.')`, reload `loadStats()`, `loadBookings()`, `loadRecentActivity()`

### 4. Availability — Edit Slot Time

Unbooked slot chips gain a pencil icon `✎` between the time label and the existing remove `✕`. Booked chips remain unchanged (no edit icon).

Clicking `✎` opens the shared modal overlay with:
- Date shown as read-only label (locked — date cannot be changed)
- Time pill grid (same pills as the Add form: 07:00–19:00 in 30-min increments)
- Current time pre-selected
- Pills that conflict with other slots on the same date are disabled/greyed

**On Save:**
1. Conflict check: query `available_slots WHERE date = slot.date AND start_time = newTime AND id != slot.id` — if any result, `toast('That time already exists on this date.')` and abort
2. `UPDATE available_slots SET start_time = newTime WHERE id = slot.id`
3. Close modal, `toast('Slot updated.')`, reload `loadSlots()`, `loadStats()`

---

## Modal System

A single shared modal container is added to the HTML just before `</body>`:

```html
<div id="modal-overlay" class="modal-overlay" style="display:none" aria-modal="true" role="dialog">
  <div id="modal-box" class="modal-box"></div>
</div>
```

Two JS helpers:

```js
function showModal(innerHtml) {
  $('modal-box').innerHTML = innerHtml;
  $('modal-overlay').style.display = 'flex';
}
function closeModal() {
  $('modal-overlay').style.display = 'none';
  $('modal-box').innerHTML = '';
}
```

Backdrop click (click on `#modal-overlay` but not `#modal-box`) closes the modal.

Escape key closes the modal.

---

## CSS additions

**Modal overlay and box** (shared, added once):
```css
.modal-overlay{position:fixed;inset:0;background:rgba(10,10,9,.82);display:flex;align-items:center;justify-content:center;z-index:200;}
.modal-box{background:var(--card);border:1px solid var(--border-hi);width:min(480px,94vw);}
.modal-hdr{padding:1rem 1.5rem;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;}
.modal-title{font-family:var(--font-d);font-size:1.15rem;font-weight:400;}
.modal-close{background:none;border:none;color:rgba(245,244,241,.3);font-size:1.1rem;cursor:pointer;padding:0;}
.modal-close:hover{color:var(--off-white);}
.modal-body{padding:1.25rem 1.5rem;display:grid;grid-template-columns:1fr 1fr;gap:.85rem;}
.modal-field{display:flex;flex-direction:column;gap:.3rem;}
.modal-field.full{grid-column:1/-1;}
.modal-field label{font-family:var(--font-m);font-size:.54rem;letter-spacing:.11em;text-transform:uppercase;color:rgba(245,244,241,.32);}
.modal-field input,.modal-field select{background:rgba(245,244,241,.04);border:1px solid var(--border-hi);color:var(--off-white);font-family:var(--font-b);font-size:.82rem;padding:.55rem .75rem;outline:none;transition:border-color .2s;}
.modal-field input:focus,.modal-field select:focus{border-color:var(--emerald);}
.modal-field select option{background:var(--card);}
.modal-divider{grid-column:1/-1;border:none;border-top:1px solid var(--border);margin:.1rem 0;}
.modal-foot{padding:.85rem 1.5rem;border-top:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;}
.modal-foot-right{display:flex;gap:.5rem;}
```

**Booking toolbar** (search + tabs together):
```css
.booking-toolbar{display:flex;align-items:center;gap:.75rem;padding:.75rem 1rem;border-bottom:1px solid var(--border);flex-wrap:wrap;}
.booking-toolbar .filter-row{margin:0;gap:.3rem;}
```

**Slot chip edit button:**
```css
.slot-chip .btn-edit-slot{background:none;border:none;color:rgba(245,244,241,.28);font-size:.7rem;cursor:pointer;padding:0 .2rem 0 .35rem;border-left:1px solid var(--border);margin-left:.25rem;transition:color .15s;}
.slot-chip .btn-edit-slot:hover{color:var(--off-white);}
```

**Buttons (reuse existing `.btn-add`/`.act-btn` where possible; add where missing):**
```css
.btn-danger{background:none;border:1px solid rgba(224,112,112,.25);color:var(--err);font-family:var(--font-m);font-size:.58rem;letter-spacing:.08em;padding:.4rem .85rem;cursor:pointer;transition:opacity .2s;}
.btn-danger:hover{opacity:.75;}
```

---

## File Changes

All changes are in **`admin.html`** only. No schema changes required.

### HTML
1. Add booking toolbar (`<div class="booking-toolbar">`) wrapping the search input and existing filter tabs inside `#page-bookings`
2. Add modal container (`#modal-overlay` + `#modal-box`) before `</body>`

### CSS
3. Add modal CSS block
4. Add `.booking-toolbar` rule
5. Add `.slot-chip .btn-edit-slot` rule
6. Add `.btn-danger` rule

### JS
7. Add `let bookingSearch = ''` and `let allServices = []` to globals block
8. Modify `renderBookings()`: apply `bookingSearch` filter; update `bookingTable()` to always show Edit + Delete, and Confirm/Decline only for pending
9. Add `$('booking-search')` `input` event listener
10. Add `openEditBookingModal(id)` — async: fetches slots, builds modal HTML, calls `showModal()`
11. Add `saveEditBooking(bookingId, oldSlotId)` — reads form, validates, saves
12. Add `deleteBooking(id, slotId)` — confirm → delete → free slot → reload
13. Add `openEditSlotModal(slotId, date, currentTime)` — builds modal with time pills, calls `showModal()`
14. Add `saveEditSlot(slotId, date, newTime)` — conflict check → update → reload
15. Add `showModal(html)` and `closeModal()` helpers
16. Add `#modal-overlay` backdrop click and `Escape` key listeners
17. Modify slot chip rendering in `loadSlots()` to include `btn-edit-slot` button on unbooked chips

---

## Data Model

No schema changes. All required data is already available:
- `bookings`: id, full_name, company, email, phone, status, service_id, slot_id
- `available_slots`: id, date, start_time, is_booked
- `services`: id, name (already loaded by `loadServices()`, accessible via a module-level `allServices` array to be added)

**New globals:** `let bookingSearch = ''` and `let allServices = []`. `allServices` is populated inside `loadServices()` (which already runs on startup) — add `allServices = data || []` at the start of `loadServices()` before rendering.

---

## Out of Scope

- Bulk delete or bulk status update
- Booking history / audit log
- Notifying clients of booking changes
- Editing past availability slots
- Adding new bookings from the admin (bookings are created via the public booking form)
- Any changes to Contacts, Clients, Overview, or Services pages
