/* ── Applications ── */
async function loadApplications() {
  const el = $('applications-table');
  if (el) el.innerHTML = skelTable(5, 8);
  const { data } = await sb.from('applications').select('*').order('created_at', { ascending: false });
  allApplications = data || [];
  renderApplications();
  refreshAppBadge();
}

function refreshAppBadge() {
  const count = allApplications.filter(a => a.status === 'new' || a.status === 'reviewing').length;
  const badge = $('new-application-badge');
  if (!badge) return;
  if (count > 0) { badge.textContent = count; badge.classList.add('show'); }
  else badge.classList.remove('show');
}

function exportApplicationsCSV() {
  const cols = ['Date','Company','Contact','Email','Job Title','Industry','Services','Investment','Status'];
  const rows = allApplications.map(r => [
    r.created_at?.split('T')[0] || '',
    r.company_name || '',
    r.full_name || '',
    r.email || '',
    r.job_title || '',
    r.industry || '',
    r.services_of_interest || '',
    r.investment_range || '',
    r.status || ''
  ].map(v => `"${String(v).replace(/"/g,'""')}"`).join(','));
  const csv = [cols.join(','), ...rows].join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = `applications-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
}

function renderApplications() {
  const c = $('applications-table');
  if (!c) return;
  let rows = allApplications;
  if (applicationFilter !== 'all') rows = rows.filter(r => r.status === applicationFilter);
  if (applicationSearch) {
    const q = applicationSearch.toLowerCase();
    rows = rows.filter(r =>
      r.full_name?.toLowerCase().includes(q) ||
      r.email?.toLowerCase().includes(q) ||
      r.company_name?.toLowerCase().includes(q)
    );
  }
  if (!rows.length) {
    c.innerHTML = emptyState('No applications found', 'Partnership applications from the website will appear here.');
    return;
  }
  c.innerHTML = `<table class="a-table">
    <thead><tr>
      <th>Date</th><th>Company</th><th>Contact</th><th>Email</th><th>Industry</th><th>Services</th><th>Investment</th><th>Status</th><th></th>
    </tr></thead>
    <tbody>${rows.map(r => {
      const canConvert = r.status === 'new' || r.status === 'reviewing';
      const badgeClass = r.status === 'new' ? 'badge-new'
        : r.status === 'reviewing' ? 'badge-amber'
        : r.status === 'accepted'  ? 'badge-confirmed'
        : 'badge-declined';
      return `<tr>
        <td class="td-dim">${fmtDate(r.created_at?.split('T')[0])}</td>
        <td class="td-name" title="${(r.business_challenges||'').replace(/"/g,'&quot;')}">${r.company_name || '—'}</td>
        <td><span style="display:block;font-size:.8rem">${r.full_name || '—'}</span><span style="display:block;font-size:.72rem;color:rgba(245,244,241,.45)">${r.job_title || ''}</span></td>
        <td class="td-dim">${r.email || '—'}</td>
        <td class="td-dim">${r.industry || '—'}</td>
        <td class="contact-brief-cell" title="${(r.services_of_interest||'').replace(/"/g,'&quot;')}">${r.services_of_interest || '—'}</td>
        <td class="td-dim">${r.investment_range || '—'}</td>
        <td>
          ${r.status === 'accepted'
            ? `<span class="badge badge-confirmed">Accepted</span>`
            : `<span class="badge ${badgeClass}" style="cursor:pointer"><select class="status-select" data-id="${r.id}">
              <option value="new"${r.status==='new'?' selected':''}>New</option>
              <option value="reviewing"${r.status==='reviewing'?' selected':''}>Reviewing</option>
              <option value="declined"${r.status==='declined'?' selected':''}>Declined</option>
            </select></span>`}
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
      refreshAppBadge();
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
  refreshAppBadge();
  openClientProfile(newClient.id);
}

