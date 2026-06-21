async function loadServices() {
  const c = $('services-grid');
  if (c) c.innerHTML = skelServiceCards(6);
  let { data, error } = await sb.from('services').select('id,name,description,price,category,setup_fee,monthly_retainer,status,notes,active,sort_order').order('sort_order');
  serviceFinanceReady = !error;
  if (error) {
    const fallback = await sb.from('services').select('id,name,description,price,active,sort_order').order('sort_order');
    data = fallback.data;
    error = fallback.error;
  }
  if (error) { c.innerHTML = emptyState('Services unavailable', 'Check the services table permissions and schema.'); return; }
  allServices = data || [];
  renderClientPlanFilter();
  if (!data?.length) { c.innerHTML = emptyState('No services found'); return; }
  c.innerHTML = data.map(s => {
    const basePrice = Number(s.price) || 0;
    const setupFee = Number(s.setup_fee) || 0;
    const retainer = Number(s.monthly_retainer) || 0;
    const priceLabel = basePrice > 0
      ? money(basePrice)
      : '<span style="opacity:.4;font-weight:400">— No price set —</span>';
    return `
    <div class="svc-card" data-id="${s.id}">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:.45rem">
        <div class="svc-card-name">${esc(s.name)}</div>
        <span class="badge ${s.active ? 'badge-confirmed' : 'badge-declined'}" style="margin-left:.5rem;flex-shrink:0">${esc(s.status || (s.active ? 'Active' : 'Hidden'))}</span>
      </div>
      <div class="svc-price" data-id="${s.id}" data-price="${s.price}" title="Click to edit price">${priceLabel}</div>
      <div class="svc-card-meta">
        <span class="svc-mini-pill">${esc(s.category || 'General')}</span>
        ${setupFee ? `<span class="svc-mini-pill">Setup ${money(setupFee)}</span>` : ''}
        ${retainer ? `<span class="svc-mini-pill">Retainer ${money(retainer)}</span>` : ''}
      </div>
      <div class="svc-card-desc">${esc(s.description || 'No description.')}</div>
      <div class="svc-card-footer">
        <div class="toggle" data-id="${s.id}" data-active="${s.active}">
          <div class="toggle-track ${s.active ? 'on' : ''}"><div class="toggle-thumb"></div></div>
          <span class="toggle-lbl">${s.active ? 'Visible' : 'Hidden'}</span>
        </div>
        <div class="client-actions">
          <button class="act-btn open-service" data-id="${s.id}">Open</button>
          <button class="act-btn delete" data-id="${s.id}">Delete</button>
        </div>
      </div>
    </div>`;
  }).join('');

  c.querySelectorAll('.svc-card').forEach(card => {
    card.addEventListener('click', e => {
      if (e.target.closest('.svc-price,.toggle,button')) return;
      openServiceDetail(card.dataset.id);
    });
  });

  c.querySelectorAll('.svc-price').forEach(el => {
    el.addEventListener('click', () => {
      const id = el.dataset.id;
      const current = el.dataset.price || '0';
      const input = document.createElement('input');
      input.type = 'number'; input.min = '0'; input.step = '1';
      input.value = current; input.className = 'svc-price-input';
      el.replaceWith(input);
      input.focus(); input.select();
      let saved = false;
      input.addEventListener('blur', async () => {
        if (saved) return;
        saved = true;
        const newPrice = Math.max(0, parseInt(input.value) || 0);
        const { error } = await sb.from('services').update({ price: newPrice }).eq('id', id);
        if (error) { toast('Error saving price.'); saved = false; loadServices(); return; }
        toast('Price updated.');
        loadServices();
      });
      input.addEventListener('keydown', e => { if (e.key === 'Enter') input.blur(); });
    });
  });

  c.querySelectorAll('.toggle').forEach(t => {
    t.addEventListener('click', async () => {
      const isActive = t.dataset.active === 'true';
      const { error: toggleErr } = await sb.from('services').update({ active: !isActive }).eq('id', t.dataset.id);
      if (toggleErr) { toast('Error saving change.'); return; }
      toast(isActive ? 'Service hidden.' : 'Service activated.');
      loadServices();
    });
  });
  c.querySelectorAll('.open-service').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      openServiceDetail(btn.dataset.id);
    });
  });
  c.querySelectorAll('.act-btn.delete').forEach(btn => {
    btn.addEventListener('click', async e => {
      e.stopPropagation();
      const service = serviceById(btn.dataset.id) || {};
      const confirmed = await opsDeleteConfirm({
        title: 'Delete Service?',
        message: 'This service will be permanently removed from OPS Command Center.',
        meta: service.name || 'Selected service',
        confirmText: 'Delete Service'
      });
      if (!confirmed) return;
      const { error: deleteErr } = await sb.from('services').delete().eq('id', btn.dataset.id);
      if (deleteErr) { toast('Error saving change.'); return; }
      toast('Service deleted.');
      loadServices();
    });
  });
}

function serviceById(id) {
  return allServices.find(s => s.id === id);
}

async function openServiceDetail(id) {
  selectedServiceId = id;
  switchPage('service-detail');
  await renderServiceDetail();
}

async function renderServiceDetail() {
  const root = $('service-detail-root');
  const service = serviceById(selectedServiceId);
  if (!root || !service) { if (root) root.innerHTML = emptyState('Service not found'); return; }
  const [quotesRes, invoicesRes] = financeSchemaReady ? await Promise.all([
    sb.from('quotes').select('*').eq('service_id', service.id).order('created_at', { ascending: false }).limit(8),
    sb.from('invoices').select('*').eq('service_id', service.id).order('created_at', { ascending: false }).limit(8)
  ]) : [{ data: [], error: null }, { data: [], error: null }];
  if (quotesRes.error || invoicesRes.error) financeSchemaReady = false;
  const serviceQuotes = quotesRes.data || [];
  const serviceInvoices = invoicesRes.data || [];
  const associatedClientNames = [...new Set([
    ...serviceQuotes.map(q => clientDisplayName(allClients.find(c => c.id === q.client_id) || {})).filter(Boolean),
    ...serviceInvoices.map(i => clientDisplayName(allClients.find(c => c.id === i.client_id) || {})).filter(Boolean)
  ])];
  root.innerHTML = `
    <div class="detail-toolbar">
      <button class="btn-ghost" onclick="switchPage('services')">Back to Services</button>
      <div class="detail-actions">
        <button class="btn-ghost" onclick="openServiceEditModal('${service.id}')">Edit Service</button>
        ${financeSchemaReady ? `<button class="btn-add" onclick="openQuoteModal('${service.id}')">Generate Quote</button><button class="btn-add" onclick="openInvoiceModal('${service.id}')">Generate Invoice</button>` : ''}
        ${proposalSchemaReady ? `<button class="btn-ghost" onclick="openProposalEditor(null,null,'${service.id}')">Generate Proposal</button>` : ''}
      </div>
    </div>
    <div class="service-detail-grid">
      ${serviceFinanceReady && financeSchemaReady ? '' : schemaNotice('Basic service management is active. Apply migration 003 to enable setup fees, retainers, quotes, and invoices.')}
      <div class="detail-hero">
        <div class="detail-eyebrow">${esc(service.category || 'General Service')}</div>
        <h2 class="detail-title">${esc(service.name)}</h2>
        <p class="detail-desc">${esc(service.description || 'No service description has been added yet.')}</p>
        <div class="detail-metrics">
          <div class="metric-tile"><div class="metric-label">Base Pricing</div><div class="metric-value">${money(service.price)}</div></div>
          <div class="metric-tile"><div class="metric-label">Setup Fee</div><div class="metric-value">${money(service.setup_fee)}</div></div>
          <div class="metric-tile"><div class="metric-label">Monthly Retainer</div><div class="metric-value">${money(service.monthly_retainer)}</div></div>
        </div>
      </div>
      <div class="detail-side">
        <div class="mini-panel">
          <div class="mini-panel-head"><span class="mini-panel-title">Service Status</span><span class="badge ${service.status === 'Archived' ? 'badge-declined' : 'badge-confirmed'}">${esc(service.status || 'Active')}</span></div>
          <div class="mini-panel-body info-list">
            <div class="info-row"><span>Visibility</span><span>${service.active ? 'Visible' : 'Hidden'}</span></div>
            <div class="info-row"><span>Associated Clients</span><span>${associatedClientNames.length ? esc(associatedClientNames.join(', ')) : 'None yet'}</span></div>
            <div class="info-row"><span>Notes</span><span>${esc(service.notes || 'No notes')}</span></div>
          </div>
        </div>
      </div>
      <div class="mini-panel">
        <div class="mini-panel-head"><span class="mini-panel-title">Quotes</span><span class="badge badge-pending">${serviceQuotes.length}</span></div>
        <div class="mini-panel-body doc-list">${documentRows(serviceQuotes, 'quote') || '<p class="td-dim">No quotes generated yet.</p>'}</div>
      </div>
      <div class="mini-panel">
        <div class="mini-panel-head"><span class="mini-panel-title">Invoices</span><span class="badge badge-pending">${serviceInvoices.length}</span></div>
        <div class="mini-panel-body doc-list">${documentRows(serviceInvoices, 'invoice') || '<p class="td-dim">No invoices generated yet.</p>'}</div>
      </div>
    </div>
  `;
}
function openServiceEditModal(id) {
  const s = serviceById(id) || {};
  if (!serviceFinanceReady) {
    showModal(`
      <div class="modal-hdr">
        <span class="modal-title">Edit Service</span>
        <button class="modal-close" onclick="closeModal()">×</button>
      </div>
      <div class="modal-body">
        <div class="modal-field full"><label>Service Name</label><input id="sd-name" value="${esc(s.name)}"></div>
        <div class="modal-field full"><label>Description</label><input id="sd-desc" value="${esc(s.description)}"></div>
        <div class="modal-field"><label>Price (R)</label><input id="sd-price" type="number" min="0" step="1" value="${Number(s.price) || 0}"></div>
        <div class="modal-field full"><label>Finance Fields</label><input readonly value="Apply migration 003 to enable full service delivery fields."></div>
      </div>
      <div class="modal-foot">
        <button class="btn-ghost" onclick="closeModal()">Cancel</button>
        <button class="btn-add" onclick="saveBasicService('${id}')">Save Service</button>
      </div>
    `);
    $('modal-box').classList.add('wide');
    return;
  }
  showModal(`
    <div class="modal-hdr">
      <span class="modal-title">Edit Service</span>
      <button class="modal-close" onclick="closeModal()">×</button>
    </div>
    <div class="modal-body">
      <div class="modal-field full"><label>Service Name</label><input id="sd-name" value="${esc(s.name)}"></div>
      <div class="modal-field"><label>Category</label><input id="sd-category" value="${esc(s.category || 'General')}"></div>
      <div class="modal-field"><label>Status</label><select id="sd-status">${SERVICE_STATUSES.map(v => `<option value="${v}"${(s.status || 'Active') === v ? ' selected' : ''}>${v}</option>`).join('')}</select></div>
      <div class="modal-field"><label>Base Price (R)</label><input id="sd-price" type="number" min="0" step="1" value="${Number(s.price) || 0}"></div>
      <div class="modal-field"><label>Setup Fee (R)</label><input id="sd-setup" type="number" min="0" step="1" value="${Number(s.setup_fee) || 0}"></div>
      <div class="modal-field"><label>Monthly Retainer (R)</label><input id="sd-retainer" type="number" min="0" step="1" value="${Number(s.monthly_retainer) || 0}"></div>
      <div class="modal-field full"><label>Description</label><input id="sd-desc" value="${esc(s.description)}"></div>
      <div class="modal-field full"><label>Notes</label><input id="sd-notes" value="${esc(s.notes)}"></div>
    </div>
    <div class="modal-foot">
      <button class="btn-ghost" onclick="closeModal()">Cancel</button>
      <button class="btn-add" onclick="saveServiceDetails('${id}')">Save Service</button>
    </div>
  `);
  $('modal-box').classList.add('wide');
}

async function saveBasicService(id) {
  const saveBtn = document.querySelector('#modal-box .btn-add');
  btnLoad(saveBtn, true, 'Saving…');
  const payload = {
    name: $('sd-name').value.trim(),
    description: $('sd-desc').value.trim() || null,
    price: Math.max(0, parseInt($('sd-price').value) || 0)
  };
  if (!payload.name) { btnLoad(saveBtn, false); toast('Service name is required.'); return; }
  const { error } = await sb.from('services').update(payload).eq('id', id);
  if (error) { btnLoad(saveBtn, false); toast('Error saving service.'); return; }
  closeModal();
  toast('Service updated.');
  await loadServices();
  await renderServiceDetail();
}

async function saveServiceDetails(id) {
  const saveBtn = document.querySelector('#modal-box .btn-add');
  btnLoad(saveBtn, true, 'Saving…');
  const payload = {
    name: $('sd-name').value.trim(),
    category: $('sd-category').value.trim() || 'General',
    status: $('sd-status').value,
    price: Math.max(0, parseInt($('sd-price').value) || 0),
    setup_fee: Math.max(0, parseInt($('sd-setup').value) || 0),
    monthly_retainer: Math.max(0, parseInt($('sd-retainer').value) || 0),
    description: $('sd-desc').value.trim() || null,
    notes: $('sd-notes').value.trim() || null
  };
  if (!payload.name) { btnLoad(saveBtn, false); toast('Service name is required.'); return; }
  const { error } = await sb.from('services').update(payload).eq('id', id);
  if (error) { btnLoad(saveBtn, false); toast('Error saving service. Apply the service delivery migration first.'); return; }
  closeModal();
  toast('Service updated.');
  await loadServices();
  await renderServiceDetail();
}

function clientOptions() {
  return allClients.map(c => `<option value="${c.id}">${esc(c.company || c.full_name || 'Unnamed client')}</option>`).join('');
}

function openQuoteModal(serviceId) {
  if (!financeSchemaReady) { toast('Apply migration 003 to generate quotes.'); return; }
  const service = serviceById(serviceId) || {};
  showDocumentModal('quote', service);
}

function openInvoiceModal(serviceId) {
  if (!financeSchemaReady) { toast('Apply migration 003 to generate invoices.'); return; }
  const service = serviceById(serviceId) || {};
  showDocumentModal('invoice', service);
}

function openClientDocumentModal(type, clientId) {
  if (!clientId) {
    showDocumentModal(type === 'quote' ? 'quote' : 'invoice', {});
    return;
  }
  const client = clientById(clientId) || {};
  const isQuote = type === 'quote';
  if (!serviceFinanceReady || !financeSchemaReady) { toast('Apply migration 003 to generate quotes and invoices.'); return; }
  showModal(`
    <div class="modal-hdr">
      <span class="modal-title">${isQuote ? 'Generate Quote' : 'Generate Invoice'}</span>
      <button class="modal-close" onclick="closeModal()">×</button>
    </div>
    <div class="modal-body">
      <div class="modal-field full" style="align-items:center">${clientAvatar(client, 'lg')}</div>
      <div class="modal-field full"><label>Client</label><input readonly value="${esc(clientDisplayName(client))}"></div>
      <div class="modal-field"><label>Service</label><select id="doc-service">${allServices.map(s => `<option value="${s.id}">${esc(s.name)}</option>`).join('')}</select></div>
      <div class="modal-field"><label>${isQuote ? 'Status' : 'Payment Status'}</label><select id="doc-status">${(isQuote ? DOC_STATUSES : INVOICE_STATUSES).map(s => `<option value="${s}">${s}</option>`).join('')}</select></div>
      <div class="modal-field"><label>${isQuote ? 'Quote Date' : 'Invoice Date'}</label><input id="doc-date" type="date" value="${todayStr()}"></div>
      <div class="modal-field"><label>${isQuote ? 'Expiry Date' : 'Due Date'}</label><input id="doc-due" type="date" value="${addDays(todayStr(), isQuote ? 14 : 7)}"></div>
      <div class="modal-field"><label>Setup Fee (R)</label><input id="doc-setup" type="number" min="0" step="1" value="0"></div>
      <div class="modal-field"><label>Monthly Retainer (R)</label><input id="doc-retainer" type="number" min="0" step="1" value="0"></div>
      <hr class="modal-divider">
      <div class="modal-field"><label>Additional Item</label><input id="doc-extra-label" placeholder="Optional line item"></div>
      <div class="modal-field"><label>Additional Amount (R)</label><input id="doc-extra-amount" type="number" min="0" step="1" value="0"></div>
    </div>
    <div class="modal-foot">
      <button class="btn-ghost" onclick="closeModal()">Cancel</button>
      <button class="btn-add" onclick="saveClientDocument('${type}','${clientId}')">${isQuote ? 'Create Quote' : 'Create Invoice'}</button>
    </div>
  `);
  $('modal-box').classList.add('wide');
  const syncServicePricing = () => {
    const service = serviceById($('doc-service').value) || {};
    $('doc-setup').value = Number(service.setup_fee) || 0;
    $('doc-retainer').value = Number(service.monthly_retainer) || 0;
  };
  $('doc-service')?.addEventListener('change', syncServicePricing);
  syncServicePricing();
}

async function saveClientDocument(type, clientId) {
  await saveDocumentWithClient(type, $('doc-service').value, clientId);
}

function showDocumentModal(type, service) {
  const isQuote = type === 'quote';
  showModal(`
    <div class="modal-hdr">
      <span class="modal-title">${isQuote ? 'Generate Quote' : 'Generate Invoice'}</span>
      <button class="modal-close" onclick="closeModal()">×</button>
    </div>
    <div class="modal-body">
      <div class="modal-field full"><label>Service</label><input readonly value="${esc(service.name)}"></div>
      <div class="modal-field"><label>Client</label><select id="doc-client">${clientOptions()}</select></div>
      <div class="modal-field"><label>${isQuote ? 'Status' : 'Payment Status'}</label><select id="doc-status">${(isQuote ? DOC_STATUSES : INVOICE_STATUSES).map(s => `<option value="${s}">${s}</option>`).join('')}</select></div>
      <div class="modal-field"><label>${isQuote ? 'Quote Date' : 'Invoice Date'}</label><input id="doc-date" type="date" value="${todayStr()}"></div>
      <div class="modal-field"><label>${isQuote ? 'Expiry Date' : 'Due Date'}</label><input id="doc-due" type="date" value="${addDays(todayStr(), isQuote ? 14 : 7)}"></div>
      <div class="modal-field"><label>Setup Fee (R)</label><input id="doc-setup" type="number" min="0" step="1" value="${Number(service.setup_fee) || 0}"></div>
      <div class="modal-field"><label>Monthly Retainer (R)</label><input id="doc-retainer" type="number" min="0" step="1" value="${Number(service.monthly_retainer) || 0}"></div>
      <hr class="modal-divider">
      <div class="modal-field"><label>Additional Item</label><input id="doc-extra-label" placeholder="Optional line item"></div>
      <div class="modal-field"><label>Additional Amount (R)</label><input id="doc-extra-amount" type="number" min="0" step="1" value="0"></div>
    </div>
    <div class="modal-foot">
      <button class="btn-ghost" onclick="closeModal()">Cancel</button>
      <button class="btn-add" onclick="saveDocument('${type}','${service.id}')">${isQuote ? 'Create Quote' : 'Create Invoice'}</button>
    </div>
  `);
  $('modal-box').classList.add('wide');
}

async function saveDocument(type, serviceId) {
  const clientId = $('doc-client').value;
  if (!clientId) { toast('Select a client first.'); return; }
  await saveDocumentWithClient(type, serviceId, clientId);
}

async function saveDocumentWithClient(type, serviceId, clientId) {
  const saveBtn = document.querySelector('#modal-box .btn-add');
  btnLoad(saveBtn, true, type === 'quote' ? 'Generating…' : 'Generating…');
  const service = serviceById(serviceId) || {};
  if (!serviceId || !service.id) { btnLoad(saveBtn, false); toast('Select a service first.'); return; }
  const setup = Math.max(0, parseInt($('doc-setup').value) || 0);
  const retainer = Math.max(0, parseInt($('doc-retainer').value) || 0);
  const extraAmount = Math.max(0, parseInt($('doc-extra-amount').value) || 0);
  const extraLabel = $('doc-extra-label').value.trim();
  const additionalItems = extraLabel && extraAmount ? [{ label: extraLabel, amount: extraAmount }] : [];
  const total = setup + retainer + additionalItems.reduce((sum, item) => sum + item.amount, 0);
  const isQuote = type === 'quote';
  const payload = isQuote ? {
    quote_number: docNumber('Q'),
    client_id: clientId,
    service_id: serviceId,
    service_name: service.name,
    service_description: service.description,
    quote_date: $('doc-date').value,
    expiry_date: $('doc-due').value,
    setup_fee: setup,
    monthly_retainer: retainer,
    additional_items: additionalItems,
    total_amount: total,
    status: $('doc-status').value
  } : {
    invoice_number: docNumber('INV'),
    client_id: clientId,
    service_id: serviceId,
    service_name: service.name,
    service_description: service.description,
    invoice_date: $('doc-date').value,
    due_date: $('doc-due').value,
    setup_fee: setup,
    monthly_retainer: retainer,
    additional_items: additionalItems,
    total_amount: total,
    payment_status: $('doc-status').value
  };
  const { error } = await sb.from(isQuote ? 'quotes' : 'invoices').insert(payload);
  if (error) {
    if (isSchemaError(error)) financeSchemaReady = false;
    btnLoad(saveBtn, false);
    toast(`Error creating ${isQuote ? 'quote' : 'invoice'}. Apply migration 003 first.`);
    return;
  }
  closeModal();
  toast(isQuote ? 'Quote generated.' : 'Invoice generated.');
  await Promise.all([selectedServiceId ? renderServiceDetail() : Promise.resolve(), selectedClientId ? renderClientProfile() : Promise.resolve(), loadRetainerOverview(), loadQuotes(), loadInvoices()]);
}

$('add-svc-btn').addEventListener('click', async () => {
  const name  = $('svc-name').value.trim();
  const desc  = $('svc-desc').value.trim();
  const price = Math.max(0, parseInt($('svc-price').value) || 0);
  if (!name) { toast('Service name is required.'); return; }
  const payload = { name, description: desc || null, price, active: true, sort_order: 99 };
  let { error } = await sb.from('services').insert(serviceFinanceReady ? { ...payload, category: 'General', status: 'Active', setup_fee: 0, monthly_retainer: 0 } : payload);
  if (error && serviceFinanceReady) {
    const fallback = await sb.from('services').insert(payload);
    error = fallback.error;
  }
  if (error) { toast('Error adding service. Check services table permissions.'); return; }
  $('svc-name').value = ''; $('svc-desc').value = ''; $('svc-price').value = '';
  toast('Service added.');
  loadServices();
});
