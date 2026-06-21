async function loadProposalEcosystem() {
  await loadProposals();
  await Promise.all([loadScopes(), loadWelcomeLetters()]);
}

/* ── Load all data ── */
async function loadAll() {
  startLoad();
  await Promise.all([loadStats(), loadBookings(), loadSlots(), loadServices(), loadClients(), loadProjects(), loadRecentActivity(), loadRetainerOverview(), loadQuotes(), loadInvoices(), loadRetainers(), loadProposalEcosystem(), loadSigningRequests(), loadMandates(), loadApplications()]);
  await runLifecycleEngine();
  endLoad();
}

/* ── Stats ── */
async function loadStats() {
  ['stat-total','stat-pending','stat-confirmed','stat-slots'].forEach(id => {
    const el = $(id);
    if (el) el.innerHTML = `<span class="skel skel-line" style="width:44px;height:26px;display:inline-block"></span>`;
  });
  const [bRes, sRes, leadsRes, clientsRes] = await Promise.all([
    sb.from('bookings').select('status'),
    sb.from('available_slots').select('is_booked').eq('is_booked', false).gte('date', todayStr()),
    sb.from('applications').select('*', { count: 'exact', head: true }).in('status', ['new', 'reviewing']),
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

async function loadRetainerOverview() {
  const ids = ['stat-mrr','stat-active-retainers','stat-overdue-retainers','stat-upcoming-collections','stat-outstanding-invoices'];
  ids.forEach(id => { if ($(id)) $(id).textContent = id === 'stat-mrr' ? 'R 0' : '0'; });
  const [retRes, invRes] = await Promise.all([
    sb.from('retainers').select('monthly_retainer,payment_status,next_payment_date'),
    sb.from('invoices').select('total_amount,payment_status')
  ]);
  financeSchemaReady = !(retRes.error || invRes.error);
  if (!financeSchemaReady) return;
  const retainers = retRes.data || [];
  const invoices = invRes.data || [];
  const today = todayStr();
  const upcomingLimit = addDays(today, 14);
  const active = retainers.filter(r => (r.payment_status || 'Pending') !== 'Failed');
  const mrr = active.reduce((sum, r) => sum + (Number(r.monthly_retainer) || 0), 0);
  const overdue = retainers.filter(r => (r.payment_status || '') === 'Overdue').length;
  const upcoming = retainers.filter(r => r.next_payment_date && r.next_payment_date >= today && r.next_payment_date <= upcomingLimit).length;
  const outstanding = invoices.filter(i => ['Draft','Sent','Overdue'].includes(i.payment_status || 'Draft')).reduce((sum, i) => sum + (Number(i.total_amount) || 0), 0);
  $('stat-mrr').textContent = money(mrr);
  $('stat-active-retainers').textContent = active.length;
  $('stat-overdue-retainers').textContent = overdue;
  $('stat-upcoming-collections').textContent = upcoming;
  $('stat-outstanding-invoices').textContent = money(outstanding);
}
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
  if (!retainerSchemaReady) return;
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
  if (error) { if (isSchemaError(error)) proposalSchemaReady = false; return; }
  allScopes = data || [];
}
async function loadWelcomeLetters() {
  if (!proposalSchemaReady) return;
  const { data, error } = await sb.from('welcome_letters').select('*').order('created_at', { ascending: false });
  if (error) { if (isSchemaError(error)) proposalSchemaReady = false; return; }
  allWelcomeLetters = data || [];
}

async function loadSigningRequests() {
  const { data, error } = await sb.from('signing_requests').select('*');
  if (error) console.warn('[loadSigningRequests]', error.message);
  allSigningRequests = data || [];
}

async function loadMandates() {
  const { data, error } = await sb.from('mandates').select('*').order('created_at', { ascending: false });
  if (error) { if (isSchemaError(error)) mandateSchemaReady = false; console.warn('[loadMandates]', error.message); }
  allMandates = data || [];
}

async function loadRecentActivity() {
  const c = $('activity-feed');
  if (c) c.innerHTML = skelActivityRows(5);
  const [leadsRes, clientsRes, bookingsRes] = await Promise.all([
    sb.from('applications').select('id,full_name,company_name,services_of_interest,created_at').in('status', ['new', 'reviewing']).order('created_at', { ascending: false }).limit(8),
    sb.from('clients').select('id,full_name,created_at').order('created_at', { ascending: false }).limit(8),
    sb.from('bookings').select('id,full_name,status,created_at,slot:slot_id(date,start_time)').order('created_at', { ascending: false }).limit(8)
  ]);
  const leads    = (leadsRes.data    || []).map(r => ({ ...r, _type: 'lead'    }));
  const clients  = (clientsRes.data  || []).map(r => ({ ...r, _type: 'client'  }));
  const bookings = (bookingsRes.data || []).map(r => ({ ...r, _type: 'booking' }));
  const all = [...leads, ...clients, ...bookings]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 8);
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
      secondary = r.company_name || r.services_of_interest || '—';
    } else if (r._type === 'client') {
      icon      = `<div class="activity-icon ai-client">C</div>`;
      primary   = `Converted to client — <strong>${r.full_name}</strong>`;
      secondary = 'via Applications';
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

