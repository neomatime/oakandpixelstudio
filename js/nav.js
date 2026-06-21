/* ── Auth ── */
/* ── Theme ── */
function initTheme() {
  applyTheme(localStorage.getItem('ops-theme') || 'dark');
}
function applyTheme(mode) {
  document.documentElement.setAttribute('data-theme', mode);
  const icon = mode === 'dark'
    ? '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>'
    : '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>';
  ['theme-icon','login-theme-icon'].forEach(id => { if ($(id)) $(id).innerHTML = icon; });
  const nextLabel = mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
  ['theme-toggle','login-theme-toggle'].forEach(id => {
    const btn = $(id);
    if (!btn) return;
    btn.setAttribute('aria-label', nextLabel);
    btn.setAttribute('title', nextLabel);
  });
  localStorage.setItem('ops-theme', mode);
}
function toggleTheme() {
  applyTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
  setTimeout(renderCharts, 50);
}
$('theme-toggle')?.addEventListener('click', toggleTheme);
$('login-theme-toggle')?.addEventListener('click', toggleTheme);

/* â”€â”€ Sidebar â”€â”€ */
function initSidebar() {
  document.querySelectorAll('.nav-item[data-page]').forEach(btn => {
    const labelNode = btn.cloneNode(true);
    labelNode.querySelectorAll('svg,.nav-badge').forEach(node => node.remove());
    const label = labelNode.textContent.trim() || btn.dataset.page;
    btn.setAttribute('title', label);
    btn.setAttribute('aria-label', label);
  });
  applySidebarState(localStorage.getItem('ops-sidebar') === 'collapsed');
  $('sidebar-toggle')?.addEventListener('click', () => {
    applySidebarState(!document.body.classList.contains('sidebar-collapsed'));
  });
}
function applySidebarState(collapsed) {
  document.body.classList.toggle('sidebar-collapsed', collapsed);
  localStorage.setItem('ops-sidebar', collapsed ? 'collapsed' : 'expanded');
  const toggle = $('sidebar-toggle');
  if (!toggle) return;
  toggle.setAttribute('aria-expanded', String(!collapsed));
  toggle.setAttribute('aria-label', collapsed ? 'Expand sidebar' : 'Collapse sidebar');
  toggle.setAttribute('title', collapsed ? 'Expand sidebar' : 'Collapse sidebar');
}

async function init() {
  $('page-date').textContent = new Date().toLocaleDateString('en-ZA', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
  initTheme();
  initSidebar();
  initOpsSelectSystem();
  buildTimePills();
  datePicker = flatpickr('#slot-date', {
    minDate: 'today',
    disableMobile: true,
    dateFormat: 'Y-m-d',
    locale: { firstDayOfWeek: 1 },
  });

  const { data: { session } } = await sb.auth.getSession();
  if (session) showApp(session.user);

  sb.auth.onAuthStateChange((_e, session) => {
    if (session) showApp(session.user);
    else showLogin();
  });
}

function showLogin() {
  $('login-screen').style.display = 'grid';
  $('app').classList.remove('visible');
}

function showApp(user) {
  $('login-screen').style.display = 'none';
  $('app').classList.add('visible');
  $('user-email-sm').textContent = user?.email || '';
  loadAll();
  sb.channel('ops-applications')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'applications' }, payload => {
      allApplications.unshift(payload.new);
      refreshAppBadge();
      if ($('page-applications')?.classList.contains('active')) renderApplications();
    })
    .subscribe();
}

$('login-btn').addEventListener('click', async () => {
  const email = $('login-email').value.trim();
  const pw    = $('login-password').value;
  const errEl = $('login-err'), btn = $('login-btn');
  errEl.textContent = '';
  btn.disabled = true; btn.textContent = 'Signing in…';
  const { error } = await sb.auth.signInWithPassword({ email, password: pw });
  if (error) { errEl.textContent = error.message; btn.disabled = false; btn.textContent = 'Sign In'; }
});
$('login-password').addEventListener('keydown', e => { if (e.key === 'Enter') $('login-btn').click(); });
$('logout-btn').addEventListener('click', () => sb.auth.signOut());

/* ── Navigation ── */
const PAGE_TITLES = { overview:'Overview', bookings:'Bookings', availability:'Availability', projects:'Projects', services:'Services', 'service-detail':'Service Details', applications:'Applications', clients:'Clients', 'client-profile':'Client Profile', pipeline:'Pipeline', quotes:'Quotes', invoices:'Invoices', retainers:'Retainers', documents:'Documents', 'proposal-editor':'Proposal', 'sow-editor':'Scope of Work' };
const BREADCRUMB_PARENTS = {
  'service-detail': [{ label:'Services', page:'services' }],
  'client-profile': [{ label:'Clients', page:'clients' }],
  'proposal-editor': [{ label:'Documents', page:'documents' }],
  'sow-editor': [{ label:'Documents', page:'documents' }],
  quotes: [{ label:'Finance & Documents' }],
  invoices: [{ label:'Finance & Documents' }],
  retainers: [{ label:'Finance & Documents' }],
  documents: [{ label:'Finance & Documents' }]
};

function currentBreadcrumbLabel(name) {
  if (name === 'service-detail') return serviceById(selectedServiceId)?.name || PAGE_TITLES[name];
  if (name === 'client-profile') return clientDisplayName(clientById(selectedClientId) || {}) || PAGE_TITLES[name];
  if (name === 'proposal-editor') {
    const proposal = allProposals.find(p => p.id === _currentProposalId);
    return proposal?.proposal_number || proposal?.title || 'New Proposal';
  }
  if (name === 'sow-editor') {
    const scope = allScopes.find(s => s.id === _currentScopeId);
    return scope?.scope_number || scope?.title || 'New Scope of Work';
  }
  return PAGE_TITLES[name] || name;
}

function renderBreadcrumbs(name) {
  const root = $('page-breadcrumbs');
  if (!root) return;
  const crumbs = [{ label:'Command Center', page:'overview' }, ...(BREADCRUMB_PARENTS[name] || []), { label:currentBreadcrumbLabel(name) }];
  root.innerHTML = crumbs.map((crumb, index) => {
    const isLast = index === crumbs.length - 1;
    const node = !isLast && crumb.page
      ? `<button class="breadcrumb-link" type="button" data-page="${esc(crumb.page)}">${esc(crumb.label)}</button>`
      : `<span class="breadcrumb-current">${esc(crumb.label)}</span>`;
    return `${index ? '<span class="breadcrumb-sep">/</span>' : ''}${node}`;
  }).join('');
}

document.addEventListener('click', e => {
  const btn = e.target.closest('.nav-item[data-page]');
  if (btn) switchPage(btn.dataset.page);
  const crumb = e.target.closest('.breadcrumb-link[data-page]');
  if (crumb) switchPage(crumb.dataset.page);
});
document.querySelectorAll('.btn-link[data-goto]').forEach(btn => {
  btn.addEventListener('click', () => switchPage(btn.dataset.goto));
});

function switchPage(name) {
  closeAllOpsSelects();
  document.querySelectorAll('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.page === name));
  document.querySelectorAll('.page').forEach(p => p.classList.toggle('active', p.id === 'page-' + name));
  $('page-title').textContent = PAGE_TITLES[name] || name;
  renderBreadcrumbs(name);
  if (name === 'quotes') renderQuotesTable();
  if (name === 'invoices') renderInvoicesTable();
  if (name === 'retainers') renderRetainersTable();
  if (name === 'documents') renderDocumentsTable();
  if (name === 'pipeline') renderPipelinePage();
  if (name === 'applications') renderApplications();
  enhanceOpsSelects($('page-' + name) || document);
}
renderBreadcrumbs('overview');

let opsSelectSystemReady = false;
let opsSelectObserver = null;

function closeAllOpsSelects(except = null) {
  document.querySelectorAll('.ops-select-wrap.open').forEach(wrap => {
    if (wrap !== except) {
      wrap.classList.remove('open');
      wrap.querySelector('.ops-select-trigger')?.setAttribute('aria-expanded', 'false');
    }
  });
}

function opsSelectClasses(select) {
  const classes = ['ops-select-wrap'];
  if (select.classList.contains('client-filter')) classes.push('is-filter');
  if (select.classList.contains('status-select')) classes.push('is-status');
  if (select.closest('.modal-field,.onboarding-field,.f-grp')) classes.push('is-field');
  return classes.join(' ');
}

function opsSelectOptionHTML(option, select) {
  const selected = option.value === select.value;
  return `<button class="ops-select-option${selected ? ' selected' : ''}" type="button" role="option" data-value="${esc(option.value)}" aria-selected="${selected}"${option.disabled ? ' disabled' : ''}>${esc(option.textContent || option.value)}</button>`;
}

function buildOpsSelectMenu(select) {
  const ctx = select._opsSelect;
  if (!ctx) return;
  const children = [...select.children];
  ctx.menu.innerHTML = children.map(child => {
    if (child.tagName === 'OPTGROUP') {
      const options = [...child.children].filter(option => option.tagName === 'OPTION').map(option => opsSelectOptionHTML(option, select)).join('');
      return `<div class="ops-select-group">${esc(child.label || '')}</div>${options}`;
    }
    if (child.tagName === 'OPTION') return opsSelectOptionHTML(child, select);
    return '';
  }).join('');

  ctx.menu.querySelectorAll('.ops-select-option').forEach(optionBtn => {
    optionBtn.addEventListener('click', () => {
      if (optionBtn.disabled) return;
      select.value = optionBtn.dataset.value || '';
      syncOpsSelect(select, true);
      select.dispatchEvent(new Event('input', { bubbles: true }));
      select.dispatchEvent(new Event('change', { bubbles: true }));
      closeAllOpsSelects();
      ctx.button.focus();
    });
  });
}

function syncOpsSelect(select, rebuild = false) {
  const ctx = select?._opsSelect;
  if (!ctx) return;
  if (rebuild) buildOpsSelectMenu(select);
  const selectedOption = select.selectedOptions?.[0] || [...select.options].find(option => option.value === select.value) || select.options?.[0];
  ctx.label.textContent = selectedOption?.textContent || '';
  ctx.button.title = selectedOption?.textContent || '';
  ctx.wrap.className = opsSelectClasses(select);
  ctx.button.disabled = select.disabled;
  ctx.menu.querySelectorAll('.ops-select-option').forEach(optionBtn => {
    const isSelected = optionBtn.dataset.value === select.value;
    optionBtn.classList.toggle('selected', isSelected);
    optionBtn.setAttribute('aria-selected', String(isSelected));
  });
}

function openOpsSelect(select) {
  const ctx = select?._opsSelect;
  if (!ctx || ctx.button.disabled) return;
  syncOpsSelect(select, true);
  const willOpen = !ctx.wrap.classList.contains('open');
  closeAllOpsSelects(ctx.wrap);
  ctx.wrap.classList.toggle('open', willOpen);
  ctx.button.setAttribute('aria-expanded', String(willOpen));
  if (willOpen) {
    requestAnimationFrame(() => {
      const selected = ctx.menu.querySelector('.ops-select-option.selected');
      if (selected) selected.scrollIntoView({ block: 'nearest' });
    });
  }
}

function enhanceOpsSelect(select) {
  if (!select || select.dataset.opsSelect === 'true' || select.closest('.ops-select-menu')) return;
  const wrap = document.createElement('div');
  wrap.className = opsSelectClasses(select);
  const id = `ops-select-${Math.random().toString(36).slice(2)}`;
  wrap.innerHTML = `
    <button class="ops-select-trigger" type="button" aria-haspopup="listbox" aria-expanded="false" aria-controls="${id}">
      <span class="ops-select-label"></span>
    </button>
    <div class="ops-select-menu" id="${id}" role="listbox"></div>
  `;
  select.classList.add('ops-native-select');
  select.dataset.opsSelect = 'true';
  select.tabIndex = -1;
  select.setAttribute('aria-hidden', 'true');
  select.insertAdjacentElement('afterend', wrap);
  select._opsSelect = {
    wrap,
    button: wrap.querySelector('.ops-select-trigger'),
    label: wrap.querySelector('.ops-select-label'),
    menu: wrap.querySelector('.ops-select-menu'),
  };
  select._opsSelect.button.addEventListener('click', e => {
    e.stopPropagation();
    openOpsSelect(select);
  });
  select.addEventListener('change', () => syncOpsSelect(select, true));
  syncOpsSelect(select, true);
}

function enhanceOpsSelects(root = document) {
  const scope = root instanceof Element || root instanceof Document ? root : document;
  if (scope.matches?.('select')) enhanceOpsSelect(scope);
  scope.querySelectorAll?.('select').forEach(enhanceOpsSelect);
}

function initOpsSelectSystem() {
  if (opsSelectSystemReady) return;
  opsSelectSystemReady = true;
  enhanceOpsSelects(document);
  document.addEventListener('click', e => {
    if (!e.target.closest('.ops-select-wrap')) closeAllOpsSelects();
  });
  document.addEventListener('keydown', e => {
    const openWrap = document.querySelector('.ops-select-wrap.open');
    if (!openWrap) return;
    if (e.key === 'Escape') {
      closeAllOpsSelects();
      openWrap.querySelector('.ops-select-trigger')?.focus();
    }
  });
  opsSelectObserver = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      if (mutation.target?.matches?.('select[data-ops-select="true"]')) syncOpsSelect(mutation.target, true);
      mutation.addedNodes.forEach(node => {
        if (node.nodeType !== 1) return;
        if (node.matches?.('select')) enhanceOpsSelect(node);
        node.querySelectorAll?.('select').forEach(enhanceOpsSelect);
      });
    });
  });
  opsSelectObserver.observe(document.body, { childList: true, subtree: true });
}

/* ── Modal ── */
function showModal(html) {
  $('modal-box').innerHTML = html;
  $('modal-overlay').style.display = 'flex';
  $('modal-box').classList.remove('modal-entering');
  enhanceOpsSelects($('modal-box'));
  requestAnimationFrame(() => $('modal-box').classList.add('modal-entering'));
}
function closeModal() {
  closeAllOpsSelects();
  $('modal-overlay').style.display = 'none';
  $('modal-box').innerHTML = '';
  $('modal-box').classList.remove('wide','confirm');
}
let _signaturePad = null;
function openSignatureSettingsModal() {
  const saved = getStoredOpsSignature();
  const savedAt = getStoredOpsSignatureDate();
  const savedLabel = savedAt ? `Saved ${fmtDate(savedAt.split('T')[0])}` : 'Saved signature';
  showModal(`
    <div class="modal-hdr">
      <span class="modal-title">OPS Signature</span>
      <button class="modal-close" onclick="closeModal()">×</button>
    </div>
    <div class="modal-body">
      <div class="modal-field full">
        <label>Current Signature</label>
        <div class="signature-preview" id="ops-signature-preview">
          ${saved ? `<img src="${saved}" alt="Saved OPS signature">` : `<span class="signature-status">No saved signature</span>`}
        </div>
      </div>
      <div class="signature-pad-wrap">
        <div class="signature-pad-top">
          <span class="signature-status${saved ? ' ready' : ''}" id="ops-signature-status">${saved ? savedLabel : 'Draw signature'}</span>
          <button class="btn-ghost" type="button" onclick="clearSignaturePad()">Clear Pad</button>
        </div>
        <canvas class="signature-pad-canvas" id="ops-signature-canvas"></canvas>
      </div>
    </div>
    <div class="modal-foot">
      <button class="btn-ghost" onclick="removeOpsSignature()">Remove Saved</button>
      <div class="modal-foot-right">
        <button class="btn-ghost" onclick="closeModal()">Cancel</button>
        <button class="btn-add" onclick="saveSignaturePad()">Save Signature</button>
      </div>
    </div>
  `);
  $('modal-box').classList.add('wide');
  requestAnimationFrame(initSignaturePad);
}
function initSignaturePad() {
  const canvas = $('ops-signature-canvas');
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  canvas.width = Math.max(1, Math.round(rect.width * dpr));
  canvas.height = Math.max(1, Math.round(rect.height * dpr));
  const ctx = canvas.getContext('2d');
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#0A0A09';
  ctx.lineWidth = Math.max(3, 2.6 * dpr);
  _signaturePad = { canvas, ctx, drawing: false, hasMarks: false };

  const existing = getStoredOpsSignature();
  if (existing) {
    const img = new Image();
    img.onload = () => {
      const maxW = canvas.width * 0.82;
      const maxH = canvas.height * 0.58;
      const scale = Math.min(maxW / img.width, maxH / img.height, 1);
      const w = img.width * scale;
      const h = img.height * scale;
      ctx.drawImage(img, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
      _signaturePad.hasMarks = true;
    };
    img.src = existing;
  }

  const point = event => {
    const box = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - box.left) * (canvas.width / box.width),
      y: (event.clientY - box.top) * (canvas.height / box.height)
    };
  };
  const start = event => {
    event.preventDefault();
    canvas.setPointerCapture?.(event.pointerId);
    const p = point(event);
    _signaturePad.drawing = true;
    _signaturePad.hasMarks = true;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  };
  const move = event => {
    if (!_signaturePad?.drawing) return;
    event.preventDefault();
    const p = point(event);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  };
  const stop = event => {
    if (!_signaturePad) return;
    _signaturePad.drawing = false;
    canvas.releasePointerCapture?.(event.pointerId);
  };
  canvas.addEventListener('pointerdown', start);
  canvas.addEventListener('pointermove', move);
  canvas.addEventListener('pointerup', stop);
  canvas.addEventListener('pointercancel', stop);
  canvas.addEventListener('pointerleave', stop);
}
function clearSignaturePad() {
  if (!_signaturePad) return;
  _signaturePad.ctx.clearRect(0, 0, _signaturePad.canvas.width, _signaturePad.canvas.height);
  _signaturePad.hasMarks = false;
  const status = $('ops-signature-status');
  if (status) {
    status.textContent = 'Draw signature';
    status.classList.remove('ready');
  }
}
function signatureCanvasToDataUrl(canvas) {
  const ctx = canvas.getContext('2d');
  const { width, height } = canvas;
  const pixels = ctx.getImageData(0, 0, width, height).data;
  let minX = width, minY = height, maxX = -1, maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (pixels[(y * width + x) * 4 + 3] > 10) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }
  if (maxX < 0 || maxY < 0) return null;
  const pad = Math.ceil(12 * Math.max(1, window.devicePixelRatio || 1));
  const cropW = maxX - minX + 1;
  const cropH = maxY - minY + 1;
  const out = document.createElement('canvas');
  out.width = cropW + pad * 2;
  out.height = cropH + pad * 2;
  out.getContext('2d').drawImage(canvas, minX, minY, cropW, cropH, pad, pad, cropW, cropH);
  return out.toDataURL('image/png');
}
function saveSignaturePad() {
  if (!_signaturePad?.hasMarks) {
    toast('Add a signature first.');
    return;
  }
  const dataUrl = signatureCanvasToDataUrl(_signaturePad.canvas);
  if (!dataUrl) {
    toast('Add a signature first.');
    return;
  }
  if (!setStoredOpsSignature(dataUrl)) return;
  closeModal();
  toast('OPS signature saved.');
}
async function removeOpsSignature() {
  const ok = await opsConfirm({
    title: 'Remove OPS signature?',
    message: 'Generated documents will no longer include a saved OPS signature until a new one is added.',
    confirmText: 'Remove',
    tone: 'danger'
  });
  if (!ok) return;
  removeStoredOpsSignature();
  closeModal();
  toast('OPS signature removed.');
}
function opsConfirm({ title, message, meta, confirmText = 'Confirm', cancelText = 'Cancel', tone = 'emerald' }) {
  return new Promise(resolve => {
    const box = $('modal-box');
    showModal(`
      <div class="confirm-body">
        <div class="confirm-mark">
          <svg viewBox="0 0 24 24"><path d="M12 3v18"/><path d="M5 8h14"/><path d="M7 16h10"/></svg>
        </div>
        <div>
          <div class="confirm-kicker">Oak &amp; Pixel Command</div>
          <div class="confirm-title">${esc(title)}</div>
          <p class="confirm-copy">${esc(message)}</p>
          ${meta ? `<div class="confirm-meta">${esc(meta)}</div>` : ''}
        </div>
      </div>
      <div class="confirm-actions">
        <button class="btn-ghost" id="confirm-cancel">${esc(cancelText)}</button>
        <button class="${tone === 'danger' ? 'btn-danger' : 'btn-add'}" id="confirm-ok">${esc(confirmText)}</button>
      </div>
    `);
    box.classList.remove('wide');
    box.classList.add('confirm');
    const finish = value => {
      $('modal-overlay').removeEventListener('click', onBackdrop);
      document.removeEventListener('keydown', onKey);
      closeModal();
      resolve(value);
    };
    const onBackdrop = e => { if (e.target === $('modal-overlay')) finish(false); };
    const onKey = e => { if (e.key === 'Escape') finish(false); };
    $('modal-overlay').addEventListener('click', onBackdrop);
    document.addEventListener('keydown', onKey);
    $('confirm-cancel')?.addEventListener('click', () => finish(false), { once:true });
    $('confirm-ok')?.addEventListener('click', () => finish(true), { once:true });
  });
}
function opsDeleteConfirm({ title, message, meta, confirmText = 'Delete' }) {
  return opsConfirm({
    title,
    message,
    meta,
    confirmText,
    cancelText: 'Cancel',
    tone: 'danger'
  });
}
$('modal-overlay').addEventListener('click', e => {
  if (e.target === $('modal-overlay')) closeModal();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && $('modal-overlay').style.display !== 'none') closeModal();
});

init();
