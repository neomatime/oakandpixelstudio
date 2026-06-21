
let _currentProposalId = null;
let _proposalBackContext = null;
let _proposalClientMode = 'existing';
let _proposalNewClientId = null;

function initProposalBlueprintSelect() {
  const sel = $('pe-blueprint-select');
  if (!sel || typeof PROPOSAL_BLUEPRINT_GROUPS === 'undefined') return;
  sel.innerHTML = '<option value="">— select a blueprint —</option>';
  PROPOSAL_BLUEPRINT_GROUPS.forEach(group => {
    const og = document.createElement('optgroup');
    og.label = group.label;
    group.keys.forEach(key => {
      const bp = PROPOSAL_BLUEPRINTS[key];
      if (!bp) return;
      const opt = document.createElement('option');
      opt.value = key; opt.textContent = bp.label;
      og.appendChild(opt);
    });
    sel.appendChild(og);
  });
}

function loadProposalBlueprint(key) {
  if (!key || typeof PROPOSAL_BLUEPRINTS === 'undefined') return;
  const bp = PROPOSAL_BLUEPRINTS[key];
  if (!bp) return;
  if ($('pe-summary'))    $('pe-summary').value    = bp.summary;
  if ($('pe-challenges')) $('pe-challenges').value = bp.challenges;
  if ($('pe-solution'))   $('pe-solution').value   = bp.solution;
  if ($('pe-deliverables')) $('pe-deliverables').value = bp.deliverables;
  if ($('pe-timeline'))   $('pe-timeline').value   = bp.timeline;
  if ($('pe-next-steps')) $('pe-next-steps').value = bp.next_steps;
  toast(`Blueprint loaded: ${bp.label}`);
}

function openProposalEditor(proposalId, clientId, serviceId) {
  _currentProposalId = proposalId || null;
  _proposalNewClientId = null;
  _proposalBackContext = clientId ? { type:'client', id:clientId } : { type:'documents' };
  const proposal = proposalId ? allProposals.find(p => p.id === proposalId) : null;
  switchPage('proposal-editor');
  initProposalBlueprintSelect();
  if ($('pe-blueprint-select')) $('pe-blueprint-select').value = '';
  const dateVal = proposal ? proposal.proposal_date : todayStr();
  const expiryVal = proposal ? (proposal.expiry_date || '') : addDays(todayStr(), 30);
  if ($('pe-date')) $('pe-date').value = dateVal;
  if ($('pe-expiry')) $('pe-expiry').value = expiryVal;
  const clientSel = $('pe-client');
  if (clientSel) { clientSel.innerHTML = '<option value="">— Select Client —</option>' + allClients.map(c => `<option value="${c.id}">${esc(c.company || c.full_name || 'Unnamed')}</option>`).join(''); }
  const svcSel = $('pe-service');
  if (svcSel) { svcSel.innerHTML = '<option value="">— Select Service —</option>' + allServices.map(s => `<option value="${s.id}">${esc(s.name)}</option>`).join(''); }
  if (proposal) {
    setProposalClientMode('existing');
    $('pe-summary').value = proposal.executive_summary || '';
    $('pe-challenges').value = proposal.challenges || '';
    $('pe-solution').value = proposal.solution || '';
    $('pe-deliverables').value = proposal.deliverables || '';
    $('pe-timeline').value = proposal.timeline || '';
    $('pe-investment').value = proposal.investment || '';
    $('pe-next-steps').value = proposal.next_steps || '';
    $('pe-setup').value = proposal.setup_fee || 0;
    $('pe-retainer').value = proposal.monthly_retainer || 0;
    $('pe-title').value = proposal.title || '';
    if ($('pe-status')) $('pe-status').value = proposal.status || 'Draft';
    if ($('pe-client') && proposal.client_id) $('pe-client').value = proposal.client_id;
    if ($('pe-service') && proposal.service_id) $('pe-service').value = proposal.service_id;
    const showSOW = proposal.status === 'Approved';
    if ($('pe-gen-sow-btn')) $('pe-gen-sow-btn').style.display = showSOW ? '' : 'none';
  } else {
    setProposalClientMode('existing');
    ['pe-summary','pe-challenges','pe-solution','pe-deliverables','pe-timeline','pe-investment','pe-next-steps','pe-title'].forEach(id => { if ($(id)) $(id).value = ''; });
    ['pe-new-company','pe-new-contact','pe-new-email','pe-new-phone'].forEach(id => { if ($(id)) $(id).value = ''; });
    if ($('pe-setup')) $('pe-setup').value = 0;
    if ($('pe-retainer')) $('pe-retainer').value = 0;
    if ($('pe-status')) $('pe-status').value = 'Draft';
    if ($('pe-gen-sow-btn')) $('pe-gen-sow-btn').style.display = 'none';
    if (clientId && $('pe-client')) $('pe-client').value = clientId;
    if (serviceId && $('pe-service')) { $('pe-service').value = serviceId; syncProposalPricing(); }
  }
  updateProposalTotal();
  const backBtn = $('proposal-back-btn');
  if (backBtn) {
    if (clientId) {
      const client = allClients.find(c => c.id === clientId) || {};
      backBtn.textContent = `← Back to ${clientDisplayName(client) || 'Client'}`;
    } else {
      backBtn.textContent = '← Back to Documents';
    }
  }
}

function proposalGoBack() {
  if (_proposalBackContext?.type === 'client') {
    selectedClientId = _proposalBackContext.id;
    switchPage('client-profile');
    renderClientProfile();
  } else {
    switchPage('documents');
    renderDocumentsTable();
  }
}

function updateProposalTotal() {
  const setup = Math.max(0, parseInt($('pe-setup')?.value) || 0);
  const ret = Math.max(0, parseInt($('pe-retainer')?.value) || 0);
  if ($('pe-total')) $('pe-total').textContent = `Total: ${money(setup + ret)}`;
}

function syncProposalPricing() {
  const serviceId = $('pe-service')?.value;
  if (!serviceId) return;
  const service = allServices.find(s => s.id === serviceId);
  if (!service) return;
  if ($('pe-setup')) $('pe-setup').value = service.setup_fee || 0;
  if ($('pe-retainer')) $('pe-retainer').value = service.monthly_retainer || 0;
  updateProposalTotal();
}

function syncProposalService() {}

function setProposalClientMode(mode) {
  _proposalClientMode = mode === 'new' ? 'new' : 'existing';
  $('pe-client-mode-existing')?.classList.toggle('active', _proposalClientMode === 'existing');
  $('pe-client-mode-new')?.classList.toggle('active', _proposalClientMode === 'new');
  const existingField = $('pe-client')?.closest('.modal-field');
  if (existingField) existingField.style.display = _proposalClientMode === 'existing' ? '' : 'none';
  const newClientPanel = $('pe-new-client-panel');
  if (newClientPanel) {
    const showNewClient = _proposalClientMode === 'new';
    newClientPanel.classList.toggle('active', showNewClient);
    newClientPanel.hidden = !showNewClient;
    newClientPanel.setAttribute('aria-hidden', String(!showNewClient));
  }
}

async function saveProposalClientFromEntry() {
  const company = $('pe-new-company')?.value.trim();
  const fullName = $('pe-new-contact')?.value.trim();
  const email = $('pe-new-email')?.value.trim();
  const phone = $('pe-new-phone')?.value.trim();
  if (!company || !fullName || !email) {
    toast('Company, primary contact, and email are required for a new client.');
    return null;
  }
  const serviceId = $('pe-service')?.value;
  const service = allServices.find(s => s.id === serviceId);
  const payload = {
    company,
    full_name: fullName,
    email,
    phone: phone || null,
    company_email: email,
    company_phone: phone || null,
    selected_plan: service?.name || null,
    project_type: service?.name || null,
    client_status: 'Pending',
    project_start_date: todayStr(),
    notes: 'Created from proposal editor.',
    brief: 'Created from proposal editor.'
  };
  const query = _proposalNewClientId
    ? sb.from('clients').update(payload).eq('id', _proposalNewClientId).select().single()
    : sb.from('clients').insert(payload).select().single();
  let { data, error } = await query;
  if (error) {
    const fallback = { ...payload };
    delete fallback.client_status;
    const retry = _proposalNewClientId
      ? sb.from('clients').update(fallback).eq('id', _proposalNewClientId).select().single()
      : sb.from('clients').insert(fallback).select().single();
    ({ data, error } = await retry);
  }
  if (error) {
    toast('Error creating client. Apply the client schema migration first.');
    return null;
  }
  _proposalNewClientId = data.id;
  await loadClients();
  const clientSel = $('pe-client');
  if (clientSel && ![...clientSel.options].some(opt => opt.value === data.id)) {
    clientSel.insertAdjacentHTML('beforeend', `<option value="${data.id}">${esc(clientDisplayName(data))}</option>`);
  }
  if (clientSel) clientSel.value = data.id;
  return data.id;
}

async function saveProposal(redirect) {
  const title = $('pe-title')?.value.trim();
  if (!title) { toast('Add a title first.'); return; }
  const clientId = _proposalClientMode === 'new' ? await saveProposalClientFromEntry() : $('pe-client')?.value;
  if (!clientId) { toast(_proposalClientMode === 'new' ? 'Complete the new client entry first.' : 'Select a client.'); return; }
  const setup = Math.max(0, parseInt($('pe-setup')?.value) || 0);
  const ret = Math.max(0, parseInt($('pe-retainer')?.value) || 0);
  const payload = {
    title,
    client_id: clientId,
    service_id: $('pe-service')?.value || null,
    status: $('pe-status')?.value || 'Draft',
    proposal_date: $('pe-date')?.value || todayStr(),
    expiry_date: $('pe-expiry')?.value || null,
    executive_summary: $('pe-summary')?.value || null,
    challenges: $('pe-challenges')?.value || null,
    solution: $('pe-solution')?.value || null,
    deliverables: $('pe-deliverables')?.value || null,
    timeline: $('pe-timeline')?.value || null,
    investment: $('pe-investment')?.value || null,
    next_steps: $('pe-next-steps')?.value || null,
    setup_fee: setup,
    monthly_retainer: ret,
    total_amount: setup + ret
  };
  let error;
  if (_currentProposalId) {
    ({ error } = await sb.from('proposals').update(payload).eq('id', _currentProposalId));
  } else {
    payload.proposal_number = docNumber('PROP');
    const res = await sb.from('proposals').insert(payload).select().single();
    error = res.error;
    if (!error) _currentProposalId = res.data.id;
  }
  if (error) { toast('Error saving proposal.'); console.error(error); return; }
  toast('Proposal saved.');
  const showSOW = payload.status === 'Approved';
  if ($('pe-gen-sow-btn')) $('pe-gen-sow-btn').style.display = showSOW ? '' : 'none';
  await loadProposals();
  renderBreadcrumbs('proposal-editor');
}

async function downloadProposalPDF() {
  await saveProposal(false);
  const proposal = allProposals.find(p => p.id === _currentProposalId);
  if (!proposal) return;
  const client = allClients.find(c => c.id === proposal.client_id) || {};
  await generatePDF(proposalTemplate(proposal, client), `${proposal.proposal_number}.pdf`);
}

let _currentScopeId = null;
let _currentScopeProposalId = null;
let _sowClientMode = 'existing';

function initSOWClientSelect() {
  const sel = $('sow-client');
  if (!sel) return;
  sel.innerHTML = '<option value="">— Select Client —</option>' + allClients.map(c => `<option value="${c.id}">${esc(c.company || c.full_name || 'Unnamed')}</option>`).join('');
}

function setSOWClientMode(mode) {
  _sowClientMode = mode === 'new' ? 'new' : 'existing';
  $('sow-client-mode-existing')?.classList.toggle('active', _sowClientMode === 'existing');
  $('sow-client-mode-new')?.classList.toggle('active', _sowClientMode === 'new');
  const existingField = $('sow-client-existing-field');
  if (existingField) existingField.style.display = _sowClientMode === 'existing' ? '' : 'none';
  const newPanel = $('sow-new-client-panel');
  if (newPanel) { newPanel.hidden = _sowClientMode !== 'new'; newPanel.classList.toggle('active', _sowClientMode === 'new'); }
}

async function saveSOWNewClient() {
  const company = $('sow-new-company')?.value.trim();
  const fullName = $('sow-new-contact')?.value.trim();
  const email = $('sow-new-email')?.value.trim();
  if (!company || !fullName || !email) { toast('Company, primary contact, and email are required.'); return false; }
  const { data, error } = await sb.from('clients').insert({ company, full_name: fullName, email, company_email: email, client_status: 'Pending', project_start_date: todayStr(), notes: 'Created from SOW editor.' }).select().single();
  if (error) { toast('Error creating client.'); return false; }
  await loadClients();
  return data.id;
}

function initSOWBlueprintSelect() {
  const sel = $('sow-blueprint-select');
  if (!sel || typeof SOW_BLUEPRINT_GROUPS === 'undefined') return;
  sel.innerHTML = '<option value="">— select a blueprint —</option>';
  SOW_BLUEPRINT_GROUPS.forEach(group => {
    const og = document.createElement('optgroup');
    og.label = group.label;
    group.keys.forEach(key => {
      const bp = SOW_BLUEPRINTS[key];
      if (!bp) return;
      const opt = document.createElement('option');
      opt.value = key;
      opt.textContent = bp.label;
      og.appendChild(opt);
    });
    sel.appendChild(og);
  });
}

function loadSOWBlueprint(key) {
  if (!key || typeof SOW_BLUEPRINTS === 'undefined') return;
  const bp = SOW_BLUEPRINTS[key];
  if (!bp) return;
  if ($('sow-title') && !$('sow-title').value) $('sow-title').value = bp.title;
  if ($('sow-deliverables')) $('sow-deliverables').value = bp.deliverables;
  if ($('sow-milestones'))   $('sow-milestones').value   = bp.milestones;
  if ($('sow-timeline'))     $('sow-timeline').value     = bp.timeline;
  if ($('sow-responsibilities')) $('sow-responsibilities').value = bp.responsibilities;
  if ($('sow-assumptions'))  $('sow-assumptions').value  = bp.assumptions;
  if ($('sow-exclusions'))   $('sow-exclusions').value   = bp.exclusions;
  toast(`Blueprint loaded: ${bp.label}`);
}

function openSOWEditor(scopeId, proposalId) {
  _currentScopeId = scopeId || null;
  _currentScopeProposalId = proposalId || null;
  switchPage('sow-editor');
  initSOWBlueprintSelect();
  if ($('sow-blueprint-select')) $('sow-blueprint-select').value = '';
  if ($('sow-date')) $('sow-date').value = todayStr();
  const scope = scopeId ? allScopes.find(s => s.id === scopeId) : null;
  const effectiveProposalId = (scope && scope.proposal_id) ? scope.proposal_id : proposalId;
  const proposal = effectiveProposalId ? allProposals.find(p => p.id === effectiveProposalId) : null;
  const client = proposal ? clientById(proposal.client_id) || {} : (scope?.client_id ? clientById(scope.client_id) || {} : {});
  const linked = $('sow-linked-proposal');
  if (linked) linked.textContent = proposal ? `Linked Proposal: ${proposal.proposal_number}` : '';
  const backBtn = $('sow-back-btn');
  if (backBtn) backBtn.textContent = proposal ? `← Back to Proposal ${proposal.proposal_number}` : '← Back';
  // Client selector — only visible for standalone SOWs (no linked proposal)
  initSOWClientSelect();
  _sowClientMode = 'existing';
  setSOWClientMode('existing');
  if ($('sow-new-company')) $('sow-new-company').value = '';
  if ($('sow-new-contact')) $('sow-new-contact').value = '';
  if ($('sow-new-email'))   $('sow-new-email').value   = '';
  const clientSection = $('sow-client-section');
  if (clientSection) clientSection.style.display = proposal ? 'none' : '';
  const existingClientId = scope?.client_id || null;
  if (existingClientId && $('sow-client')) $('sow-client').value = existingClientId;
  if (scope) {
    $('sow-title').value = scope.title || '';
    $('sow-deliverables').value = scope.deliverables || proposal?.deliverables || '';
    $('sow-milestones').value = scope.milestones || defaultSowMilestones();
    $('sow-timeline').value = scope.timeline || proposal?.timeline || defaultSowTimeline();
    $('sow-responsibilities').value = scope.responsibilities || defaultSowResponsibilities();
    $('sow-assumptions').value = scope.assumptions || defaultSowAssumptions();
    $('sow-exclusions').value = scope.exclusions || defaultSowExclusions();
    if ($('sow-status')) $('sow-status').value = scope.status || 'Draft';
    if ($('sow-date')) $('sow-date').value = scope.scope_date || todayStr();
    _currentScopeProposalId = effectiveProposalId;
  } else if (proposal) {
    $('sow-title').value = proposal.title ? `SOW - ${proposal.title}` : `Scope of Work - ${clientDisplayName(client)}`;
    $('sow-deliverables').value = proposal.deliverables || `Approved deliverables for ${clientDisplayName(client)} under the ${clientPlanName(client)} engagement. Final delivery is limited to the approved proposal, this SOW, and any accepted written change request.`;
    $('sow-milestones').value = defaultSowMilestones();
    $('sow-timeline').value = proposal.timeline || defaultSowTimeline();
    $('sow-responsibilities').value = defaultSowResponsibilities();
    $('sow-assumptions').value = defaultSowAssumptions();
    $('sow-exclusions').value = defaultSowExclusions();
    if ($('sow-status')) $('sow-status').value = 'Draft';
  } else {
    ['sow-title','sow-deliverables','sow-milestones','sow-timeline','sow-responsibilities','sow-assumptions','sow-exclusions'].forEach(id => { if ($(id)) $(id).value = ''; });
    if ($('sow-status')) $('sow-status').value = 'Draft';
  }
}

function sowGoBack() {
  if (_currentScopeProposalId) {
    openProposalEditor(_currentScopeProposalId, null, null);
  } else {
    switchPage('documents');
    renderDocumentsTable();
  }
}

async function saveScope() {
  const title = $('sow-title')?.value.trim();
  if (!title) { toast('Add a title first.'); return; }
  const existingScope = _currentScopeId ? allScopes.find(s => s.id === _currentScopeId) : null;
  const linkedProposal = _currentScopeProposalId ? allProposals.find(p => p.id === _currentScopeProposalId) : null;
  let clientId;
  if (linkedProposal) {
    clientId = linkedProposal.client_id || existingScope?.client_id || null;
  } else if (_sowClientMode === 'new') {
    const newId = await saveSOWNewClient();
    if (newId === false) return;
    clientId = newId;
  } else {
    clientId = $('sow-client')?.value || existingScope?.client_id || null;
  }
  const payload = {
    title,
    proposal_id: _currentScopeProposalId || null,
    client_id: clientId,
    service_id: linkedProposal?.service_id || existingScope?.service_id || null,
    status: $('sow-status')?.value || 'Draft',
    scope_date: $('sow-date')?.value || todayStr(),
    deliverables: $('sow-deliverables')?.value || null,
    milestones: $('sow-milestones')?.value || null,
    timeline: $('sow-timeline')?.value || null,
    responsibilities: $('sow-responsibilities')?.value || null,
    assumptions: $('sow-assumptions')?.value || null,
    exclusions: $('sow-exclusions')?.value || null,
  };
  let error;
  if (_currentScopeId) {
    ({ error } = await sb.from('scopes').update(payload).eq('id', _currentScopeId));
  } else {
    payload.scope_number = docNumber('SOW');
    const res = await sb.from('scopes').insert(payload).select().single();
    error = res.error;
    if (!error) _currentScopeId = res.data.id;
  }
  if (error) { toast('Error saving SOW.'); console.error(error); return; }
  toast('SOW saved.');
  await loadScopes();
  renderBreadcrumbs('sow-editor');
}

async function downloadSOWPDF() {
  await saveScope();
  const scope = allScopes.find(s => s.id === _currentScopeId);
  if (!scope) return;
  const proposal = scope.proposal_id ? allProposals.find(p => p.id === scope.proposal_id) : null;
  const client = (proposal ? allClients.find(c => c.id === proposal.client_id) : allClients.find(c => c.id === scope.client_id)) || {};
  await generatePDF(sowTemplate(scope, client, proposal), `${scope.scope_number}.pdf`);
}

function openSOWEditorFromProposal() {
  if (!_currentProposalId) return;
  openSOWEditor(null, _currentProposalId);
}

function openWelcomeLetterModal(clientId) {
  if (!proposalSchemaReady) { toast('Apply migration 007 to enable welcome letters.'); return; }
  const client = clientById(clientId) || {};
  const assignedServices = [
    ...allQuotes.filter(q => q.client_id === clientId).map(q => q.service_name),
    ...allInvoices.filter(i => i.client_id === clientId).map(i => i.service_name)
  ].filter((s,i,a) => s && a.indexOf(s) === i);
  const greeting = defaultWelcomeMessage(client);
  const defaultInfo = defaultWelcomeInfo();
  showModal(`
    <div class="modal-hdr">
      <span class="modal-title">Generate Welcome Letter</span>
      <button class="modal-close" onclick="closeModal()">×</button>
    </div>
    <div class="modal-body">
      <div class="modal-field full" style="align-items:center">${clientAvatar(client, 'lg')}</div>
      <div class="modal-field full"><label>Client</label><input readonly value="${esc(clientDisplayName(client))}"></div>
      <div class="modal-field full"><label>Plan</label><input readonly value="${esc(client.selected_plan || '—')}"></div>
      <div class="modal-field full"><label>Start Date</label><input readonly value="${esc(client.project_start_date || '—')}"></div>
      <div class="modal-field full"><label>Assigned Services</label><input readonly value="${esc(assignedServices.join(', ') || 'None yet')}"></div>
      <div class="modal-field full"><label>Welcome Message</label><textarea id="wl-message" rows="5">${esc(greeting)}</textarea></div>
      <div class="modal-field full"><label>Important Information</label><textarea id="wl-info" rows="4">${esc(defaultInfo)}</textarea></div>
    </div>
    <div class="modal-foot">
      <button class="btn-ghost" onclick="closeModal()">Cancel</button>
      <button class="btn-ghost" onclick="saveWelcomeLetter('${clientId}', false)">Save as Draft</button>
      <button class="btn-add" onclick="saveWelcomeLetter('${clientId}', true)">Save &amp; Generate PDF</button>
    </div>
  `);
  $('modal-box').classList.add('wide');
}

async function saveWelcomeLetter(clientId, download) {
  const client = clientById(clientId) || {};
  const assignedServices = [
    ...allQuotes.filter(q => q.client_id === clientId).map(q => q.service_name),
    ...allInvoices.filter(i => i.client_id === clientId).map(i => i.service_name)
  ].filter((s,i,a) => s && a.indexOf(s) === i);
  const payload = {
    letter_number: docNumber('WL'),
    client_id: clientId,
    status: download ? 'Sent' : 'Draft',
    assigned_services: assignedServices,
    welcome_message: $('wl-message')?.value.trim() || null,
    important_info: $('wl-info')?.value.trim() || null,
    sent_at: download ? new Date().toISOString() : null
  };
  const { data, error } = await sb.from('welcome_letters').insert(payload).select().single();
  if (error) { toast('Error saving welcome letter.'); return; }
  closeModal();
  toast('Welcome letter saved.');
  await loadWelcomeLetters();
  if (download) {
    await generatePDF(welcomeLetterTemplate(data, client), `${data.letter_number}.pdf`);
  }
}

const SIGNABLE_TYPES = ['Proposal', 'SOW', 'Agreement'];

function signingStatusFor(r) {
  if (!SIGNABLE_TYPES.includes(r._type)) return null;
  let req;
  if (r._type === 'Proposal')  req = allSigningRequests.find(s => s.proposal_id  === r.id);
  if (r._type === 'SOW')       req = allSigningRequests.find(s => s.scope_id      === r.id);
  if (r._type === 'Agreement') req = allSigningRequests.find(s => s.agreement_kind === r._agreementKind && s.client_id === r.client_id);
  if (!req) return 'not_sent';
  if (req.client_signed_at) return 'signed';
  if (req.token && new Date(req.token_expires_at) > new Date()) return 'awaiting';
  return 'expired';
}

function sigBadge(r) {
  const status = signingStatusFor(r);
  if (!status) return '<td>—</td>';
  if (status === 'signed')   return '<td><span class="badge badge-ok">Signed ✓</span></td>';
  if (status === 'awaiting') return '<td><span class="badge badge-amber">Awaiting</span></td>';
  if (status === 'expired')  return '<td><span class="badge" style="opacity:.5">Expired</span></td>';
  return '<td><span class="badge" style="opacity:.35">Not Sent</span></td>';
}

function buildDocumentList() {
  return [
    ...allQuotes.map(q => ({ ...q, _type:'Quote', _num:q.quote_number, _date:q.quote_date, _status:q.status, _title:q.service_name||'Quote' })),
    ...allInvoices.map(i => ({ ...i, _type:'Invoice', _num:i.invoice_number, _date:i.invoice_date, _status:i.payment_status, _title:i.service_name||'Invoice' })),
    ...allProposals.map(p => ({ ...p, _type:'Proposal', _num:p.proposal_number, _date:p.proposal_date, _status:p.status, _title:p.title||'Proposal' })),
    ...allScopes.map(s => ({ ...s, _type:'SOW', _num:s.scope_number, _date:s.scope_date, _status:s.status, _title:s.title||'Scope of Work' })),
    ...allWelcomeLetters.map(w => ({ ...w, _type:'Welcome Letter', _num:w.letter_number, _date:w.created_at, _status:w.status, _title:'Welcome Letter' })),
    ...allRetainers.map(r => {
      const client = clientById(r.client_id) || {};
      return { ...r, _type:'Retainer Statement', _num:retainerStatementNumber(r), _date:r.next_payment_date || r.created_at, _status:r.payment_status, _title:`${clientDisplayName(client)} Retainer Statement` };
    }),
    ...allProjects.map(p => ({ ...p, _type:'Project Brief', _num:projectBriefNumber(p), _date:p.created_at || p.due_date, _status:PROJECT_COLUMNS.find(([value]) => value === p.status)?.[1] || p.status, _title:p.title||'Project Brief' })),
    ...allProjects.filter(p => (p.status || '').toLowerCase() === 'done').map(p => ({ ...p, _type:'Project Completion Report', _num:projectCompletionNumber(p), _date:p.due_date || p.created_at, _status:'Complete', _title:`${p.title || 'Project'} Completion Report` })),
  ].sort((a,b) => {
    const at = new Date(a._date || 0).getTime();
    const bt = new Date(b._date || 0).getTime();
    return (Number.isFinite(bt) ? bt : 0) - (Number.isFinite(at) ? at : 0);
  });
}

function buildAgreementRows() {
  return allClients.flatMap(client => AGREEMENT_TYPES.map(type => ({
    id: `${type.key}:${client.id}`,
    client_id: client.id,
    _type: 'Agreement',
    _agreementKind: type.key,
    _num: agreementNumber(type.key, client),
    _date: todayStr(),
    _status: 'Template',
    _title: type.label
  })));
}

// ─── Email sending ────────────────────────────────────────────────────────────

let _pendingEmailSend = null;

function buildEmailHTML(docType, clientName, docNumber, customMessage, signingLink = null) {
  const label = { SOW: 'Scope of Work', 'Welcome Letter': 'Welcome Letter' }[docType] || docType;
  const greetingName = esc(clientName || 'Client');
  const msgHtml = customMessage ? `<p style="color:#3a3a35;font-size:.95rem;line-height:1.7;margin:0 0 1.25rem">${customMessage.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/\n/g,'<br>')}</p>` : '';
  const sigSection = signingLink ? `<div style="background:#F7F6F3;border:1px solid #E0DFD8;padding:1.25rem;margin:1.5rem 0;text-align:center"><p style="color:#0A0A09;font-size:.85rem;margin:0 0 .9rem;font-family:Georgia,serif">Please sign this document electronically:</p><a href="${signingLink}" style="background:#1A5C3A;color:#fff;text-decoration:none;padding:.7rem 1.75rem;font-family:Georgia,serif;font-size:.9rem;display:inline-block;letter-spacing:.02em">Sign Document</a><p style="color:#aaa;font-size:.72rem;margin:.75rem 0 0;line-height:1.5">Valid for 30 days. If the button does not work: <span style="color:#B8955A">${signingLink}</span></p></div>` : '';
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"></head><body style="margin:0;padding:0;background:#F0EFEC;font-family:Georgia,serif">
<div style="max-width:580px;margin:2rem auto;background:#ffffff;border:1px solid #E0DFD8">
  <div style="background:#0A0A09;padding:1.25rem 2rem;display:flex;align-items:center;gap:.75rem">
    <img src="https://www.oakandpixel.co.za/images/oak-pixel-mark-hires-transparent.png" alt="Oak &amp; Pixel Studio" style="width:32px;height:32px;object-fit:contain">
    <span style="color:#1A5C3A;font-size:1.3rem;font-family:Georgia,serif;font-weight:bold">Oak &amp; Pixel</span>
    <span style="color:rgba(245,244,241,.25);font-size:1.1rem;margin:0 .1rem">|</span>
    <span style="color:rgba(245,244,241,.45);font-size:.65rem;letter-spacing:.14em;text-transform:uppercase;font-family:monospace">Studio</span>
  </div>
  <div style="padding:2rem 2rem 1.5rem">
    <p style="color:#0A0A09;font-size:1rem;margin:0 0 1.1rem">Dear ${greetingName} Team,</p>
    <p style="color:#3a3a35;font-size:.95rem;line-height:1.7;margin:0 0 1.25rem">
      Please find your <strong>${label}</strong>${docNumber ? ` (${docNumber})` : ''} from Oak &amp; Pixel Studio attached to this email.
    </p>
    ${msgHtml}
    ${sigSection}
    <p style="color:#3a3a35;font-size:.95rem;line-height:1.7;margin:0 0 1.75rem">Should you have any questions, please don't hesitate to reach out.</p>
    <p style="color:#0A0A09;font-size:.93rem;margin:0">Warm regards,</p>
    <p style="color:#0A0A09;font-size:.93rem;font-weight:bold;margin:.2rem 0 .1rem">Neo Matime</p>
    <p style="color:#6b6b64;font-size:.8rem;margin:0">Oak &amp; Pixel Studio</p>
    <a href="mailto:info@oakandpixel.co.za" style="color:#B8955A;font-size:.8rem;text-decoration:none">info@oakandpixel.co.za</a>
  </div>
  <div style="border-top:1px solid #E0DFD8;padding:.7rem 2rem;background:#F9F8F6">
    <p style="color:#9B9B94;font-size:.7rem;margin:0">Oak &amp; Pixel Studio · Digital presence and business systems for service businesses.</p>
  </div>
</div></body></html>`;
}

function showSendEmailModal({ to, subject, message, onSend }) {
  _pendingEmailSend = onSend;
  showModal(`
    <div class="modal-hdr">
      <span class="modal-title">Send via Email</span>
      <button class="modal-close" onclick="closeModal()">×</button>
    </div>
    <div class="modal-body">
      <div class="modal-field full"><label>To</label><input id="send-email-to" type="email" value="${esc(to)}" placeholder="client@email.com"></div>
      <div class="modal-field full"><label>Subject</label><input id="send-email-subject" value="${esc(subject)}"></div>
      <div class="modal-field full"><label>Personal message (optional)</label><textarea id="send-email-message" rows="4" style="resize:vertical" placeholder="Add a personal note…">${esc(message || '')}</textarea></div>
    </div>
    <div class="modal-foot">
      <button class="btn-ghost" onclick="closeModal()">Cancel</button>
      <button class="btn-add" onclick="executePendingEmailSend()">Send Document</button>
    </div>
  `);
}

async function executePendingEmailSend() {
  const to      = $('send-email-to')?.value.trim();
  const subject = $('send-email-subject')?.value.trim();
  const message = $('send-email-message')?.value.trim();
  if (!to)      { toast('Enter a recipient email address.'); return; }
  if (!subject) { toast('Enter a subject line.'); return; }
  closeModal();
  if (_pendingEmailSend) await _pendingEmailSend(to, subject, message);
  _pendingEmailSend = null;
}

async function _dispatchEmail({ templateHTML, filename, docType, clientName, docNumber, to, subject, message, table, docId, statusField, reload, signingLink = null }) {
  toast('Generating PDF…');
  const base64 = await generatePDF(templateHTML, filename, { returnBase64: true });
  if (!base64) { toast('PDF generation failed.'); return; }
  toast('Sending…');
  let res;
  try {
    res = await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to, subject,
        htmlBody: buildEmailHTML(docType, clientName, docNumber, message, signingLink),
        pdfBase64: base64,
        pdfFilename: filename,
      }),
    });
  } catch {
    toast('Network error — email not sent.'); return;
  }
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    toast(e.error || 'Send failed.'); return;
  }
  if (table && docId && statusField) {
    await sb.from(table).update({ [statusField]: 'Sent' }).eq('id', docId);
    if (reload) await reload();
  }
  toast(`Sent to ${to}`);
}

async function requestSignatureForDoc(docType, docId, agreementKind) {
  let doc, client, docNumber, proposalId = null, scopeId = null;

  if (docType === 'Proposal') {
    doc    = allProposals.find(p => p.id === docId);
    client = allClients.find(c => c.id === doc?.client_id) || {};
    docNumber  = doc?.proposal_number || '';
    proposalId = docId;
  } else if (docType === 'SOW') {
    doc    = allScopes.find(s => s.id === docId);
    const prop = doc?.proposal_id ? allProposals.find(p => p.id === doc.proposal_id) : null;
    client = allClients.find(c => c.id === (prop?.client_id || doc?.client_id)) || {};
    docNumber = doc?.scope_number || '';
    scopeId   = docId;
  } else if (docType === 'Agreement') {
    client    = allClients.find(c => c.id === docId) || {};
    docNumber = agreementNumber(agreementKind, client);
  }

  if (!client || !client.id) { toast('Client not found.'); return; }

  const clientEmail = client.email || client.company_email || '';
  if (!clientEmail) { toast('Client has no email address on record.'); return; }

  const existing = allSigningRequests.find(s => {
    if (docType === 'Proposal')  return s.proposal_id   === proposalId;
    if (docType === 'SOW')       return s.scope_id       === scopeId;
    if (docType === 'Agreement') return s.agreement_kind === agreementKind && s.client_id === client.id;
    return false;
  });

  if (existing?.client_signed_at) { toast('This document is already signed.'); return; }

  const isResend = !!(existing?.token);
  const action   = isResend ? 'Resend signing invite' : 'Send signing invite';
  const ok = await opsConfirm({
    title: `${action}?`,
    message: `Send a signing link for ${docType} ${docNumber} to ${clientEmail}.`,
    confirmText: action,
    tone: 'emerald',
  });
  if (!ok) return;

  const opsSignature = getStoredOpsSignature();

  try {
    const res = await fetch('/api/request-signature', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        doc_type:               docType,
        doc_number:             docNumber,
        client_id:              client.id,
        client_email:           clientEmail,
        client_company:         clientDisplayName(client),
        proposal_id:            proposalId,
        scope_id:               scopeId,
        agreement_kind:         docType === 'Agreement' ? agreementKind : null,
        ops_signature_data_url: opsSignature,
        send_email:             true,
      }),
    });
    if (!res.ok) { const e = await res.json().catch(()=>({})); toast(e.error || 'Failed to send signing invite.'); return; }
    toast('Signing invite sent to ' + clientEmail + '.');
    await loadSigningRequests();
    renderDocumentsTable();
  } catch {
    toast('Network error. Please try again.');
  }
}

async function sendProposalEmail(proposalId) {
  const proposal = allProposals.find(p => p.id === proposalId);
  if (!proposal) return;
  const client = allClients.find(c => c.id === proposal.client_id) || {};
  const to     = client.email || client.company_email || '';
  showSendEmailModal({
    to, message: '',
    subject: `Your Proposal from Oak & Pixel Studio — ${proposal.proposal_number}`,
    onSend: async (finalTo, finalSubject, finalMessage) => {
      let signingLink = null;
      try {
        const opsSignature = getStoredOpsSignature();
        const r = await fetch('/api/request-signature', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            doc_type: 'Proposal', doc_number: proposal.proposal_number,
            client_id: proposal.client_id, client_email: finalTo,
            client_company: clientDisplayName(client),
            proposal_id: proposalId,
            ops_signature_data_url: opsSignature,
            send_email: false,
          }),
        });
        const d = await r.json();
        if (d.token) signingLink = `https://oakandpixel.co.za/sign.html?token=${d.token}`;
      } catch {}
      await _dispatchEmail({
        templateHTML: proposalTemplate(proposal, client), filename: `${proposal.proposal_number}.pdf`,
        docType: 'Proposal', clientName: clientDisplayName(client), docNumber: proposal.proposal_number,
        to: finalTo, subject: finalSubject, message: finalMessage,
        table: 'proposals', docId: proposalId, statusField: 'status', reload: loadProposals,
        signingLink,
      });
      await loadSigningRequests();
      renderDocumentsTable();
    },
  });
}

async function sendSOWEmail(scopeId) {
  const scope    = allScopes.find(s => s.id === scopeId);
  if (!scope) return;
  const proposal = scope.proposal_id ? allProposals.find(p => p.id === scope.proposal_id) : null;
  const client   = allClients.find(c => c.id === (proposal?.client_id || scope.client_id)) || {};
  const to       = client.email || client.company_email || '';
  showSendEmailModal({
    to, message: '',
    subject: `Your Scope of Work from Oak & Pixel Studio — ${scope.scope_number}`,
    onSend: async (finalTo, finalSubject, finalMessage) => {
      let signingLink = null;
      try {
        const opsSignature = getStoredOpsSignature();
        const r = await fetch('/api/request-signature', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            doc_type: 'SOW', doc_number: scope.scope_number,
            client_id: client.id, client_email: finalTo,
            client_company: clientDisplayName(client),
            scope_id: scopeId,
            ops_signature_data_url: opsSignature,
            send_email: false,
          }),
        });
        const d = await r.json();
        if (d.token) signingLink = `https://oakandpixel.co.za/sign.html?token=${d.token}`;
      } catch {}
      await _dispatchEmail({
        templateHTML: sowTemplate(scope, client, proposal), filename: `${scope.scope_number}.pdf`,
        docType: 'SOW', clientName: clientDisplayName(client), docNumber: scope.scope_number,
        to: finalTo, subject: finalSubject, message: finalMessage,
        table: 'scopes', docId: scopeId, statusField: 'status', reload: loadScopes,
        signingLink,
      });
      await loadSigningRequests();
      renderDocumentsTable();
    },
  });
}

async function sendQuoteEmail(quoteId) {
  const quote = allQuotes.find(q => q.id === quoteId);
  if (!quote) return;
  const client = allClients.find(c => c.id === quote.client_id) || {};
  const to = client.email || client.company_email || '';
  showSendEmailModal({
    to, message: '',
    subject: `Your Quote from Oak & Pixel Studio — ${quote.quote_number}`,
    onSend: (finalTo, finalSubject, finalMessage) => _dispatchEmail({
      templateHTML: quoteTemplate(quote, client), filename: `${quote.quote_number}.pdf`,
      docType: 'Quote', clientName: clientDisplayName(client), docNumber: quote.quote_number,
      to: finalTo, subject: finalSubject, message: finalMessage,
      table: 'quotes', docId: quoteId, statusField: 'status', reload: loadQuotes,
    }),
  });
}

async function sendInvoiceEmail(invoiceId) {
  const invoice = allInvoices.find(i => i.id === invoiceId);
  if (!invoice) return;
  const client = allClients.find(c => c.id === invoice.client_id) || {};
  const to = client.email || client.company_email || '';
  showSendEmailModal({
    to, message: '',
    subject: `Your Invoice from Oak & Pixel Studio — ${invoice.invoice_number}`,
    onSend: (finalTo, finalSubject, finalMessage) => _dispatchEmail({
      templateHTML: invoiceTemplate(invoice, client), filename: `${invoice.invoice_number}.pdf`,
      docType: 'Invoice', clientName: clientDisplayName(client), docNumber: invoice.invoice_number,
      to: finalTo, subject: finalSubject, message: finalMessage,
      table: 'invoices', docId: invoiceId, statusField: 'payment_status', reload: loadInvoices,
    }),
  });
}

async function sendWelcomeLetterEmail(letterId) {
  const letter = allWelcomeLetters.find(w => w.id === letterId);
  if (!letter) return;
  const client = allClients.find(c => c.id === letter.client_id) || {};
  const to = client.email || client.company_email || '';
  showSendEmailModal({
    to, message: '',
    subject: `Welcome to Oak & Pixel Studio — ${clientDisplayName(client)}`,
    onSend: (finalTo, finalSubject, finalMessage) => _dispatchEmail({
      templateHTML: welcomeLetterTemplate(letter, client), filename: `${letter.letter_number}.pdf`,
      docType: 'Welcome Letter', clientName: clientDisplayName(client), docNumber: letter.letter_number,
      to: finalTo, subject: finalSubject, message: finalMessage,
      table: null, docId: null, statusField: null, reload: null,
    }),
  });
}

function renderDocumentsTable() {
  const root = $('doc-hub-root');
  if (!root) return;
  document.querySelectorAll('#doc-tabs .filter-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.f === docFilter);
  });
  const search = ($('doc-hub-search')?.value || '').toLowerCase();
  let rows = docFilter === '__agreements' ? buildAgreementRows() : buildDocumentList();
  if (!showArchived) rows = rows.filter(r => !r.archived);
  if (docFilter !== 'all') {
    const filterType = docFilter === '__agreements' ? 'Agreement' : docFilter === '__retainer-statements' ? 'Retainer Statement' : docFilter === '__project-briefs' ? 'Project Brief' : docFilter === '__completion' ? 'Project Completion Report' : docFilter;
    rows = rows.filter(r => r._type === filterType);
  }
  if (search) rows = rows.filter(r => {
    const client = allClients.find(c => c.id === r.client_id) || {};
    return (r._num||'').toLowerCase().includes(search) || clientDisplayName(client).toLowerCase().includes(search) || (r._title||'').toLowerCase().includes(search);
  });
  if (!rows.length) { root.innerHTML = emptyState('No documents found'); return; }
  const typeBadge = { Quote:'badge-gold', Invoice:'badge-amber', Proposal:'badge-emerald', SOW:'badge-ok', 'Welcome Letter':'', Agreement:'badge-gold', 'Retainer Statement':'badge-amber', 'Project Brief':'badge-ok', 'Project Completion Report':'badge-emerald' };
  root.innerHTML = `<table class="data-table">
    <thead><tr><th>#</th><th>Type</th><th>Client</th><th>Title</th><th>Date</th><th>Status</th><th>Sig</th><th>Actions</th></tr></thead>
    <tbody>${rows.map(r => {
      const client = allClients.find(c => c.id === r.client_id) || {};
      return `<tr ${r.archived ? 'style="opacity:.5"' : ''}>
        <td class="td-mono">${esc(r._num||'—')}</td>
        <td><span class="badge ${typeBadge[r._type]||''}">${esc(r._type)}</span></td>
        <td>${esc(clientDisplayName(client))}</td>
        <td>${esc(r._title)}</td>
        <td>${esc(compactDate(r._date) || '—')}</td>
        <td>${esc(r._status||'—')}</td>
        ${sigBadge(r)}
        <td class="td-actions">
          ${r._type==='Proposal' ? `<button class="btn-ghost btn-sm" onclick="openProposalEditor('${r.id}',null,null)">View</button>` : ''}
          ${r._type==='SOW' ? `<button class="btn-ghost btn-sm" onclick="openSOWEditor('${r.id}',null)">View</button>` : ''}
          ${r._type==='Proposal' ? `<button class="btn-ghost btn-sm" onclick="downloadProposalDocumentPDF('${r.id}')">PDF</button><button class="btn-ghost btn-sm" onclick="sendProposalEmail('${r.id}')">Send</button>` : ''}
          ${r._type==='SOW' ? `<button class="btn-ghost btn-sm" onclick="downloadSOWDocumentPDF('${r.id}')">PDF</button><button class="btn-ghost btn-sm" onclick="sendSOWEmail('${r.id}')">Send</button>` : ''}
          ${r._type==='Quote' ? `<button class="btn-ghost btn-sm" onclick="downloadQuotePDF('${r.id}')">PDF</button><button class="btn-ghost btn-sm" onclick="sendQuoteEmail('${r.id}')">Send</button>` : ''}
          ${r._type==='Invoice' ? `<button class="btn-ghost btn-sm" onclick="downloadInvoicePDF('${r.id}')">PDF</button><button class="btn-ghost btn-sm" onclick="sendInvoiceEmail('${r.id}')">Send</button>` : ''}
          ${r._type==='Welcome Letter' ? `<button class="btn-ghost btn-sm" onclick="downloadWelcomeLetterPDF('${r.id}')">PDF</button><button class="btn-ghost btn-sm" onclick="sendWelcomeLetterEmail('${r.id}')">Send</button>` : ''}
          ${r._type==='Agreement' ? `<button class="btn-ghost btn-sm" onclick="downloadAgreementPDF('${r._agreementKind}','${r.client_id}')">PDF</button>` : ''}
          ${r._type==='Retainer Statement' ? `<button class="btn-ghost btn-sm" onclick="downloadRetainerStatementPDF('${r.id}')">PDF</button>` : ''}
          ${r._type==='Project Brief' ? `<button class="btn-ghost btn-sm" onclick="downloadProjectBriefPDF('${r.id}')">PDF</button>` : ''}
          ${r._type==='Project Completion Report' ? `<button class="btn-ghost btn-sm" onclick="downloadProjectCompletionPDF('${r.id}')">PDF</button>` : ''}
          ${SIGNABLE_TYPES.includes(r._type) && signingStatusFor(r) !== 'signed' ? `<button class="btn-ghost btn-sm" onclick="requestSignatureForDoc('${r._type}','${r._type==='Agreement' ? r.client_id : r.id}','${r._agreementKind||''}')">Sign</button>` : ''}
          ${!r.archived && !['Agreement','Retainer Statement','Project Brief','Project Completion Report'].includes(r._type) ? `<button class="btn-ghost btn-sm" onclick="archiveDocument('${r._type}','${r.id}')">Archive</button>` : ''}
        </td>
      </tr>`;
    }).join('')}</tbody>
  </table>`;
}

async function downloadWelcomeLetterPDF(letterId) {
  const letter = allWelcomeLetters.find(w => w.id === letterId);
  if (!letter) return;
  const client = allClients.find(c => c.id === letter.client_id) || {};
  await generatePDF(welcomeLetterTemplate(letter, client), `${letter.letter_number}.pdf`);
}

async function downloadProposalDocumentPDF(proposalId) {
  const proposal = allProposals.find(p => p.id === proposalId);
  if (!proposal) return;
  const client = allClients.find(c => c.id === proposal.client_id) || {};
  await generatePDF(proposalTemplate(proposal, client), `${proposal.proposal_number}.pdf`);
}

async function downloadSOWDocumentPDF(scopeId) {
  const scope = allScopes.find(s => s.id === scopeId);
  if (!scope) return;
  const proposal = scope.proposal_id ? allProposals.find(p => p.id === scope.proposal_id) : null;
  const client = allClients.find(c => c.id === (proposal?.client_id || scope.client_id)) || {};
  await generatePDF(sowTemplate(scope, client, proposal), `${scope.scope_number}.pdf`);
}

async function downloadAgreementPDF(kind, clientId) {
  const client = allClients.find(c => c.id === clientId) || {};
  if (!client.id) return;
  const retainer = allRetainers.find(r => r.client_id === clientId) || {};
  await generatePDF(agreementTemplate(kind, client, retainer), `${agreementNumber(kind, client)}.pdf`);
}

async function downloadRetainerStatementPDF(retainerId) {
  const retainer = allRetainers.find(r => r.id === retainerId);
  if (!retainer) return;
  const client = allClients.find(c => c.id === retainer.client_id) || {};
  const { data: payments, error } = await sb.from('retainer_payments')
    .select('*')
    .eq('retainer_id', retainer.id)
    .order('payment_date', { ascending: false });
  if (error) {
    if (isSchemaError(error)) toast('Apply migration 003 to enable retainer payment history.');
    else toast('Could not load retainer payment history.');
    return;
  }
  const filename = `${retainerStatementNumber(retainer)}.pdf`;
  await generatePDF(retainerStatementTemplate(retainer, client, payments || []), filename);
}

async function downloadProjectBriefPDF(projectId) {
  const project = allProjects.find(p => p.id === projectId);
  if (!project) return;
  const client = allClients.find(c => c.id === project.client_id) || project.client || {};
  await generatePDF(projectBriefTemplate(project, client), `${projectBriefNumber(project)}.pdf`);
}

async function downloadProjectCompletionPDF(projectId) {
  const project = allProjects.find(p => p.id === projectId);
  if (!project) return;
  const client = allClients.find(c => c.id === project.client_id) || project.client || {};
  await generatePDF(projectCompletionTemplate(project, client), `${projectCompletionNumber(project)}.pdf`);
}

async function archiveDocument(type, id) {
  const tableMap = { Quote:'quotes', Invoice:'invoices', Proposal:'proposals', SOW:'scopes', 'Welcome Letter':'welcome_letters' };
  const table = tableMap[type];
  if (!table) return;
  const { error } = await sb.from(table).update({ archived: true }).eq('id', id);
  if (error) { toast('Error archiving document.'); return; }
  toast('Document archived.');
  await Promise.all([loadQuotes(), loadInvoices(), loadProposals(), loadScopes(), loadWelcomeLetters()]);
  renderDocumentsTable();
}

