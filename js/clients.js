/* ── Clients ── */
async function loadClients() {
  const ct = $('clients-table');
  if (ct) ct.innerHTML = skelTable(5, 5);
  const { data } = await sb.from('clients').select('*').order('created_at', { ascending: false });
  allClients = data || [];
  renderClientPlanFilter();
  renderClients();
  renderProjectClientFilter();
  if (allProjects.length) renderProjects();
  if (selectedClientId && $('page-client-profile')?.classList.contains('active')) renderClientProfile();
  const badge = $('clients-badge');
  if (badge) {
    if (allClients.length > 0) { badge.textContent = allClients.length; badge.classList.add('show'); }
    else badge.classList.remove('show');
  }
}

$('client-search')?.addEventListener('input', e => {
  clientSearch = e.target.value.trim();
  renderClients();
});
$('client-plan-filter')?.addEventListener('change', e => {
  clientPlanFilter = e.target.value;
  renderClients();
});
$('add-client-btn')?.addEventListener('click', () => openClientOnboarding());

const CORE_OPS_PLANS = ['Signature', 'Growth', 'Premium'];

function clientPlanOptionHTML(selectedValue = '') {
  const selected = String(selectedValue || '').trim();
  const selectedKey = selected.toLowerCase();
  const serviceNames = [];
  const seenServices = new Set();
  allServices.forEach(service => {
    const name = String(service.name || '').trim();
    const key = name.toLowerCase();
    if (!name || seenServices.has(key)) return;
    seenServices.add(key);
    serviceNames.push(name);
  });
  const knownValues = new Set([...CORE_OPS_PLANS, ...serviceNames].map(v => v.toLowerCase()));
  const option = value => `<option value="${esc(value)}"${selectedKey === String(value).toLowerCase() ? ' selected' : ''}>${esc(value)}</option>`;
  const current = selected && !knownValues.has(selectedKey)
    ? `<optgroup label="Current Selection">${option(selected)}</optgroup>`
    : '';
  return `${current}
    <optgroup label="OPS Plans">${CORE_OPS_PLANS.map(option).join('')}</optgroup>
    ${serviceNames.length ? `<optgroup label="Services">${serviceNames.map(option).join('')}</optgroup>` : ''}`;
}

function renderClientPlanFilter() {
  const select = $('client-plan-filter');
  if (!select) return;
  const current = clientPlanFilter || 'all';
  select.innerHTML = `<option value="all">All plans & services</option>${clientPlanOptionHTML(current === 'all' ? '' : current)}`;
  select.value = [...select.options].some(option => option.value === current) ? current : 'all';
}

function clientById(id) {
  return allClients.find(c => c.id === id);
}

function clientInitials(client = {}) {
  const name = client.company || client.full_name || 'Client';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (parts.length > 1 ? parts[0][0] + parts[1][0] : name.slice(0, 2)).toUpperCase();
}

function clientAvatar(client = {}, size = '') {
  const cls = `client-avatar${size ? ' ' + size : ''}`;
  return `<div class="${cls}">${client.logo_url ? `<img src="${esc(client.logo_url)}" alt="${esc(client.company || client.full_name || 'Client')} logo">` : esc(clientInitials(client))}</div>`;
}

function clientDisplayName(client = {}) {
  return client.company || client.full_name || 'Unnamed client';
}

function renderClients() {
  const c = $('clients-table');
  if (!c) return;
  let rows = allClients;
  if (clientSearch) {
    const q = clientSearch.toLowerCase();
    rows = rows.filter(r =>
      r.full_name?.toLowerCase().includes(q) ||
      r.email?.toLowerCase().includes(q) ||
      r.company?.toLowerCase().includes(q) ||
      r.company_email?.toLowerCase().includes(q)
    );
  }
  if (clientPlanFilter !== 'all') {
    rows = rows.filter(r => (r.selected_plan || r.project_type || '').toLowerCase() === clientPlanFilter.toLowerCase());
  }
  if (!rows.length) {
    c.innerHTML = emptyState('No clients found', 'Add a client or convert a lead from the Contacts page.');
    return;
  }
  c.innerHTML = `<table class="a-table">
    <thead><tr>
      <th>Client</th><th>Business</th><th>Stage</th><th>Plan</th><th>Start</th><th>Contact</th><th>Actions</th>
    </tr></thead>
    <tbody>${rows.map(r => `<tr class="client-row" data-id="${r.id}">
      <td><div class="client-cell">${clientAvatar(r)}<div class="client-name-block"><span class="client-company">${esc(r.company || 'Independent Client')}</span><span class="client-contact">${esc(r.full_name || 'No primary contact')}${r.position ? ' · ' + esc(r.position) : ''}</span></div></div></td>
      <td><div class="td-stack"><span>${esc(r.industry || '—')}</span><span class="td-dim">${esc(r.website || r.company_email || '—')}</span></div></td>
      ${stageBadge(r)}<td><span class="badge badge-confirmed">${esc(r.selected_plan || r.project_type || 'Unassigned')}</span></td>
      <td class="td-dim">${compactDate(r.project_start_date)}</td>
      <td><div class="td-stack"><span style="font-size:.75rem">${esc(r.email || r.company_email || '—')}</span><span class="td-dim">${esc(r.phone || r.company_phone || '—')}</span></div></td>
      <td><div class="client-actions"><button class="act-btn retainer-client" data-id="${r.id}">Retainer</button><button class="act-btn edit-client" data-id="${r.id}">Edit</button><button class="act-btn delete delete-client" data-id="${r.id}">Delete</button></div></td>
    </tr>`).join('')}</tbody>
  </table>`;
  c.querySelectorAll('.stage-select').forEach(sel => {
    sel.addEventListener('change', e => { e.stopPropagation(); setClientStage(sel.dataset.id, sel.value); });
  });
  c.querySelectorAll('.client-row').forEach(row => row.addEventListener('click', () => openClientProfile(row.dataset.id)));
  c.querySelectorAll('.retainer-client').forEach(btn => btn.addEventListener('click', e => { e.stopPropagation(); openRetainerModal(btn.dataset.id); }));
  c.querySelectorAll('.edit-client').forEach(btn => btn.addEventListener('click', e => { e.stopPropagation(); openClientOnboarding(btn.dataset.id); }));
  c.querySelectorAll('.delete-client').forEach(btn => btn.addEventListener('click', e => { e.stopPropagation(); deleteClient(btn.dataset.id); }));
}

function renderPipelinePage() {
  const board = document.getElementById('pipeline-board');
  if (!board) return;
  const healthEmoji = { green: '🟢', amber: '🟡', red: '🔴' };
  board.innerHTML = LIFECYCLE_STAGES.map(stage => {
    const clients = allClients.filter(c => (c.lifecycle_stage || 'Lead') === stage);
    const cards = clients.map(client => {
      const health = clientHealth(client);
      const days = client.stage_entered_at
        ? Math.floor((Date.now() - new Date(client.stage_entered_at).getTime()) / 86400000)
        : 0;
      const action = nextAction(client);
      const plan = esc(client.selected_plan || client.project_type || '');
      return `<div class="pipeline-card" onclick="openClientProfile('${client.id}')">
        <div class="pipeline-card-top">
          <span class="pipeline-health">${healthEmoji[health]}</span>
          <span class="pipeline-name">${esc(clientDisplayName(client))}</span>
        </div>
        ${plan ? `<span class="badge">${plan}</span><br>` : ''}
        <div class="pipeline-meta">${days}d in stage</div>
        <div class="pipeline-action">${esc(action)}</div>
      </div>`;
    }).join('');
    return `<div class="pipeline-col">
      <div class="pipeline-col-head">
        <span class="pipeline-col-title">${stage}</span>
        <span class="pipeline-col-count">${clients.length}</span>
      </div>
      <div class="pipeline-col-body">${cards || '<p class="pipeline-empty">No clients</p>'}</div>
    </div>`;
  }).join('');
}

function normalizeAssetRuleText(value = '') {
  return String(value || '').toLowerCase();
}
function selectedOnboardingPlanText() {
  return normalizeAssetRuleText($('oc-plan')?.value || '');
}
function assetRuleMatches(rule, selected = selectedOnboardingPlanText()) {
  if (!rule) return true;
  if (rule === 'website') return /website|signature|growth|premium/.test(selected);
  if (rule === 'lead') return /lead|capture/.test(selected);
  if (rule === 'system') return /operating system|crm|workflow|automation|payment/.test(selected);
  if (rule === 'presence') return /digital presence|presence|marketing|management/.test(selected);
  if (rule === 'team') return /website|team|operating system|crm|signature|growth|premium/.test(selected);
  if (rule === 'content') return /website|lead|booking|signature|growth|premium/.test(selected);
  return selected.includes(rule);
}
function requestedClientAssets() {
  const selected = selectedOnboardingPlanText();
  return CLIENT_ASSET_REQUESTS.filter(item => item.required || !item.rule || assetRuleMatches(item.rule, selected));
}
function assetStatusOptions(status = 'Missing') {
  return ASSET_STATUSES.map(s => `<option value="${s}"${s === status ? ' selected' : ''}>${s}</option>`).join('');
}
function safePathSegment(value = '') {
  return String(value || 'item').trim().replace(/[^a-z0-9._-]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'item';
}
function fileExtension(fileName = '') {
  return String(fileName).split('.').pop().toLowerCase();
}
function isAcceptedAssetFile(file) {
  return ['pdf','png','jpg','jpeg','svg','docx','xlsx'].includes(fileExtension(file?.name || ''));
}
async function loadClientAssetDocuments(clientId) {
  if (!clientId || !onboardingAssetSchemaReady) return [];
  const { data, error } = await sb.from('client_documents').select('*').eq('client_id', clientId).order('created_at', { ascending: true });
  if (error) { onboardingAssetSchemaReady = false; return []; }
  return Promise.all((data || []).map(async row => {
    if (row.file_path) {
      const signed = await sb.storage.from('client-documents').createSignedUrl(row.file_path, 3600);
      if (!signed.error) row.preview_url = signed.data?.signedUrl;
    }
    return row;
  }));
}
function initOnboardingAssetState(existingDocs = []) {
  onboardingAssetState = {};
  onboardingAccessState = {};
  onboardingChecklistState = {};
  existingDocs.forEach(doc => {
    if (doc.record_type === 'access_note') {
      onboardingAccessState[String(doc.document_key || '').replace('access_', '')] = doc.notes || '';
      return;
    }
    if (doc.record_type === 'checklist') {
      onboardingChecklistState[String(doc.document_key || '').replace('check_', '')] = doc.status === 'Approved' || doc.status === 'Uploaded';
      return;
    }
    if (doc.record_type && doc.record_type !== 'document') return;
    if (!doc.document_key) return;
    onboardingAssetState[doc.document_key] = { status: doc.status || 'Missing', existing: doc, file: null, previewUrl: doc.preview_url || '', deleteExisting: false };
  });
  INTERNAL_CHECKLIST_ITEMS.forEach(item => { if (typeof onboardingChecklistState[item.key] !== 'boolean') onboardingChecklistState[item.key] = false; });
  ACCESS_NOTE_ITEMS.forEach(item => { if (typeof onboardingAccessState[item.key] !== 'string') onboardingAccessState[item.key] = ''; });
}
function ensureAssetState(key) {
  if (!onboardingAssetState[key]) onboardingAssetState[key] = { status:'Missing', existing:null, file:null, previewUrl:'', deleteExisting:false };
  return onboardingAssetState[key];
}
function assetPreviewHTML(key) {
  const state = ensureAssetState(key);
  const fileName = state.file?.name || state.existing?.file_name || '';
  const fileType = state.file?.type || state.existing?.file_type || fileExtension(fileName).toUpperCase();
  const preview = state.previewUrl;
  if (!fileName || state.deleteExisting) return `<div><div class="asset-drop-title">Drop file or click to upload</div><div class="asset-drop-sub">PDF, PNG, JPG, JPEG, SVG, DOCX, XLSX</div></div>`;
  const isImage = /image\//.test(fileType) || ['png','jpg','jpeg','svg'].includes(fileExtension(fileName));
  const thumb = isImage && preview ? `<img src="${esc(preview)}" alt="${esc(fileName)} preview">` : esc(fileExtension(fileName).toUpperCase() || 'FILE');
  return `<div class="asset-preview"><div class="asset-preview-thumb">${thumb}</div><div><div class="asset-preview-name">${esc(fileName)}</div><div class="asset-preview-sub">${esc(fileType || 'Document')} - ${state.file ? 'Pending upload' : state.existing?.uploaded_at ? compactDate(state.existing.uploaded_at.split('T')[0]) : 'Saved'}</div></div></div>`;
}
function assetCardHTML(item) {
  const state = ensureAssetState(item.key);
  return `<div class="asset-card" data-asset-key="${esc(item.key)}"><div><div class="asset-title">${esc(item.name)}${item.required ? '<span class="asset-required">Mandatory</span>' : ''}</div><div class="asset-meta">${esc(item.hint || '')}</div><div class="asset-actions"><select class="asset-status-select" data-asset-status="${esc(item.key)}">${assetStatusOptions(state.status)}</select><button class="act-btn" type="button" onclick="triggerAssetUpload('${item.key}')">Replace</button><button class="act-btn delete" type="button" onclick="removeOnboardingAsset('${item.key}')">Delete</button></div></div><div class="asset-dropzone" data-asset-drop="${esc(item.key)}">${assetPreviewHTML(item.key)}<input class="asset-file-input" id="asset-file-${esc(item.key)}" type="file" accept="${ASSET_ACCEPT}" data-asset-file="${esc(item.key)}"></div></div>`;
}
function renderClientAssetsStep() {
  const root = $('client-assets-root');
  if (!root) return;
  const assets = requestedClientAssets();
  const groups = CLIENT_REPOSITORY_FOLDERS.map(folder => [folder, assets.filter(item => item.folder === folder)]).filter(([,items]) => items.length);
  root.innerHTML = `<div class="assets-guidance"><div class="assets-guidance-title">Prepare the client workspace</div><div class="assets-guidance-copy">Capture only the assets that matter for the selected service. OPS will use these to prepare the delivery workspace, documents, and implementation plan.</div></div><div class="asset-groups">${groups.map(([folder, items]) => `<section class="asset-group"><div class="asset-group-head"><span class="asset-group-title">${esc(folder)}</span><span class="asset-group-count">${items.length} request${items.length === 1 ? '' : 's'}</span></div>${items.map(assetCardHTML).join('')}</section>`).join('')}<section class="asset-group"><div class="asset-group-head"><span class="asset-group-title">Platform Access Notes</span><span class="asset-group-count">No passwords</span></div><div class="asset-access-grid" style="padding:.85rem .9rem">${ACCESS_NOTE_ITEMS.map(item => `<div class="onboarding-field"><label>${esc(item.label)}</label><textarea data-access-note="${esc(item.key)}" placeholder="${esc(item.placeholder)}">${esc(onboardingAccessState[item.key] || '')}</textarea></div>`).join('')}</div></section><section class="asset-group"><div class="asset-group-head"><span class="asset-group-title">Internal OPS Checklist</span><span class="asset-group-count">Delivery readiness</span></div><div class="asset-checklist" style="padding:.85rem .9rem">${INTERNAL_CHECKLIST_ITEMS.map(item => `<label class="asset-check-item"><input type="checkbox" data-asset-check="${esc(item.key)}"${onboardingChecklistState[item.key] ? ' checked' : ''}>${esc(item.label)}</label>`).join('')}</div></section></div>`;
  enhanceOpsSelects(root);
  wireClientAssetControls(root);
}
function wireClientAssetControls(root = document) {
  root.querySelectorAll('[data-asset-status]').forEach(sel => sel.addEventListener('change', () => { ensureAssetState(sel.dataset.assetStatus).status = sel.value; }));
  root.querySelectorAll('[data-access-note]').forEach(input => input.addEventListener('input', () => { onboardingAccessState[input.dataset.accessNote] = input.value; }));
  root.querySelectorAll('[data-asset-check]').forEach(input => input.addEventListener('change', () => { onboardingChecklistState[input.dataset.assetCheck] = input.checked; }));
  root.querySelectorAll('[data-asset-file]').forEach(input => input.addEventListener('change', () => { const file = input.files?.[0]; if (file) setOnboardingAssetFile(input.dataset.assetFile, file); }));
  root.querySelectorAll('[data-asset-drop]').forEach(zone => {
    zone.addEventListener('click', e => { if (e.target.closest('button,select,.ops-select-wrap')) return; $('asset-file-' + zone.dataset.assetDrop)?.click(); });
    ['dragenter','dragover'].forEach(eventName => zone.addEventListener(eventName, e => { e.preventDefault(); zone.classList.add('drag-over'); }));
    ['dragleave','drop'].forEach(eventName => zone.addEventListener(eventName, e => { e.preventDefault(); zone.classList.remove('drag-over'); }));
    zone.addEventListener('drop', e => { const file = e.dataTransfer?.files?.[0]; if (file) setOnboardingAssetFile(zone.dataset.assetDrop, file); });
  });
}
function triggerAssetUpload(key) { $('asset-file-' + key)?.click(); }
function setOnboardingAssetFile(key, file) {
  if (!isAcceptedAssetFile(file)) { toast('Unsupported file type. Use PDF, PNG, JPG, JPEG, SVG, DOCX, or XLSX.'); return; }
  const state = ensureAssetState(key);
  if (state.previewUrl && state.file) URL.revokeObjectURL(state.previewUrl);
  state.file = file;
  state.previewUrl = URL.createObjectURL(file);
  state.status = 'Pending';
  state.deleteExisting = false;
  renderClientAssetsStep();
}
function removeOnboardingAsset(key) {
  const state = ensureAssetState(key);
  if (state.previewUrl && state.file) URL.revokeObjectURL(state.previewUrl);
  state.file = null;
  state.previewUrl = '';
  state.status = 'Missing';
  state.deleteExisting = Boolean(state.existing?.file_path);
  renderClientAssetsStep();
}
function syncClientAssetRequests() { renderClientAssetsStep(); renderClientReview(); }
function renderClientReview() {
  const root = $('client-review-root');
  if (!root) return;
  const assets = requestedClientAssets();
  const ready = assets.filter(item => ['Uploaded','Approved'].includes(ensureAssetState(item.key).status)).length;
  const checklistDone = INTERNAL_CHECKLIST_ITEMS.filter(item => onboardingChecklistState[item.key]).length;
  root.innerHTML = `<div class="onboarding-review"><div class="review-card"><div class="review-title">Client</div><div class="review-list"><span>${esc($('oc-company')?.value || 'Company not set')}</span><span>${esc($('oc-name')?.value || 'Contact not set')}</span><span>${esc($('oc-plan')?.value || 'Service not selected')}</span></div></div><div class="review-card"><div class="review-title">Assets</div><div class="review-list"><span>${ready} of ${assets.length} requested items uploaded or approved</span><span>${checklistDone} of ${INTERNAL_CHECKLIST_ITEMS.length} internal checks complete</span><span>Repository: ${esc($('oc-company')?.value || 'Client Name')}</span></div></div><div class="review-card"><div class="review-title">Repository Structure</div><div class="review-list">${CLIENT_REPOSITORY_FOLDERS.map(folder => `<span>${esc(folder)}</span>`).join('')}</div></div><div class="review-card"><div class="review-title">OPS Documents</div><div class="review-list">${OPS_DOCUMENT_SLOTS.map(doc => `<span>${esc(doc)}</span>`).join('')}</div></div></div>`;
}
async function upsertClientDocumentRow(row) {
  const { error } = await sb.from('client_documents').upsert(row, { onConflict:'client_id,document_key' });
  if (error) throw error;
}
async function ensureClientDocumentRepository(clientId) {
  const folderRows = CLIENT_REPOSITORY_FOLDERS.map(folder => ({ client_id:clientId, record_type:'folder', folder, document_key:'folder_' + safePathSegment(folder).toLowerCase(), document_name:folder, status:'Pending' }));
  const docRows = OPS_DOCUMENT_SLOTS.map(name => ({ client_id:clientId, record_type:'generated_slot', folder:'OPS Documents', document_key:'ops_doc_' + safePathSegment(name).toLowerCase(), document_name:name, status:'Missing' }));
  const { error } = await sb.from('client_documents').upsert([...folderRows, ...docRows], { onConflict:'client_id,document_key' });
  if (error) throw error;
}
async function saveOnboardingAssets(clientId) {
  if (!clientId || !onboardingAssetSchemaReady) return;
  try {
    await ensureClientDocumentRepository(clientId);
    for (const item of requestedClientAssets()) {
      const state = ensureAssetState(item.key);
      let row = { client_id:clientId, record_type:'document', folder:item.folder, document_key:item.key, document_name:item.name, status:state.status || 'Missing' };
      if (state.deleteExisting && state.existing?.file_path) {
        await sb.storage.from('client-documents').remove([state.existing.file_path]);
        row = { ...row, file_name:null, file_type:null, file_path:null, uploaded_at:null };
      }
      if (state.file) {
        const path = `${clientId}/${safePathSegment(item.folder)}/${Date.now()}-${safePathSegment(state.file.name)}`;
        const { error: uploadError } = await sb.storage.from('client-documents').upload(path, state.file, { upsert:true });
        if (uploadError) throw uploadError;
        row = { ...row, file_name:state.file.name, file_type:state.file.type || fileExtension(state.file.name).toUpperCase(), file_path:path, status:'Uploaded', uploaded_at:new Date().toISOString() };
        if (item.key === 'company_logo' && /^image\//.test(state.file.type || '')) {
          const ext = fileExtension(state.file.name) || 'png';
          const logoPath = `${clientId}/${Date.now()}.${ext}`;
          const logoUpload = await sb.storage.from('client-logos').upload(logoPath, state.file, { upsert:true });
          if (!logoUpload.error) {
            const { data } = sb.storage.from('client-logos').getPublicUrl(logoPath);
            await sb.from('clients').update({ logo_url:data.publicUrl }).eq('id', clientId);
          }
        }
      }
      await upsertClientDocumentRow(row);
    }
    for (const item of ACCESS_NOTE_ITEMS) await upsertClientDocumentRow({ client_id:clientId, record_type:'access_note', folder:'Platform Access Notes', document_key:'access_' + item.key, document_name:item.label, status:onboardingAccessState[item.key] ? 'Pending' : 'Missing', notes:onboardingAccessState[item.key] || null });
    for (const item of INTERNAL_CHECKLIST_ITEMS) await upsertClientDocumentRow({ client_id:clientId, record_type:'checklist', folder:'OPS Documents', document_key:'check_' + item.key, document_name:item.label, status:onboardingChecklistState[item.key] ? 'Approved' : 'Missing' });
  } catch (error) {
    onboardingAssetSchemaReady = false;
    toast('Client saved. Apply migration 012 and create the client-documents bucket to persist asset uploads.');
  }
}
async function openClientOnboarding(id = null) {
  onboardingStep = 0;
  const client = id ? clientById(id) : {};
  const isEdit = Boolean(id);
  const address = clientAddressParts(client);
  onboardingClientId = id || null;
  const existingAssetDocs = id ? await loadClientAssetDocuments(id) : [];
  initOnboardingAssetState(existingAssetDocs);
  showModal(`
    <div class="modal-hdr">
      <span class="modal-title">${isEdit ? 'Edit Client' : 'New Client Onboarding'}</span>
      <button class="modal-close" onclick="closeModal()">×</button>
    </div>
    <div class="onboarding-shell">
      <div class="onboarding-steps">
        <div class="onboarding-step active" data-step="0"><div class="onboarding-step-num">Step 01</div><div class="onboarding-step-title">Business</div></div>
        <div class="onboarding-step" data-step="1"><div class="onboarding-step-num">Step 02</div><div class="onboarding-step-title">Contact</div></div>
        <div class="onboarding-step" data-step="2"><div class="onboarding-step-num">Step 03</div><div class="onboarding-step-title">Plan</div></div>
        <div class="onboarding-step" data-step="3"><div class="onboarding-step-num">Step 04</div><div class="onboarding-step-title">Assets</div></div>
        <div class="onboarding-step" data-step="4"><div class="onboarding-step-num">Step 05</div><div class="onboarding-step-title">Review</div></div>
      </div>
      <div class="onboarding-panel active" data-panel="0">
        <div class="onboarding-field full"><label>Company Name</label><input id="oc-company" value="${esc(client.company)}"></div>
        <div class="onboarding-field"><label>Industry</label><input id="oc-industry" value="${esc(client.industry)}"></div>
        <div class="onboarding-field"><label>Website</label><input id="oc-website" value="${esc(client.website)}" placeholder="https://"></div>
        <div class="onboarding-field"><label>Company Email</label><input id="oc-company-email" type="email" value="${esc(client.company_email || client.email)}"></div>
        <div class="onboarding-field"><label>Company Phone</label><input id="oc-company-phone" value="${esc(client.company_phone || client.phone)}"></div>
        <div class="address-capture">
          <div class="address-capture-title">Registered / Trading Address</div>
          <div class="onboarding-field span-4"><label>Address Line 1</label><input id="oc-address-line1" value="${esc(address.line1)}" placeholder="Street number and street name"></div>
          <div class="onboarding-field span-4"><label>Address Line 2</label><input id="oc-address-line2" value="${esc(address.line2)}" placeholder="Building, floor, suite, unit, or complex"></div>
          <div class="onboarding-field span-2"><label>Suburb / Area</label><input id="oc-address-suburb" value="${esc(address.suburb)}" placeholder="Suburb or area"></div>
          <div class="onboarding-field span-2"><label>City / Town</label><input id="oc-address-city" value="${esc(address.city)}" placeholder="City or town"></div>
          <div class="onboarding-field span-2"><label>Province / State</label><input id="oc-address-province" value="${esc(address.province)}" placeholder="Province"></div>
          <div class="onboarding-field"><label>Postal Code</label><input id="oc-address-postal" value="${esc(address.postalCode)}" inputmode="numeric" placeholder="0000"></div>
          <div class="onboarding-field"><label>Country</label><input id="oc-address-country" value="${esc(address.country)}" placeholder="South Africa"></div>
        </div>
      </div>
      <div class="onboarding-panel" data-panel="1">
        <div class="onboarding-field full"><label>Full Name</label><input id="oc-name" value="${esc(client.full_name)}"></div>
        <div class="onboarding-field"><label>Position / Role</label><input id="oc-position" value="${esc(client.position)}"></div>
        <div class="onboarding-field"><label>Email Address</label><input id="oc-email" type="email" value="${esc(client.email || client.company_email)}"></div>
        <div class="onboarding-field"><label>Phone Number</label><input id="oc-phone" value="${esc(client.phone || client.company_phone)}"></div>
      </div>
      <div class="onboarding-panel" data-panel="2">
        <div class="onboarding-field"><label>Selected Service / Plan</label><select id="oc-plan" onchange="syncClientAssetRequests()">${clientPlanOptionHTML(client.selected_plan || client.project_type)}</select></div>
        <div class="onboarding-field"><label>Client Status</label><select id="oc-status">${['Active','Pending','Paused','Archived'].map(s => `<option value="${s}"${(client.client_status || 'Active') === s ? ' selected' : ''}>${s}</option>`).join('')}</select></div>
        <div class="onboarding-field"><label>Project Start Date</label><input id="oc-start" type="date" value="${esc(client.project_start_date)}"></div>
        <div class="onboarding-field full"><label>Notes</label><textarea id="oc-notes">${esc(client.notes || client.brief)}</textarea></div>
      </div>
      <div class="onboarding-panel" data-panel="3">
        <div id="client-assets-root" class="client-assets-root"></div>
      </div>
      <div class="onboarding-panel" data-panel="4">
        <div id="client-review-root" class="client-assets-root"></div>
      </div>
      <div class="onboarding-foot">
        <p class="onboarding-hint">Capture the essentials now. You can refine the client record as the engagement develops.</p>
        <div class="onboarding-actions">
          <button class="btn-ghost" id="onboarding-prev" onclick="moveOnboarding(-1)">Back</button>
          <button class="btn-add" id="onboarding-next" onclick="moveOnboarding(1)">Next</button>
          <button class="btn-add" id="onboarding-save" onclick="saveClient('${id || ''}')" style="display:none">${isEdit ? 'Save Client' : 'Create Client'}</button>
        </div>
      </div>
    </div>
  `);
  $('modal-box').classList.add('wide', 'client-onboarding');
  renderClientAssetsStep();
  renderClientReview();
  syncOnboarding();
}

function moveOnboarding(delta) {
  onboardingStep = Math.max(0, Math.min(ONBOARDING_TOTAL_STEPS - 1, onboardingStep + delta));
  renderClientAssetsStep();
  renderClientReview();
  syncOnboarding();
}

function syncOnboarding() {
  document.querySelectorAll('.onboarding-step').forEach(s => s.classList.toggle('active', Number(s.dataset.step) === onboardingStep));
  document.querySelectorAll('.onboarding-panel').forEach(p => p.classList.toggle('active', Number(p.dataset.panel) === onboardingStep));
  $('onboarding-prev').style.visibility = onboardingStep === 0 ? 'hidden' : 'visible';
  $('onboarding-next').style.display = onboardingStep === ONBOARDING_TOTAL_STEPS - 1 ? 'none' : 'inline-block';
  $('onboarding-save').style.display = onboardingStep === ONBOARDING_TOTAL_STEPS - 1 ? 'inline-block' : 'none';
  if (onboardingStep === 3) renderClientAssetsStep();
  if (onboardingStep === 4) renderClientReview();
}

async function saveClient(id = '') {
  const saveBtn = $('onboarding-save');
  btnLoad(saveBtn, true, id ? 'Saving…' : 'Creating…');
  const notes = $('oc-notes').value.trim();
  const addressParts = {
    line1:      $('oc-address-line1')?.value.trim() || '',
    line2:      $('oc-address-line2')?.value.trim() || '',
    suburb:     $('oc-address-suburb')?.value.trim() || '',
    city:       $('oc-address-city')?.value.trim() || '',
    province:   $('oc-address-province')?.value.trim() || '',
    postalCode: $('oc-address-postal')?.value.trim() || '',
    country:    $('oc-address-country')?.value.trim() || '',
  };
  const composedAddress = composeClientAddress(addressParts);
  const payload = {
    company:            $('oc-company').value.trim(),
    industry:           $('oc-industry').value.trim() || null,
    website:            $('oc-website').value.trim() || null,
    company_email:      $('oc-company-email').value.trim() || null,
    company_phone:      $('oc-company-phone').value.trim() || null,
    company_address:    composedAddress || null,
    address_line1:      addressParts.line1 || null,
    address_line2:      addressParts.line2 || null,
    address_suburb:     addressParts.suburb || null,
    address_city:       addressParts.city || null,
    address_province:   addressParts.province || null,
    address_postal_code: addressParts.postalCode || null,
    address_country:    addressParts.country || null,
    full_name:          $('oc-name').value.trim(),
    position:           $('oc-position').value.trim() || null,
    email:              $('oc-email').value.trim(),
    phone:              $('oc-phone').value.trim() || null,
    selected_plan:      $('oc-plan').value,
    client_status:      $('oc-status').value,
    project_type:       $('oc-plan').value,
    project_start_date: $('oc-start').value || null,
    notes:              notes || null,
    brief:              notes || null,
  };
  if (!payload.company || !payload.full_name || !payload.email) {
    btnLoad(saveBtn, false);
    toast('Company, primary contact, and email are required.');
    return;
  }
  let query = id ? sb.from('clients').update(payload).eq('id', id).select().single() : sb.from('clients').insert(payload).select().single();
  let { data: savedClient, error } = await query;
  if (error) {
    const fallback = { ...payload };
    delete fallback.address_line1;
    delete fallback.address_line2;
    delete fallback.address_suburb;
    delete fallback.address_city;
    delete fallback.address_province;
    delete fallback.address_postal_code;
    delete fallback.address_country;
    delete fallback.client_status;
    query = id ? sb.from('clients').update(fallback).eq('id', id).select().single() : sb.from('clients').insert(fallback).select().single();
    ({ data: savedClient, error } = await query);
  }
  if (error) {
    const legacyFallback = { ...payload };
    delete legacyFallback.company_address;
    delete legacyFallback.address_line1;
    delete legacyFallback.address_line2;
    delete legacyFallback.address_suburb;
    delete legacyFallback.address_city;
    delete legacyFallback.address_province;
    delete legacyFallback.address_postal_code;
    delete legacyFallback.address_country;
    delete legacyFallback.client_status;
    query = id ? sb.from('clients').update(legacyFallback).eq('id', id).select().single() : sb.from('clients').insert(legacyFallback).select().single();
    ({ data: savedClient, error } = await query);
  }
  if (error) { btnLoad(saveBtn, false); toast('Error saving client. Apply the client schema migration first.'); return; }
  const savedClientId = id || savedClient?.id;
  if (savedClientId) await saveOnboardingAssets(savedClientId);
  closeModal();
  toast(id ? 'Client updated.' : 'Client created.');
  await Promise.all([loadClients(), loadStats(), loadRecentActivity()]);
  if (selectedClientId === id) renderClientProfile();
}

async function openClientProfile(id) {
  selectedClientId = id;
  switchPage('client-profile');
  await renderClientProfile();
}

function linkedRows(rows, emptyText) {
  if (!rows?.length) return `<p class="td-dim">${emptyText}</p>`;
  return rows.map(r => `<div class="linked-row">
    <div><div class="linked-title">${esc(r.title)}</div><div class="linked-meta">${esc(r.meta || '')}</div></div>
    <div class="linked-title">${esc(r.side || '')}</div>
  </div>`).join('');
}

async function renderClientProfile() {
  const root = $('client-profile-root');
  const client = clientById(selectedClientId);
  if (!root || !client) { if (root) root.innerHTML = emptyState('Client not found'); return; }
  root.innerHTML = skelClientProfile();
  const [quotesRes, invoicesRes, retRes, bookingsRichRes] = await Promise.all([
    financeSchemaReady ? sb.from('quotes').select('*').eq('client_id', client.id).order('created_at', { ascending: false }).limit(8) : Promise.resolve({ data: [], error: null }),
    financeSchemaReady ? sb.from('invoices').select('*').eq('client_id', client.id).order('created_at', { ascending: false }).limit(8) : Promise.resolve({ data: [], error: null }),
    financeSchemaReady ? sb.from('retainers').select('*').eq('client_id', client.id).maybeSingle() : Promise.resolve({ data: null, error: null }),
    sb.from('bookings').select('full_name,company,email,status,created_at,service:service_id(name),slot:slot_id(date,start_time)').order('created_at', { ascending: false }).limit(50)
  ]);
  let bookingsRes = bookingsRichRes;
  if (bookingsRichRes.error && isSchemaError(bookingsRichRes.error)) {
    bookingsRes = await sb.from('bookings').select('full_name,company,email,status,created_at').order('created_at', { ascending: false }).limit(50);
  }
  if (quotesRes.error || invoicesRes.error || retRes.error) financeSchemaReady = false;
  const quotes = quotesRes.data || [];
  const invoices = invoicesRes.data || [];
  const retainer = retRes.data;
  const paymentsRes = retainer?.id
    ? await sb.from('retainer_payments').select('*').eq('retainer_id', retainer.id).order('created_at', { ascending: false }).limit(8)
    : { data: [] };
  if (paymentsRes.error) financeSchemaReady = false;
  const clientProjects = allProjects.filter(p => p.client_id === client.id);
  const clientServices = [...new Set([...quotes.map(q => q.service_name), ...invoices.map(i => i.service_name)].filter(Boolean))];
  const bookings = (bookingsRes.data || []).filter(b =>
    [b.email, b.company, b.full_name].some(v => v && [client.email, client.company_email, client.company, client.full_name].includes(v))
  ).slice(0, 6);
  root.innerHTML = `
    <div class="detail-toolbar">
      <button class="btn-ghost" onclick="switchPage('clients')">Back to Clients</button>
      <div class="profile-actions">
        <button class="btn-ghost" onclick="openClientOnboarding('${client.id}')">Edit Details</button>
        <button class="btn-ghost" onclick="openClientLogoModal('${client.id}')">Logo</button>
        ${financeSchemaReady ? `<button class="btn-add" onclick="openClientDocumentModal('quote','${client.id}')">Generate Quote</button><button class="btn-add" onclick="openClientDocumentModal('invoice','${client.id}')">Generate Invoice</button>` : ''}
        ${proposalSchemaReady ? `<button class="btn-ghost" onclick="openProposalEditor(null,'${client.id}',null)">Generate Proposal</button>` : ''}
        ${proposalSchemaReady ? `<button class="btn-ghost" onclick="openWelcomeLetterModal('${client.id}')">Generate Welcome Letter</button>` : ''}
        <button class="btn-add" onclick="openProjectModal(null,'backlog','${client.id}')">New Task</button>
      </div>
    </div>
    ${financeSchemaReady ? '' : schemaNotice('Finance schema is not installed yet, so quotes, invoices, retainers, and payment history are hidden until migration 003 is applied.')}
    <div class="profile-hero">
      <div class="profile-id">
        ${clientAvatar(client, 'lg')}
        <div>
          <div class="profile-title">${esc(clientDisplayName(client))}</div>
          <div class="profile-sub">${esc(client.industry || 'Industry not set')} · ${esc(client.client_status || 'Active')} · ${esc(client.selected_plan || client.project_type || 'No plan assigned')}</div>
        </div>
      </div>
      <span class="badge badge-confirmed">${esc(client.client_status || 'Active')}</span>
    </div>
    <div class="profile-grid">
      <div class="profile-sections">
        <div class="mini-panel">
          <div class="mini-panel-head"><span class="mini-panel-title">Company</span></div>
          <div class="mini-panel-body info-list">
            <div class="info-row"><span>Website</span><span>${esc(client.website || 'Not set')}</span></div>
            <div class="info-row"><span>Company Email</span><span>${esc(client.company_email || client.email || 'Not set')}</span></div>
            <div class="info-row"><span>Company Phone</span><span>${esc(client.company_phone || client.phone || 'Not set')}</span></div>
            <div class="info-row address-row"><span>Address</span><span>${clientAddressHTML(client)}</span></div>
            <div class="info-row"><span>Start Date</span><span>${compactDate(client.project_start_date)}</span></div>
          </div>
        </div>
        <div class="mini-panel">
          <div class="mini-panel-head"><span class="mini-panel-title">Primary Contact</span></div>
          <div class="mini-panel-body info-list">
            <div class="info-row"><span>Name</span><span>${esc(client.full_name || 'Not set')}</span></div>
            <div class="info-row"><span>Role</span><span>${esc(client.position || 'Not set')}</span></div>
            <div class="info-row"><span>Email</span><span>${esc(client.email || 'Not set')}</span></div>
            <div class="info-row"><span>Phone</span><span>${esc(client.phone || 'Not set')}</span></div>
            <div class="info-row"><span>Notes</span><span>${esc(client.notes || client.brief || 'No notes')}</span></div>
          </div>
        </div>
        <div class="mini-panel">
          <div class="mini-panel-head"><span class="mini-panel-title">Retainer</span><button class="act-btn" onclick="openRetainerModal('${client.id}')">Payment History</button></div>
          <div class="mini-panel-body info-list">
            <div class="info-row"><span>Plan</span><span>${esc(retainer?.assigned_plan || client.selected_plan || 'Not set')}</span></div>
            <div class="info-row"><span>Monthly Retainer</span><span>${money(retainer?.monthly_retainer)}</span></div>
            <div class="info-row"><span>Billing Day</span><span>${esc(retainer?.billing_day || 'Not set')}</span></div>
            <div class="info-row"><span>Next Payment</span><span>${compactDate(retainer?.next_payment_date)}</span></div>
            <div class="info-row"><span>Status</span><span>${esc(retainer?.payment_status || 'Pending')}</span></div>
          </div>
        </div>
      </div>
      <div class="activity-grid">
        <div class="mini-panel"><div class="mini-panel-head"><span class="mini-panel-title">Projects & Tasks</span><button class="act-btn" onclick="switchPage('projects')">View Board</button></div><div class="mini-panel-body linked-list">${linkedRows(clientProjects.map(p => ({ title:p.title, meta:`${p.status || 'backlog'} · ${p.priority || 'Medium'}`, side:p.due_date ? compactDate(p.due_date) : '' })), 'No linked projects yet.')}</div></div>
        <div class="mini-panel"><div class="mini-panel-head"><span class="mini-panel-title">Services</span></div><div class="mini-panel-body linked-list">${linkedRows(clientServices.map(s => ({ title:s, meta:'Linked through quote or invoice', side:'' })), 'No linked services yet.')}</div></div>
        <div class="mini-panel"><div class="mini-panel-head"><span class="mini-panel-title">Quotes</span></div><div class="mini-panel-body linked-list">${linkedRows(quotes.map(q => ({ title:q.quote_number, meta:q.service_name || 'Service', side:money(q.total_amount) })), financeSchemaReady ? 'No quotes yet.' : 'Finance schema unavailable.')}</div></div>
        <div class="mini-panel"><div class="mini-panel-head"><span class="mini-panel-title">Invoices</span></div><div class="mini-panel-body linked-list">${linkedRows(invoices.map(i => ({ title:i.invoice_number, meta:i.payment_status || 'Draft', side:money(i.total_amount) })), 'No invoices yet.')}</div></div>
        ${proposalSchemaReady ? `
<div class="mini-panel">
  <div class="mini-panel-head"><span class="mini-panel-title">Proposals</span><span class="badge badge-pending">${allProposals.filter(p => p.client_id === client.id).length}</span></div>
  <div class="mini-panel-body doc-list">
    ${allProposals.filter(p => p.client_id === client.id).slice(0,5).map(p => `
      <div class="doc-row" style="cursor:pointer" onclick="openProposalEditor('${p.id}',null,null)">
        <div><div class="doc-title">${esc(p.proposal_number)}</div><div class="doc-meta">${esc(p.title||'Untitled')} · ${esc(compactDate(p.proposal_date))}</div></div>
        <span class="badge ${p.status==='Approved'?'badge-confirmed':p.status==='Rejected'?'badge-declined':p.status==='Sent'?'badge-pending':''}">${esc(p.status)}</span>
      </div>`).join('') || '<p class="td-dim">No proposals yet.</p>'}
    ${allProposals.filter(p => p.client_id === client.id).length > 0 ? `<div style="margin-top:.5rem"><button class="btn-ghost btn-sm" onclick="docFilter='Proposal';switchPage('documents');renderDocumentsTable()">View all documents →</button></div>` : ''}
  </div>
</div>` : ''}
        <div class="mini-panel"><div class="mini-panel-head"><span class="mini-panel-title">Payments</span></div><div class="mini-panel-body linked-list">${linkedRows((paymentsRes.data || []).map(p => ({ title:p.month, meta:p.invoice_number || 'Retainer payment', side:money(p.amount) })), 'No payment history yet.')}</div></div>
        <div class="mini-panel"><div class="mini-panel-head"><span class="mini-panel-title">Bookings</span></div><div class="mini-panel-body linked-list">${linkedRows(bookings.map(b => ({ title:b.service?.name || 'Consultation', meta:b.slot?.date ? compactDate(b.slot.date) : compactDate(b.created_at?.split('T')[0]), side:b.status || '' })), 'No consultations found.')}</div></div>
      </div>
    </div>
  `;
}

function openClientLogoModal(clientId) {
  const client = clientById(clientId) || {};
  showModal(`
    <div class="modal-hdr">
      <span class="modal-title">Client Logo</span>
      <button class="modal-close" onclick="closeModal()">×</button>
    </div>
    <div class="modal-body">
      <div class="modal-field full" style="align-items:center">${clientAvatar(client, 'lg')}</div>
      <div class="modal-field full"><label>Upload Company Logo</label><input id="client-logo-file" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml"></div>
      <div class="modal-field full"><label>Storage Note</label><input readonly value="Uses Supabase Storage bucket: client-logos"></div>
    </div>
    <div class="modal-foot">
      <button class="btn-danger" onclick="removeClientLogo('${clientId}')">Remove Logo</button>
      <div class="modal-foot-right">
        <button class="btn-ghost" onclick="closeModal()">Cancel</button>
        <button class="btn-add" onclick="uploadClientLogo('${clientId}')">Save Logo</button>
      </div>
    </div>
  `);
}

async function uploadClientLogo(clientId) {
  const input = $('client-logo-file');
  const file = input?.files?.[0];
  if (!file) { toast('Choose a logo file first.'); return; }
  const ext = file.name.split('.').pop() || 'png';
  const path = `${clientId}/${Date.now()}.${ext}`;
  const { error: uploadError } = await sb.storage.from('client-logos').upload(path, file, { upsert: true });
  if (uploadError) { toast('Logo upload failed. Create the client-logos storage bucket first.'); return; }
  const { data } = sb.storage.from('client-logos').getPublicUrl(path);
  const { error } = await sb.from('clients').update({ logo_url: data.publicUrl }).eq('id', clientId);
  if (error) { toast('Logo uploaded, but client record needs migration 004.'); return; }
  closeModal();
  toast('Client logo updated.');
  await Promise.all([loadClients(), loadProjects()]);
  selectedClientId = clientId;
  await renderClientProfile();
}

async function removeClientLogo(clientId) {
  const { error } = await sb.from('clients').update({ logo_url: null }).eq('id', clientId);
  if (error) { toast('Could not remove logo. Apply migration 004 first.'); return; }
  closeModal();
  toast('Client logo removed.');
  await Promise.all([loadClients(), loadProjects()]);
  selectedClientId = clientId;
  await renderClientProfile();
}

async function openRetainerModal(clientId) {
  if (!financeSchemaReady) {
    toast('Apply migration 003 to enable retainers and payment history.');
    return;
  }
  const client = clientById(clientId) || {};
  const { data: retainer, error: retainerError } = await sb.from('retainers').select('*').eq('client_id', clientId).maybeSingle();
  if (retainerError && isSchemaError(retainerError)) {
    financeSchemaReady = false;
    toast('Apply migration 003 to enable retainers and payment history.');
    return;
  }
  const { data: payments, error: paymentsError } = retainer?.id
    ? await sb.from('retainer_payments').select('*').eq('retainer_id', retainer.id).order('created_at', { ascending: false }).limit(12)
    : { data: [], error: null };
  if (paymentsError && isSchemaError(paymentsError)) {
    financeSchemaReady = false;
    toast('Apply migration 003 to enable payment history.');
    return;
  }
  const status = retainer?.payment_status || 'Pending';
  const historyRows = (payments || []).map(p => `<tr>
    <td>${esc(p.month || 'â€”')}</td>
    <td>${esc(p.invoice_number || 'â€”')}</td>
    <td>${money(p.amount)}</td>
    <td>${compactDate(p.payment_date)}</td>
    <td><span class="badge ${p.payment_status === 'Paid' ? 'badge-confirmed' : p.payment_status === 'Overdue' || p.payment_status === 'Failed' ? 'badge-declined' : 'badge-pending'}">${esc(p.payment_status || 'Pending')}</span></td>
  </tr>`).join('');
  showModal(`
    <div class="modal-hdr">
      <span class="modal-title">Client Retainer</span>
      <button class="modal-close" onclick="closeModal()">×</button>
    </div>
    <div class="modal-body">
      <div class="modal-field full" style="align-items:center">${clientAvatar(client, 'lg')}</div>
      <div class="modal-field full"><label>Client</label><input readonly value="${esc(client.company || client.full_name || 'Client')}"></div>
      <div class="modal-field"><label>Assigned Plan</label><input id="rt-plan" value="${esc(retainer?.assigned_plan || client.selected_plan || client.project_type || '')}"></div>
      <div class="modal-field"><label>Monthly Retainer (R)</label><input id="rt-amount" type="number" min="0" step="1" value="${Number(retainer?.monthly_retainer) || 0}"></div>
      <div class="modal-field"><label>Billing Day</label><input id="rt-billing-day" type="number" min="1" max="31" value="${retainer?.billing_day || 1}"></div>
      <div class="modal-field"><label>Last Payment Date</label><input id="rt-last" type="date" value="${esc(retainer?.last_payment_date)}"></div>
      <div class="modal-field"><label>Next Payment Date</label><input id="rt-next" type="date" value="${esc(retainer?.next_payment_date || todayStr())}"></div>
      <div class="modal-field"><label>Payment Status</label><select id="rt-status">${PAYMENT_STATUSES.map(s => `<option value="${s}"${status === s ? ' selected' : ''}>${s}</option>`).join('')}</select></div>
      <hr class="modal-divider">
      <div class="modal-field full">
        <label>Payment History</label>
        <div style="overflow:auto;border:1px solid var(--border)">
          <table class="history-table">
            <thead><tr><th>Month</th><th>Invoice</th><th>Amount</th><th>Payment Date</th><th>Status</th></tr></thead>
            <tbody>${historyRows || '<tr><td colspan="5" class="td-dim">No payment history yet.</td></tr>'}</tbody>
          </table>
        </div>
      </div>
    </div>
    <div class="modal-foot">
      <button class="btn-ghost" onclick="closeModal()">Cancel</button>
      <div class="modal-foot-right">
        <button class="btn-add" onclick="saveRetainer('${clientId}','${retainer?.id || ''}')">Save Retainer</button>
      </div>
    </div>
  `);
  $('modal-box').classList.add('wide');
}

async function saveRetainer(clientId, retainerId = '') {
  const saveBtn = document.querySelector('#modal-box .btn-add');
  btnLoad(saveBtn, true, 'Saving…');
  const payload = {
    client_id: clientId,
    assigned_plan: $('rt-plan').value.trim() || null,
    monthly_retainer: Math.max(0, parseInt($('rt-amount').value) || 0),
    billing_day: Math.min(31, Math.max(1, parseInt($('rt-billing-day').value) || 1)),
    last_payment_date: $('rt-last').value || null,
    next_payment_date: $('rt-next').value || null,
    payment_status: $('rt-status').value
  };
  const query = retainerId
    ? sb.from('retainers').update(payload).eq('id', retainerId)
    : sb.from('retainers').insert(payload);
  const { error } = await query;
  if (error) {
    if (isSchemaError(error)) financeSchemaReady = false;
    btnLoad(saveBtn, false);
    toast('Error saving retainer. Apply migration 003 first.');
    return;
  }
  closeModal();
  toast('Retainer saved.');
  await loadRetainerOverview();
}

async function deleteClient(id) {
  const client = clientById(id) || {};
  const confirmed = await opsDeleteConfirm({
    title: 'Delete Client?',
    message: 'This client record will be permanently removed from OPS Command Center.',
    meta: `${clientDisplayName(client)} · Linked projects will remain but lose their client reference.`,
    confirmText: 'Delete Client'
  });
  if (!confirmed) return;
  const { error } = await sb.from('clients').delete().eq('id', id);
  if (error) { toast('Error deleting client.'); return; }
  toast('Client deleted.');
  await Promise.all([loadClients(), loadStats(), loadRecentActivity(), loadProjects()]);
}

document.querySelectorAll('.f-tab[data-appfilter]').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.f-tab[data-appfilter]').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    applicationFilter = tab.dataset.appfilter;
    renderApplications();
  });
});

$('application-search').addEventListener('input', e => {
  applicationSearch = e.target.value.trim();
  renderApplications();
});

