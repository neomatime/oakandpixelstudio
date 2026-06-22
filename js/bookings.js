/* ── Bookings ── */
async function loadBookings() {
  $('bookings-table').innerHTML = skelTable(6, 7);
  const baseSelect = 'id,full_name,company,email,phone,status,created_at,service_id,slot_id,service:service_id(name),slot:slot_id(date,start_time)';
  let { data, error } = await sb.from('bookings')
    .select(`${baseSelect},converted_at,converted_to_client_id`)
    .order('created_at', { ascending: false });
  if (error && isSchemaError(error)) {
    const fallback = await sb.from('bookings')
      .select(baseSelect)
      .order('created_at', { ascending: false });
    data = fallback.data;
    error = fallback.error;
  }
  if (error) {
    $('bookings-table').innerHTML = emptyState('Bookings unavailable', 'Check the bookings table permissions and schema.');
    return;
  }
  allBookings = data || [];
  renderBookings();
  renderCharts();
}

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
      const convertAction = (b.converted_at || b.converted_to_client_id)
        ? ''
        : `<button class="act-btn convert-booking" data-id="${b.id}">Convert</button>`;
      const actions = `<div class="act-group">
        ${pendingActions}
        ${convertAction}
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

function slotTimeValue(time) {
  return String(time || '').slice(0, 5);
}

function sortBookingSlots(slots = [], currentSlotId = '') {
  return [...slots]
    .filter(slot => slot?.date && slot?.start_time)
    .sort((a, b) => {
      const aKey = `${a.date} ${slotTimeValue(a.start_time)}`;
      const bKey = `${b.date} ${slotTimeValue(b.start_time)}`;
      if (aKey === bKey && currentSlotId) {
        if (a.id === currentSlotId) return -1;
        if (b.id === currentSlotId) return 1;
      }
      return aKey.localeCompare(bKey);
    });
}

function setEditBookingTime(btn) {
  const grid = $('eb-time-grid');
  if (!grid || !btn) return;
  grid.querySelectorAll('.booking-time-btn').forEach(item => item.classList.remove('selected'));
  btn.classList.add('selected');
  if ($('eb-slot')) $('eb-slot').value = btn.dataset.slotId || '';
  if ($('eb-time')) $('eb-time').value = btn.dataset.time || '';
}

function renderEditBookingTimes(preferredTime = '', autoSelectFirst = false) {
  const dateEl = $('eb-date');
  const grid = $('eb-time-grid');
  const slotEl = $('eb-slot');
  const timeEl = $('eb-time');
  const noteEl = $('eb-slot-note');
  if (!dateEl || !grid || !slotEl || !timeEl) return;

  const selectedDate = dateEl.value || '';
  const daySlots = editBookingSlots.filter(slot => slot.date === selectedDate);
  const uniqueSlots = [];
  const seenTimes = new Set();
  daySlots.forEach(slot => {
    const time = slotTimeValue(slot.start_time);
    if (!time || seenTimes.has(time)) return;
    seenTimes.add(time);
    uniqueSlots.push(slot);
  });

  let desiredTime = slotTimeValue(preferredTime || timeEl.value);
  if (desiredTime && !uniqueSlots.some(slot => slotTimeValue(slot.start_time) === desiredTime)) desiredTime = '';
  if (!desiredTime && autoSelectFirst && uniqueSlots.length) desiredTime = slotTimeValue(uniqueSlots[0].start_time);

  const noSlotButton = `<button class="booking-time-btn${!desiredTime ? ' selected' : ''}" type="button" data-slot-id="" data-time=""><span>No time</span><small>Unassigned</small></button>`;

  if (!selectedDate) {
    grid.innerHTML = `<div class="booking-time-empty">Choose a date to see available consultation times.</div>`;
    slotEl.value = '';
    timeEl.value = '';
    if (noteEl) noteEl.textContent = 'Dates with available slots will appear in the picker.';
    return;
  }

  if (!uniqueSlots.length) {
    grid.innerHTML = `${noSlotButton}<div class="booking-time-empty">No open time slots are available for ${esc(fmtDate(selectedDate))}.</div>`;
  } else {
    grid.innerHTML = noSlotButton + uniqueSlots.map(slot => {
      const time = slotTimeValue(slot.start_time);
      const selected = desiredTime === time;
      return `<button class="booking-time-btn${selected ? ' selected' : ''}" type="button" data-slot-id="${esc(slot.id)}" data-time="${esc(time)}">
        <span>${esc(fmtTime(slot.start_time))}</span>
        ${slot._isCurrent ? '<small>Current</small>' : '<small>Open slot</small>'}
      </button>`;
    }).join('');
  }

  grid.querySelectorAll('.booking-time-btn').forEach(btn => {
    btn.addEventListener('click', () => setEditBookingTime(btn));
  });
  setEditBookingTime(grid.querySelector('.booking-time-btn.selected') || grid.querySelector('.booking-time-btn'));
  if (noteEl) noteEl.textContent = uniqueSlots.length ? 'Select one available time for this booking.' : 'Add availability first if you need a booked time on this date.';
}

function initEditBookingSlotPicker(selectedDate = '', selectedTime = '') {
  const dates = [...new Set(editBookingSlots.map(slot => slot.date))];
  const d = new Date();
  const localToday = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const smartDefault = (selectedDate && selectedDate >= localToday)
    ? selectedDate
    : (dates.find(dt => dt >= localToday) || selectedDate || null);
  const options = {
    disableMobile: true,
    dateFormat: 'Y-m-d',
    defaultDate: smartDefault,
    onChange: (_dates, dateStr) => renderEditBookingTimes('', Boolean(dateStr)),
  };
  if (dates.length) options.enable = dates;
  flatpickr('#eb-date', options);
  renderEditBookingTimes(selectedTime);
}

async function openEditBookingModal(id) {
  const booking = allBookings.find(b => b.id === id);
  if (!booking) return;

  const [slotsResult, currSlotResult] = await Promise.all([
    sb.from('available_slots').select('id,date,start_time').eq('is_booked', false).order('date').order('start_time'),
    booking.slot_id
      ? sb.from('available_slots').select('id,date,start_time').eq('id', booking.slot_id).single()
      : Promise.resolve({ data: null })
  ]);

  if (slotsResult.error) { toast('Could not load available slots.'); return; }
  const openSlots = slotsResult.data;
  const currSlot  = currSlotResult.error ? null : currSlotResult.data;

  const slotList = [...(openSlots || [])];
  if (currSlot && !slotList.find(s => s.id === currSlot.id)) slotList.unshift(currSlot);
  editBookingSlots = sortBookingSlots(slotList, booking.slot_id).map(slot => ({ ...slot, _isCurrent: slot.id === booking.slot_id }));
  const selectedDate = currSlot?.date || '';
  const selectedTime = slotTimeValue(currSlot?.start_time);

  const serviceOptions = allServices.map(s =>
    `<option value="${s.id}"${s.id === booking.service_id ? ' selected' : ''}>${esc(s.name)}</option>`
  ).join('');
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
      <div class="booking-slot-panel">
        <div class="modal-field">
          <label>Date</label>
          <input id="eb-date" type="text" value="${esc(selectedDate)}" placeholder="Select date..." autocomplete="off">
        </div>
        <div class="booking-time-field">
          <label>Time</label>
          <div class="booking-time-grid" id="eb-time-grid"></div>
          <div class="booking-slot-note" id="eb-slot-note"></div>
          <input id="eb-slot" type="hidden" value="${esc(booking.slot_id || '')}">
          <input id="eb-time" type="hidden" value="${esc(selectedTime)}">
        </div>
      </div>
    </div>
    <div class="modal-foot">
      <button class="btn-danger" onclick="deleteBooking('${booking.id}','${booking.slot_id||''}')">Delete booking</button>
      <div class="modal-foot-right">
        ${booking.converted_at || booking.converted_to_client_id ? '' : `<button class="btn-ghost" onclick="convertBookingToClient('${booking.id}')">Convert to Client</button>`}
        <button class="btn-ghost" onclick="closeModal()">Cancel</button>
        <button class="btn-add" onclick="saveEditBooking('${booking.id}','${booking.slot_id||''}')">Save Changes</button>
      </div>
    </div>
  `);
  $('modal-box').classList.add('wide');
  initEditBookingSlotPicker(selectedDate, selectedTime);
}

async function saveEditBooking(bookingId, oldSlotId) {
  const saveBtn = document.querySelector('#modal-box .btn-add');
  btnLoad(saveBtn, true, 'Saving…');
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

  const { error } = await sb.from('bookings').update(update).eq('id', bookingId);
  if (error) { btnLoad(saveBtn, false); toast('Error saving changes.'); return; }

  if (newSlotId !== prevSlotId) {
    if (prevSlotId) await sb.from('available_slots').update({ is_booked: false }).eq('id', prevSlotId);
    if (newSlotId)  await sb.from('available_slots').update({ is_booked: true  }).eq('id', newSlotId);
  }

  closeModal();
  toast('Booking updated.');
  await Promise.all([loadStats(), loadBookings(), loadRecentActivity()]);
}

async function deleteBooking(id, slotId) {
  const confirmed = await opsDeleteConfirm({
    title: 'Delete Booking?',
    message: 'This booking will be permanently removed from OPS Command Center.',
    meta: 'The linked availability slot will be released.',
    confirmText: 'Delete Booking'
  });
  if (!confirmed) return;
  closeModal();
  if (slotId) await sb.from('available_slots').update({ is_booked: false }).eq('id', slotId);
  const { error } = await sb.from('bookings').delete().eq('id', id);
  if (error) { toast('Error deleting booking.'); return; }
  toast('Booking deleted.');
  await Promise.all([loadStats(), loadBookings(), loadRecentActivity()]);
}

function bookingServiceName(booking = {}) {
  return booking.service?.name || allServices.find(s => s.id === booking.service_id)?.name || null;
}

async function markBookingConverted(bookingId, clientId) {
  const payload = {
    status: 'confirmed',
    converted_to_client_id: clientId,
    converted_at: new Date().toISOString()
  };
  let { error } = await sb.from('bookings').update(payload).eq('id', bookingId);
  if (error && isSchemaError(error)) {
    ({ error } = await sb.from('bookings').update({ status: 'confirmed' }).eq('id', bookingId));
  }
  return error;
}

async function convertBookingToClient(bookingId) {
  const booking = allBookings.find(b => b.id === bookingId);
  if (!booking) return;
  const serviceName = bookingServiceName(booking);
  const existing = allClients.find(c => (c.email || '').toLowerCase() === (booking.email || '').toLowerCase());
  if (existing) {
    const linked = await opsConfirm({
      title: 'Client Already Exists',
      message: 'A client with this booking email already exists. Link this booking to that client instead of creating a duplicate?',
      meta: `${clientDisplayName(existing)} · ${existing.email || booking.email}`,
      confirmText: 'Link Booking',
      cancelText: 'Cancel'
    });
    if (!linked) return;
    const updateError = await markBookingConverted(bookingId, existing.id);
    if (updateError) { toast('Client exists, but booking could not be updated.'); return; }
    closeModal();
    toast('Booking linked to existing client.');
    await Promise.all([loadClients(), loadBookings(), loadStats(), loadRecentActivity()]);
    openClientProfile(existing.id);
    return;
  }

  const confirmed = await opsConfirm({
    title: 'Convert Booking to Client',
    message: 'OPS will create a client record using the booking details and assign the booked service as the selected service/plan.',
    meta: `${booking.full_name || 'Booking'} · ${booking.email || 'No email'}${serviceName ? ` · ${serviceName}` : ''}`,
    confirmText: 'Create Client',
    cancelText: 'Cancel'
  });
  if (!confirmed) return;

  const notes = [
    `Converted from booking on ${compactDate(todayStr())}.`,
    serviceName ? `Requested service: ${serviceName}.` : '',
    booking.slot?.date ? `Consultation slot: ${compactDate(booking.slot.date)} at ${fmtTime(booking.slot.start_time)}.` : ''
  ].filter(Boolean).join('\n');
  const payload = {
    full_name: booking.full_name || 'Booking Client',
    email: booking.email || null,
    company: booking.company || null,
    company_email: booking.email || null,
    phone: booking.phone || null,
    company_phone: booking.phone || null,
    selected_plan: serviceName,
    project_type: serviceName,
    project_start_date: booking.slot?.date || null,
    notes,
    brief: notes,
    client_status: 'Active',
    source_booking_id: booking.id
  };

  let insert = await sb.from('clients').insert(payload).select().single();
  if (insert.error && isSchemaError(insert.error)) {
    const fallback = { ...payload };
    delete fallback.source_booking_id;
    delete fallback.company_email;
    delete fallback.company_phone;
    delete fallback.client_status;
    insert = await sb.from('clients').insert(fallback).select().single();
  }
  if (insert.error) { toast('Error converting booking to client.'); return; }

  const updateError = await markBookingConverted(bookingId, insert.data.id);
  if (updateError) toast('Client created, but booking could not be marked as converted.');
  else toast('Booking converted to client.');
  closeModal();
  await Promise.all([loadClients(), loadBookings(), loadStats(), loadRecentActivity()]);
  openClientProfile(insert.data.id);
}

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
  container.querySelectorAll('.convert-booking').forEach(btn => {
    btn.addEventListener('click', () => convertBookingToClient(btn.dataset.id));
  });
  container.querySelectorAll('.delete-booking').forEach(btn => {
    btn.addEventListener('click', () => deleteBooking(btn.dataset.id, btn.dataset.slot));
  });
}

/* Filter tabs */
document.querySelectorAll('.f-tab[data-filter]').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.f-tab[data-filter]').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentFilter = tab.dataset.filter;
    renderBookings();
  });
});

$('booking-search')?.addEventListener('input', e => {
  bookingSearch = e.target.value.trim();
  renderBookings();
});

/* ── Charts ── */
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

/* ── Availability ── */
async function loadSlots() {
  const c = $('slots-list');
  const { data } = await sb.from('available_slots')
    .select('id,date,start_time,is_booked')
    .order('date').order('start_time');
  let slots = data || [];
  if (availabilityFilter === 'upcoming') slots = slots.filter(s => s.date >= todayStr());
  if (availabilityFilter === 'open') slots = slots.filter(s => !s.is_booked);
  if (availabilityFilter === 'booked') slots = slots.filter(s => s.is_booked);
  if (!slots.length) { c.innerHTML = emptyState('No slots found', 'Add slots using the form or change the filter.'); return; }
  const byDate = {};
  slots.forEach(s => { (byDate[s.date] = byDate[s.date] || []).push(s); });
  c.innerHTML = Object.entries(byDate).map(([date, slots]) => `
    <div class="slots-day">
      <div class="slots-day-lbl">${fmtDateLong(date)}</div>
      <div class="slots-chips">
        ${slots.map(s => `
          <div class="slot-chip${s.is_booked ? ' booked' : ''}">
            <span class="slot-chip-t">${fmtTime(s.start_time)}</span>
            ${s.is_booked
              ? '<span class="booked-lbl">Booked</span>'
              : `<button class="btn-edit-slot" data-id="${s.id}" data-date="${s.date}" data-time="${s.start_time.slice(0, 5)}" title="Edit time">✎</button><button class="btn-rm" data-id="${s.id}" title="Remove">✕</button>`}
          </div>`).join('')}
      </div>
    </div>`).join('');
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
}

document.querySelectorAll('.f-tab[data-afilter]').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.f-tab[data-afilter]').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    availabilityFilter = tab.dataset.afilter;
    loadSlots();
  });
});

/* ── Time pill picker ── */
function buildTimePills() {
  const container = $('time-pills');
  const slots = [];
  for (let h = 7; h <= 19; h++) {
    slots.push(`${String(h).padStart(2,'0')}:00`);
    if (h < 19) slots.push(`${String(h).padStart(2,'0')}:30`);
  }
  container.innerHTML = slots.map(t =>
    `<button class="time-pill" data-time="${t}">${fmtTime(t)}</button>`
  ).join('');
  container.querySelectorAll('.time-pill').forEach(pill => {
    pill.addEventListener('click', () => pill.classList.toggle('selected'));
  });
}

function getSelectedTimes() {
  return [...$('time-pills').querySelectorAll('.time-pill.selected')].map(p => p.dataset.time);
}

function selectPills(times) {
  $('time-pills').querySelectorAll('.time-pill').forEach(p => {
    p.classList.toggle('selected', times.includes(p.dataset.time));
  });
}

$('add-slots-btn').addEventListener('click', async () => {
  const date  = $('slot-date').value;
  const times = getSelectedTimes();
  if (!date)         { toast('Select a date first.'); return; }
  if (!times.length) { toast('Select at least one time slot.'); return; }
  const { error } = await sb.from('available_slots').insert(times.map(t => ({ date, start_time: t, is_booked: false })));
  if (error) { toast('Error adding slots.'); return; }
  datePicker.clear();
  $('time-pills').querySelectorAll('.time-pill').forEach(p => p.classList.remove('selected'));
  toast(`${times.length} slot${times.length > 1 ? 's' : ''} added.`);
  loadSlots(); loadStats();
});

$('qa-morning').addEventListener('click',   () => selectPills(['07:00','07:30','08:00','08:30','09:00','09:30','10:00','10:30','11:00','11:30','12:00']));
$('qa-afternoon').addEventListener('click', () => selectPills(['12:00','12:30','13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00']));
$('qa-full').addEventListener('click',      () => selectPills(['08:00','08:30','09:00','09:30','10:00','10:30','11:00','11:30','12:00','12:30','13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00']));
$('qa-clear').addEventListener('click',     () => $('time-pills').querySelectorAll('.time-pill').forEach(p => p.classList.remove('selected')));

