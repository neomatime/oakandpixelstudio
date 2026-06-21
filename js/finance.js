function computeRetainerMetrics() {
  if (!$('rm-mrr')) return;
  const today = todayStr();
  const thisMonthStart = today.slice(0,7) + '-01';
  const lastDay = new Date(today.slice(0,4), parseInt(today.slice(5,7)), 0);
  const thisMonthEnd = today.slice(0,7) + '-' + String(lastDay.getDate()).padStart(2,'0');
  const active = allRetainers.filter(r => r.payment_status !== 'Cancelled');
  const mrr = active.reduce((s,r) => s + (Number(r.monthly_retainer)||0), 0);
  const due = allRetainers.filter(r => r.next_payment_date && r.next_payment_date >= thisMonthStart && r.next_payment_date <= thisMonthEnd).length;
  const overdue = allRetainers.filter(r => r.payment_status === 'Overdue').length;
  $('rm-mrr').textContent = money(mrr);
  $('rm-active').textContent = active.length;
  $('rm-due').textContent = due;
  $('rm-overdue').textContent = overdue;
}

function stageClass(stage) {
  if (stage === 'Active' || stage === 'Partner') return 'badge-confirmed';
  if (stage === 'Onboarding') return 'badge-ok';
  if (stage === 'Agreement' || stage === 'Proposal') return 'badge-amber';
  return '';
}

function stageOpacityStyle(stage) {
  if (stage === 'Lead')      return ' style="opacity:.4"';
  if (stage === 'Discovery') return ' style="opacity:.65"';
  return '';
}

function stageFor(clientId) {
  const c = allClients.find(c => c.id === clientId);
  return c?.lifecycle_stage || 'Lead';
}

function stageBadge(r) {
  const stage = r.lifecycle_stage || 'Lead';
  const cls = stageClass(stage);
  const opStyle = stageOpacityStyle(stage);
  const opts = LIFECYCLE_STAGES.map(s =>
    `<option value="${s}"${s === stage ? ' selected' : ''}>${s}</option>`
  ).join('');
  return `<td><span class="badge ${cls}"${opStyle}><select class="status-select stage-select" data-id="${r.id}">${opts}</select></span></td>`;
}

function deriveClientStage(clientId) {
  if (allRetainers.some(r => r.client_id === clientId && r.payment_status !== 'Cancelled'))
    return 'Active';
  if (allInvoices.some(i => i.client_id === clientId && i.payment_status === 'Paid'))
    return 'Onboarding';
  if (allQuotes.some(q => q.client_id === clientId && q.status === 'Accepted') ||
      allProposals.some(p => p.client_id === clientId && p.status === 'Approved'))
    return 'Agreement';
  if (allProposals.some(p => p.client_id === clientId) ||
      allQuotes.some(q => q.client_id === clientId))
    return 'Proposal';
  return 'Lead';
}

function clientHealth(client) {
  const clientId = client.id;
  const daysInStage = client.stage_entered_at
    ? Math.floor((Date.now() - new Date(client.stage_entered_at).getTime()) / 86400000)
    : 0;
  if (allInvoices.some(i => i.client_id === clientId && i.payment_status === 'Overdue')) return 'red';
  if (daysInStage > 30) return 'red';
  if (daysInStage > 14) return 'amber';
  if (!client.email || !client.company) return 'amber';
  return 'green';
}

function nextAction(client) {
  const stage = client.lifecycle_stage || 'Lead';
  const clientId = client.id;
  if (stage === 'Lead')      return 'Schedule discovery session';
  if (stage === 'Discovery') return 'Create proposal';
  if (stage === 'Proposal') {
    const hasUnsent = allProposals.some(p => p.client_id === clientId && p.status === 'Draft') ||
                      allQuotes.some(q => q.client_id === clientId && q.status === 'Draft');
    return hasUnsent ? 'Send proposal' : 'Follow up with client';
  }
  if (stage === 'Agreement') {
    const hasSentScope = allScopes.some(s => s.client_id === clientId && s.status !== 'Draft');
    return hasSentScope ? 'Awaiting signature' : 'Generate & sign MSA / SOW';
  }
  if (stage === 'Onboarding') {
    const hasSentLetter = allWelcomeLetters.some(w => w.client_id === clientId && w.sent_at);
    if (!hasSentLetter) return 'Send welcome letter';
    return allProjects.some(p => p.client_id === clientId) ? 'View project' : 'Create project workspace';
  }
  if (stage === 'Active') {
    return allInvoices.some(i => i.client_id === clientId && i.payment_status === 'Overdue')
      ? 'Record payment' : 'View project';
  }
  if (stage === 'Partner') return 'Review retainer';
  return '';
}

async function setClientStage(clientId, stage) {
  if (!LIFECYCLE_STAGES.includes(stage)) return;
  const now = new Date().toISOString();
  const { error } = await sb.from('clients')
    .update({ lifecycle_stage: stage, stage_entered_at: now })
    .eq('id', clientId);
  if (error) { console.warn('[setClientStage]', error.message); return; }
  const idx = allClients.findIndex(c => c.id === clientId);
  if (idx !== -1) { allClients[idx].lifecycle_stage = stage; allClients[idx].stage_entered_at = now; }
  renderClients();
  if (document.getElementById('page-pipeline')?.classList?.contains('active')) renderPipelinePage();
}

async function runLifecycleEngine() {
  for (const client of allClients) {
    if (client.lifecycle_stage === 'Partner') continue;
    const derived = deriveClientStage(client.id);
    const storedIdx = LIFECYCLE_STAGES.indexOf(client.lifecycle_stage || 'Lead');
    const derivedIdx = LIFECYCLE_STAGES.indexOf(derived);
    if (derivedIdx > storedIdx) {
      const now = new Date().toISOString();
      await sb.from('clients').update({ lifecycle_stage: derived, stage_entered_at: now }).eq('id', client.id);
      client.lifecycle_stage = derived;
      client.stage_entered_at = now;
    }
  }
}

function mandateStatusFor(retainer) {
  return allMandates.find(m => m.retainer_id === retainer.id) || null;
}

function mandateBadge(retainer) {
  const m = mandateStatusFor(retainer);
  if (!m)                       return '<td><span class="badge" style="opacity:.35">No Mandate</span></td>';
  if (m.status === 'active')    return '<td><span class="badge badge-ok">Active ✓</span></td>';
  if (m.status === 'pending')   return '<td><span class="badge badge-amber">Pending</span></td>';
  if (m.status === 'suspended') return '<td><span class="badge badge-amber" style="opacity:.7">Suspended</span></td>';
  if (m.status === 'failed')    return '<td><span class="badge badge-declined">Failed</span></td>';
  if (m.status === 'cancelled') return '<td><span class="badge badge-declined" style="opacity:.6">Cancelled</span></td>';
  return `<td><span class="badge" style="opacity:.5">${esc(m.status)}</span></td>`;
}

function renderRetainersTable() {
  const root = $('retainers-table-root');
  if (!root) return;
  computeRetainerMetrics();
  if (!retainerSchemaReady) { root.innerHTML = schemaNotice('Apply migration 003 to enable retainers.'); return; }
  if (!allRetainers.length) { root.innerHTML = emptyState('No retainers found', 'Create retainers from a client profile.'); return; }
  root.innerHTML = `<table class="data-table">
    <thead><tr><th>Client</th><th>Plan</th><th>Monthly</th><th>Billing Day</th><th>Next Payment</th><th>Status</th><th>Mandate</th><th>Actions</th></tr></thead>
    <tbody>${allRetainers.map(r => {
      const client = allClients.find(c => c.id === r.client_id) || {};
      const badgeCls = { Paid:'badge-confirmed', Pending:'badge-pending', Overdue:'badge-declined', Failed:'badge-declined' }[r.payment_status] || '';
      const mandate = mandateStatusFor(r);
      return `<tr>
        <td>${esc(clientDisplayName(client))}</td>
        <td>${esc(r.assigned_plan || '—')}</td>
        <td>${money(r.monthly_retainer)}</td>
        <td>${esc(String(r.billing_day ?? '—'))}</td>
        <td>${esc(compactDate(r.next_payment_date) || '—')}</td>
        <td><span class="badge ${badgeCls}">${esc(r.payment_status || 'Pending')}</span></td>
        ${mandateBadge(r)}
        <td class="td-actions">
          <button class="btn-ghost btn-sm" onclick="openRetainerModal('${r.client_id}')">History</button>
          <button class="btn-ghost btn-sm" onclick="openRecordPaymentModal('${r.id}')">Record Payment</button>
          ${!mandate || mandate.status === 'cancelled' || mandate.status === 'failed' ? `<button class="btn-ghost btn-sm" onclick="setupMandate('${r.id}')">Set Up Mandate</button>` : ''}
        </td>
      </tr>`;
    }).join('')}</tbody>
  </table>`;
}

async function setupMandate(retainerId) {
  const retainer = allRetainers.find(r => r.id === retainerId);
  if (!retainer) return;
  const client = allClients.find(c => c.id === retainer.client_id) || {};
  const ok = await opsConfirm({
    title: 'Set Up Debit Mandate',
    message: `Create a pending debit mandate for ${clientDisplayName(client)}?`,
    confirmText: 'Create Mandate',
    tone: 'emerald'
  });
  if (!ok) return;
  const { error } = await sb.from('mandates').insert({
    retainer_id: retainerId,
    client_id: retainer.client_id,
    status: 'pending'
  });
  if (error) { console.warn('[setupMandate]', error.message); toast(mandateSchemaReady ? 'Error creating mandate.' : 'Mandates table not ready — apply migration 010.'); return; }
  toast('Mandate created — pending provider setup.');
  await loadMandates();
  renderRetainersTable();
}

function openRecordPaymentModal(retainerId) {
  const retainer = allRetainers.find(r => r.id === retainerId);
  if (!retainer) return;
  const client = allClients.find(c => c.id === retainer.client_id) || {};
  showModal(`
    <div class="modal-hdr">
      <span class="modal-title">Record Payment</span>
      <button class="modal-close" onclick="closeModal()">×</button>
    </div>
    <div class="modal-body">
      <div class="modal-field full"><label>Client</label><input readonly value="${esc(clientDisplayName(client))}"></div>
      <div class="modal-field"><label>Month (e.g. June 2026)</label><input id="rp-month" placeholder="June 2026"></div>
      <div class="modal-field"><label>Amount (R)</label><input id="rp-amount" type="number" value="${retainer.monthly_retainer || 0}"></div>
      <div class="modal-field"><label>Payment Date</label><input id="rp-date" type="date" value="${todayStr()}"></div>
      <div class="modal-field"><label>Status</label><select id="rp-status">
        ${PAYMENT_STATUSES.map(s => `<option value="${s}">${s}</option>`).join('')}
      </select></div>
    </div>
    <div class="modal-foot">
      <button class="btn-ghost" onclick="closeModal()">Cancel</button>
      <button class="btn-add" onclick="saveRetainerPayment('${retainerId}')">Record</button>
    </div>
  `);
}

async function saveRetainerPayment(retainerId) {
  const month = $('rp-month').value.trim();
  const amount = Math.max(0, parseInt($('rp-amount').value) || 0);
  const date = $('rp-date').value;
  const status = $('rp-status').value;
  if (!month) { toast('Enter a month.'); return; }
  const { error } = await sb.from('retainer_payments').insert({
    retainer_id: retainerId, month, amount, payment_date: date, payment_status: status,
    invoice_number: docNumber('RET')
  });
  if (error) { toast('Error recording payment.'); return; }
  const { error: updateErr } = await sb.from('retainers').update({ payment_status: status, last_payment_date: date }).eq('id', retainerId);
  if (updateErr) { toast('Payment recorded but status update failed.'); }
  closeModal();
  toast('Payment recorded.');
  await Promise.all([loadRetainers(), loadRetainerOverview()]);
}

function renderInvoicesTable() {
  const root = $('invoices-table-root');
  if (!root) return;
  if (!financeSchemaReady) { root.innerHTML = schemaNotice('Apply migration 003 to enable invoices.'); return; }
  document.querySelectorAll('#invoices-tabs .filter-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.f === invoicesFilter);
  });
  const search = ($('invoices-search')?.value || '').toLowerCase();
  const rows = allInvoices.filter(i => {
    if (invoicesFilter !== 'all' && i.payment_status !== invoicesFilter) return false;
    if (search) {
      const client = allClients.find(c => c.id === i.client_id) || {};
      return (i.invoice_number || '').toLowerCase().includes(search) || clientDisplayName(client).toLowerCase().includes(search);
    }
    return true;
  });
  if (!rows.length) { root.innerHTML = emptyState('No invoices found'); return; }
  root.innerHTML = `<table class="data-table">
    <thead><tr><th>Invoice #</th><th>Client</th><th>Service</th><th>Amount</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
    <tbody>${rows.map(inv => {
      const client = allClients.find(c => c.id === inv.client_id) || {};
      const badgeCls = { Draft:'', Sent:'badge-pending', Paid:'badge-confirmed', Overdue:'badge-declined', Cancelled:'' }[inv.payment_status] || '';
      return `<tr>
        <td class="td-mono">${esc(inv.invoice_number)}</td>
        <td>${esc(clientDisplayName(client))}</td>
        <td>${esc(inv.service_name || '—')}</td>
        <td>${money(inv.total_amount)}</td>
        <td><span class="badge ${badgeCls}">${esc(inv.payment_status)}</span></td>
        <td>${compactDate(inv.invoice_date)}</td>
        <td class="td-actions">
          <button class="btn-ghost btn-sm" onclick="openEditInvoiceModal('${inv.id}')">Edit</button>
          <button class="btn-ghost btn-sm" onclick="downloadInvoicePDF('${inv.id}')">PDF</button>
          <button class="btn-ghost btn-sm btn-danger" onclick="deleteInvoice('${inv.id}')">Delete</button>
        </td>
      </tr>`;
    }).join('')}</tbody>
  </table>`;
}

async function downloadInvoicePDF(invoiceId) {
  const invoice = allInvoices.find(i => i.id === invoiceId);
  if (!invoice) return;
  const client = allClients.find(c => c.id === invoice.client_id) || {};
  await generatePDF(invoiceTemplate(invoice, client), `${invoice.invoice_number}.pdf`);
}

async function deleteInvoice(invoiceId) {
  const invoice = allInvoices.find(i => i.id === invoiceId) || {};
  const confirmed = await opsDeleteConfirm({
    title: 'Delete Invoice?',
    message: 'This invoice will be permanently removed from OPS Command Center.',
    meta: `${invoice.invoice_number || 'Invoice'}${invoice.total_amount ? ` · ${money(invoice.total_amount)}` : ''}`,
    confirmText: 'Delete Invoice'
  });
  if (!confirmed) return;
  const { error } = await sb.from('invoices').delete().eq('id', invoiceId);
  if (error) { toast('Error deleting invoice.'); return; }
  toast('Invoice deleted.');
  await loadInvoices();
}

function openEditInvoiceModal(invoiceId) {
  const invoice = allInvoices.find(i => i.id === invoiceId);
  if (!invoice) return;
  const client = allClients.find(c => c.id === invoice.client_id) || {};
  showModal(`
    <div class="modal-hdr">
      <span class="modal-title">Edit Invoice</span>
      <button class="modal-close" onclick="closeModal()">×</button>
    </div>
    <div class="modal-body">
      <div class="modal-field full"><label>Invoice Number</label><input readonly value="${esc(invoice.invoice_number)}"></div>
      <div class="modal-field full"><label>Client</label><input readonly value="${esc(clientDisplayName(client))}"></div>
      <div class="modal-field"><label>Payment Status</label><select id="ei-status">${INVOICE_STATUSES.map(s => `<option value="${s}" ${s===invoice.payment_status?'selected':''}>${s}</option>`).join('')}</select></div>
      <div class="modal-field"><label>Invoice Date</label><input id="ei-date" type="date" value="${invoice.invoice_date || ''}"></div>
      <div class="modal-field"><label>Due Date</label><input id="ei-due" type="date" value="${invoice.due_date || ''}"></div>
      <div class="modal-field"><label>Setup Fee (R)</label><input id="ei-setup" type="number" value="${invoice.setup_fee || 0}"></div>
      <div class="modal-field"><label>Monthly Retainer (R)</label><input id="ei-retainer" type="number" value="${invoice.monthly_retainer || 0}"></div>
      <div class="modal-field full" style="margin-top:.25rem"><label style="font-size:.68rem;letter-spacing:.1em;color:var(--gold);margin-bottom:.5rem">BANKING DETAILS</label></div>
      <div class="modal-field"><label>Bank Name</label><input id="ei-bank-name" placeholder="e.g. FNB, Standard Bank" value="${esc(invoice.bank_name || BANKING_DEFAULTS.bank_name)}"></div>
      <div class="modal-field"><label>Account Holder</label><input id="ei-account-holder" placeholder="Full name on account" value="${esc(invoice.account_holder || BANKING_DEFAULTS.account_holder)}"></div>
      <div class="modal-field"><label>Account Number</label><input id="ei-account-number" placeholder="Account number" value="${esc(invoice.account_number || BANKING_DEFAULTS.account_number)}"></div>
      <div class="modal-field"><label>Branch Code</label><input id="ei-branch-code" placeholder="6-digit branch code" value="${esc(invoice.branch_code || BANKING_DEFAULTS.branch_code)}"></div>
      <div class="modal-field"><label>Account Type</label><select id="ei-account-type"><option value="">— Select —</option>${['Current','Cheque','Savings'].map(t=>`<option value="${t}" ${(invoice.account_type||BANKING_DEFAULTS.account_type)===t?'selected':''}>${t}</option>`).join('')}</select></div>
      <div class="modal-field"><label>Payment Reference</label><input id="ei-payment-reference" placeholder="Invoice number or client name" value="${esc(invoice.payment_reference || BANKING_DEFAULTS.payment_reference)}"></div>
    </div>
    <div class="modal-foot">
      <button class="btn-ghost" onclick="closeModal()">Cancel</button>
      <button class="btn-add" onclick="updateInvoice('${invoiceId}')">Save Changes</button>
    </div>
  `);
  $('modal-box').classList.add('wide');
}

async function updateInvoice(invoiceId) {
  const invoice = allInvoices.find(i => i.id === invoiceId) || {};
  const setup = Math.max(0, parseInt($('ei-setup').value) || 0);
  const retainer = Math.max(0, parseInt($('ei-retainer').value) || 0);
  const extras = Array.isArray(invoice.additional_items) ? invoice.additional_items : [];
  const extraTotal = extras.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const payload = {
    payment_status: $('ei-status').value,
    invoice_date: $('ei-date').value,
    due_date: $('ei-due').value,
    setup_fee: setup,
    monthly_retainer: retainer,
    total_amount: setup + retainer + extraTotal,
    bank_name: $('ei-bank-name').value.trim() || null,
    account_holder: $('ei-account-holder').value.trim() || null,
    account_number: $('ei-account-number').value.trim() || null,
    branch_code: $('ei-branch-code').value.trim() || null,
    account_type: $('ei-account-type').value || null,
    payment_reference: $('ei-payment-reference').value.trim() || null,
  };
  let { error } = await sb.from('invoices').update(payload).eq('id', invoiceId);
  let bankingSkipped = false;
  if (error && isSchemaError(error)) {
    ['bank_name','account_holder','account_number','branch_code','account_type','payment_reference'].forEach(k => delete payload[k]);
    const retry = await sb.from('invoices').update(payload).eq('id', invoiceId);
    error = retry.error;
    bankingSkipped = !error;
  }
  if (error) { toast('Error updating invoice.'); return; }
  closeModal();
  toast(bankingSkipped ? 'Invoice updated. Apply migration 007 to save banking details.' : 'Invoice updated.');
  await loadInvoices();
}

function openInvoiceFromQuote() {
  const quotes = allQuotes;
  if (!quotes.length) { toast('No quotes available to convert.'); return; }
  showModal(`
    <div class="modal-hdr">
      <span class="modal-title">Convert Quote to Invoice</span>
      <button class="modal-close" onclick="closeModal()">×</button>
    </div>
    <div class="modal-body">
      <p class="td-dim" style="margin-bottom:1rem">Select a quote to convert. The original quote will be removed after the invoice is created.</p>
      ${quotes.map(q => {
        const client = allClients.find(c => c.id === q.client_id) || {};
        const badgeCls = { Draft:'', Sent:'badge-pending', Accepted:'badge-confirmed' }[q.status] || '';
        return `<div class="doc-row" style="cursor:pointer" onclick="convertQuoteToInvoice('${q.id}')">
          <div><div class="doc-title">${esc(q.quote_number)}</div><div class="doc-meta">${esc(clientDisplayName(client))} · ${money(q.total_amount)}</div></div>
          <span class="badge ${badgeCls}">${esc(q.status || 'Draft')}</span>
        </div>`;
      }).join('')}
    </div>
  `);
}

function prefillInvoiceFromQuote(quoteId) {
  const quote = allQuotes.find(q => q.id === quoteId);
  if (!quote) return;
  closeModal();
  const client = allClients.find(c => c.id === quote.client_id) || {};
  selectedClientId = client.id || null;
  openClientDocumentModal('invoice', quote.client_id);
  setTimeout(() => {
    if ($('doc-service')) {
      const opt = [...$('doc-service').options].find(o => o.value === quote.service_id);
      if (opt) { $('doc-service').value = quote.service_id; $('doc-service').dispatchEvent(new Event('change')); }
    }
    if ($('doc-setup')) $('doc-setup').value = quote.setup_fee || 0;
    if ($('doc-retainer')) $('doc-retainer').value = quote.monthly_retainer || 0;
  }, 100);
}

async function convertQuoteToInvoice(quoteId) {
  const quote = allQuotes.find(q => q.id === quoteId);
  if (!quote) return;
  const confirmed = await opsConfirm({
    title: 'Convert Quote to Invoice',
    message: 'This will create a new invoice from the quote details and remove the original quote after conversion.',
    meta: `${quote.quote_number} · ${money(quote.total_amount)}`,
    confirmText: 'Convert Quote',
    cancelText: 'Keep Quote'
  });
  if (!confirmed) return;
  const invoiceNumber = docNumber('INV');
  const dueDate = addDays(todayStr(), 7);
  startLoad();
  let converted = false;
  const rpc = await sb.rpc('convert_quote_to_invoice', {
    p_quote_id: quoteId,
    p_invoice_number: invoiceNumber,
    p_due_date: dueDate,
    p_banking_details: null
  });

  if (!rpc.error) {
    converted = true;
  } else if (!isSchemaError(rpc.error)) {
    endLoad();
    toast('Error converting quote.');
    return;
  } else {
    const payload = {
      invoice_number: invoiceNumber,
      client_id: quote.client_id,
      service_id: quote.service_id,
      service_name: quote.service_name,
      service_description: quote.service_description,
      invoice_date: todayStr(),
      due_date: dueDate,
      setup_fee: quote.setup_fee || 0,
      monthly_retainer: quote.monthly_retainer || 0,
      additional_items: Array.isArray(quote.additional_items) ? quote.additional_items : [],
      total_amount: quote.total_amount || 0,
      payment_status: 'Draft'
    };
    const insert = await sb.from('invoices').insert(payload);
    if (insert.error) {
      endLoad();
      toast(isSchemaError(insert.error) ? 'Apply migration 003 to enable invoices.' : 'Error creating invoice.');
      return;
    }
    const remove = await sb.from('quotes').delete().eq('id', quoteId);
    if (remove.error) {
      endLoad();
      toast('Invoice created, but quote could not be removed.');
      await loadInvoices();
      return;
    }
    converted = true;
  }

  endLoad();
  if (converted) {
    closeModal();
    toast('Quote converted to invoice.');
    await Promise.all([loadQuotes(), loadInvoices(), loadRetainerOverview()]);
    switchPage('invoices');
  }
}

function renderQuotesTable() {
  const root = $('quotes-table-root');
  if (!root) return;
  if (!financeSchemaReady) { root.innerHTML = schemaNotice('Apply migration 003 to enable quotes.'); return; }
  document.querySelectorAll('#quotes-tabs .filter-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.f === quotesFilter);
  });
  const search = ($('quotes-search')?.value || '').toLowerCase();
  const rows = allQuotes.filter(q => {
    if (quotesFilter !== 'all' && q.status !== quotesFilter) return false;
    if (search) {
      const client = allClients.find(c => c.id === q.client_id) || {};
      return (q.quote_number || '').toLowerCase().includes(search) || clientDisplayName(client).toLowerCase().includes(search);
    }
    return true;
  });
  if (!rows.length) { root.innerHTML = emptyState('No quotes found'); return; }
  root.innerHTML = `<table class="data-table">
    <thead><tr><th>Quote #</th><th>Client</th><th>Service</th><th>Amount</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
    <tbody>${rows.map(q => {
      const client = allClients.find(c => c.id === q.client_id) || {};
      const badgeCls = { Draft:'', Sent:'badge-pending', Accepted:'badge-confirmed', Declined:'badge-declined', Expired:'' }[q.status] || '';
      return `<tr>
        <td class="td-mono">${esc(q.quote_number)}</td>
        <td>${esc(clientDisplayName(client))}</td>
        <td>${esc(q.service_name || '—')}</td>
        <td>${money(q.total_amount)}</td>
        <td><span class="badge ${badgeCls}">${esc(q.status)}</span></td>
        <td>${compactDate(q.quote_date)}</td>
        <td class="td-actions">
          <button class="btn-ghost btn-sm" onclick="openEditQuoteModal('${q.id}')">Edit</button>
          <button class="btn-ghost btn-sm" onclick="downloadQuotePDF('${q.id}')">PDF</button>
          <button class="btn-ghost btn-sm" onclick="convertQuoteToInvoice('${q.id}')">Convert</button>
          <button class="btn-ghost btn-sm btn-danger" onclick="deleteQuote('${q.id}')">Delete</button>
        </td>
      </tr>`;
    }).join('')}</tbody>
  </table>`;
}

async function downloadQuotePDF(quoteId) {
  const quote = allQuotes.find(q => q.id === quoteId);
  if (!quote) return;
  const client = allClients.find(c => c.id === quote.client_id) || {};
  await generatePDF(quoteTemplate(quote, client), `${quote.quote_number}.pdf`);
}

async function deleteQuote(quoteId) {
  const quote = allQuotes.find(q => q.id === quoteId) || {};
  const confirmed = await opsDeleteConfirm({
    title: 'Delete Quote?',
    message: 'This quote will be permanently removed from OPS Command Center.',
    meta: `${quote.quote_number || 'Quote'}${quote.total_amount ? ` · ${money(quote.total_amount)}` : ''}`,
    confirmText: 'Delete Quote'
  });
  if (!confirmed) return;
  const { error } = await sb.from('quotes').delete().eq('id', quoteId);
  if (error) { toast('Error deleting quote.'); return; }
  toast('Quote deleted.');
  await loadQuotes();
}

function openEditQuoteModal(quoteId) {
  const quote = allQuotes.find(q => q.id === quoteId);
  if (!quote) return;
  const client = allClients.find(c => c.id === quote.client_id) || {};
  showModal(`
    <div class="modal-hdr">
      <span class="modal-title">Edit Quote</span>
      <button class="modal-close" onclick="closeModal()">×</button>
    </div>
    <div class="modal-body">
      <div class="modal-field full"><label>Quote Number</label><input readonly value="${esc(quote.quote_number)}"></div>
      <div class="modal-field full"><label>Client</label><input readonly value="${esc(clientDisplayName(client))}"></div>
      <div class="modal-field"><label>Status</label><select id="eq-status">${DOC_STATUSES.map(s => `<option value="${s}" ${s===quote.status?'selected':''}>${s}</option>`).join('')}</select></div>
      <div class="modal-field"><label>Quote Date</label><input id="eq-date" type="date" value="${quote.quote_date || ''}"></div>
      <div class="modal-field"><label>Expiry Date</label><input id="eq-due" type="date" value="${quote.expiry_date || ''}"></div>
      <div class="modal-field"><label>Setup Fee (R)</label><input id="eq-setup" type="number" value="${quote.setup_fee || 0}"></div>
      <div class="modal-field"><label>Monthly Retainer (R)</label><input id="eq-retainer" type="number" value="${quote.monthly_retainer || 0}"></div>
    </div>
    <div class="modal-foot">
      <button class="btn-ghost" onclick="closeModal()">Cancel</button>
      <button class="btn-add" onclick="updateQuote('${quoteId}')">Save Changes</button>
    </div>
  `);
  $('modal-box').classList.add('wide');
}

async function updateQuote(quoteId) {
  const setup = Math.max(0, parseInt($('eq-setup').value) || 0);
  const retainer = Math.max(0, parseInt($('eq-retainer').value) || 0);
  const total = setup + retainer;
  const { error } = await sb.from('quotes').update({
    status: $('eq-status').value,
    quote_date: $('eq-date').value,
    expiry_date: $('eq-due').value,
    setup_fee: setup,
    monthly_retainer: retainer,
    total_amount: total
  }).eq('id', quoteId);
  if (error) { toast('Error updating quote.'); return; }
  closeModal();
  toast('Quote updated.');
  await loadQuotes();
}

function documentRows(rows, type) {
  return (rows || []).map(row => {
    const number = type === 'quote' ? row.quote_number : row.invoice_number;
    const status = type === 'quote' ? row.status : row.payment_status;
    const date = type === 'quote' ? row.quote_date : row.invoice_date;
    const docClient = allClients.find(c => c.id === row.client_id) || row.client || {};
    return `<div class="doc-row">
      <div style="display:flex;align-items:center;gap:.6rem">${clientAvatar(docClient)}<div><div class="doc-title">${esc(number || 'Draft')}</div><div class="doc-meta">${esc(clientDisplayName(docClient))} · ${compactDate(date)}</div></div></div>
      <div style="text-align:right"><div class="doc-title">${money(row.total_amount)}</div><div class="doc-meta">${esc(status || 'Draft')}</div></div>
    </div>`;
  }).join('');
}

