'use strict';
const SB_URL = 'https://wdbsmcxzhmdkfjoftulm.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndkYnNtY3h6aG1ka2Zqb2Z0dWxtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4MDEwMTQsImV4cCI6MjA5NzM3NzAxNH0.xo9x29q_QVmDl81soUI3OMDzJBKmqEme-I6v5IZmeN0';
const sb = supabase.createClient(SB_URL, SB_KEY);
const $ = id => document.getElementById(id);

let currentFilter = 'all';
let allBookings = [];
let allClients  = [];
let allServices = [];
let allProjects = [];
let allQuotes = [];
let allInvoices = [];
let selectedServiceId = null;
let serviceFinanceReady = true;
let selectedClientId = null;
let financeSchemaReady = true;
let allRetainers = [];
let allProposals = [];
let allScopes = [];
let allWelcomeLetters = [];
let allSigningRequests = [];
let allMandates = [];
let allApplications = [];
let mandateSchemaReady = true;
let proposalSchemaReady = true;
let retainerSchemaReady = true;
let docFilter = 'all';
let docSearch = '';
let quotesFilter = 'all';
let invoicesFilter = 'all';
let showArchived = false;
let clientProfileSchemaReady = true;
let bookingSearch = '';
let applicationFilter = 'all';
let applicationSearch = '';
let clientSearch  = '';
let clientPlanFilter = 'all';
let projectSearch = '';
let projectClientFilter = 'all';
let projectPriorityFilter = 'all';
let projectStatusFilter = 'all';
let onboardingStep = 0;
let availabilityFilter = 'all';
let editBookingSlots = [];
let datePicker;
let trendChart;
let confirmedCount = 0;
let onboardingClientId = null;
let onboardingAssetState = {};
let onboardingAccessState = {};
let onboardingChecklistState = {};
let onboardingAssetSchemaReady = true;
const ONBOARDING_TOTAL_STEPS = 5;
const ASSET_ACCEPT = '.pdf,.png,.jpg,.jpeg,.svg,.docx,.xlsx';
const ASSET_STATUSES = ['Missing','Pending','Uploaded','Approved'];
const CLIENT_REPOSITORY_FOLDERS = ['Branding Assets','Company Information','Website Content','Media Assets','Platform Access Notes','OPS Documents'];
const OPS_DOCUMENT_SLOTS = ['Proposal','Quote','Scope of Work','Invoice','Welcome Letter','Monthly Retainer Statement'];
const CLIENT_ASSET_REQUESTS = [
  { key:'company_logo', folder:'Branding Assets', name:'Company logo', required:true, hint:'Primary logo file for profiles, documents, website, and project cards.' },
  { key:'brand_guidelines', folder:'Branding Assets', name:'Brand guidelines', hint:'Any visual identity guide, style guide, or brand reference document.' },
  { key:'brand_colours', folder:'Branding Assets', name:'Brand colours', hint:'Colour palette, swatches, or a short note with preferred brand colours.', rule:'website' },
  { key:'brand_fonts', folder:'Branding Assets', name:'Brand fonts', hint:'Font files, font names, or brand typography guidance.', rule:'website' },
  { key:'company_profile', folder:'Company Information', name:'Company profile / brochure', hint:'Useful background material for tone, positioning, and service context.' },
  { key:'registration_certificate', folder:'Company Information', name:'Company registration certificate', hint:'Optional company registration document where relevant.' },
  { key:'company_address_details', folder:'Company Information', name:'Company address details', hint:'Address support document, lease details, or official address note if needed.' },
  { key:'company_description', folder:'Website Content', name:'Company description', hint:'About copy, elevator pitch, or company story.', rule:'website' },
  { key:'existing_website_content', folder:'Website Content', name:'Existing website content', hint:'Current page copy, sitemap, or exported content.', rule:'website' },
  { key:'service_descriptions', folder:'Website Content', name:'Service descriptions', hint:'Descriptions of services, packages, outcomes, and FAQs.', rule:'content' },
  { key:'team_member_information', folder:'Website Content', name:'Team member information', hint:'Names, roles, bios, and profile details.', rule:'team' },
  { key:'lead_qualification_questions', folder:'Website Content', name:'Lead qualification questions', hint:'Questions OPS should ask prospects before routing or booking.', rule:'lead' },
  { key:'existing_workflows', folder:'Website Content', name:'Existing workflows', hint:'How enquiries, onboarding, payments, approvals, or operations currently work.', rule:'system' },
  { key:'business_process_notes', folder:'Website Content', name:'Business process notes', hint:'Internal notes that help OPS structure the client operating system.', rule:'system' },
  { key:'professional_images', folder:'Media Assets', name:'Professional images', hint:'Photography and images approved for public use.', rule:'website' },
  { key:'team_photographs', folder:'Media Assets', name:'Team photographs', hint:'Team or founder images for web and profile sections.', rule:'team' },
  { key:'product_photographs', folder:'Media Assets', name:'Product photographs', hint:'Product, venue, service, or portfolio imagery.', rule:'website' },
  { key:'marketing_assets', folder:'Media Assets', name:'Marketing assets', hint:'Ads, social media creatives, campaign visuals, and collateral.', rule:'presence' },
  { key:'existing_digital_channels', folder:'Platform Access Notes', name:'Existing digital channels', hint:'List of active social, listing, newsletter, or digital channels.', rule:'presence' }
];
const ACCESS_NOTE_ITEMS = [
  { key:'domain_provider', label:'Domain provider information', placeholder:'Provider name, account owner, DNS notes, and access request status. No passwords.' },
  { key:'hosting_provider', label:'Hosting provider information', placeholder:'Hosting provider, package, account owner, and access request status. No passwords.' },
  { key:'existing_website', label:'Existing website information', placeholder:'Platform/CMS, current site notes, admin contact, and handover notes. No passwords.' }
];
const INTERNAL_CHECKLIST_ITEMS = [
  { key:'logo_received', label:'Logo received' },
  { key:'brand_assets_received', label:'Brand assets received' },
  { key:'content_received', label:'Content received' },
  { key:'images_received', label:'Images received' },
  { key:'access_requirements_received', label:'Access requirements received' }
];
const PROJECT_COLUMNS = [
  ['backlog', 'Backlog'],
  ['todo', 'To Do'],
  ['in_progress', 'In Progress'],
  ['review', 'Review'],
  ['done', 'Done']
];
const SERVICE_STATUSES = ['Active','Pending','Completed','Archived'];
const LIFECYCLE_STAGES = ['Lead','Discovery','Proposal','Agreement','Onboarding','Active','Partner'];
const DOC_STATUSES = ['Draft','Sent','Accepted','Declined'];
const INVOICE_STATUSES = ['Draft','Sent','Paid','Overdue','Cancelled'];
const BANKING_DEFAULTS = {
  bank_name:        'First National Bank',
  account_holder:   'Oak & Pixel Studio',
  account_number:   'XXXXXXXXXX',
  branch_code:      '250655',
  account_type:     'Current',
  payment_reference: '',
};
const PAYMENT_STATUSES = ['Paid','Pending','Overdue','Failed'];

/* ── Premium loading helpers ── */
const _loader = document.getElementById('page-loader');
let _loadCount = 0;
function startLoad() {
  _loadCount++;
  if (_loader) { _loader.classList.remove('loading'); void _loader.offsetWidth; _loader.classList.add('loading'); }
}
function endLoad() {
  if (--_loadCount <= 0) { _loadCount = 0; setTimeout(() => { if (!_loadCount && _loader) _loader.classList.remove('loading'); }, 400); }
}
function _skelCols(cols) {
  const ws = [55,38,65,42,70,45,58,62];
  return Array.from({length:cols},(_,i)=>`<td><span class="skel skel-line" style="width:${ws[i%ws.length]}%"></span></td>`).join('');
}
function skelTable(rows, cols) {
  return `<table class="a-table"><tbody>${Array.from({length:rows},()=>`<tr style="pointer-events:none">${_skelCols(cols)}</tr>`).join('')}</tbody></table>`;
}
function skelActivityRows(n) {
  return `<div style="padding:0 1.5rem">${Array.from({length:n},()=>`
    <div class="activity-row">
      <span class="skel skel-circle" style="width:26px;height:26px;margin-top:.1rem"></span>
      <div class="activity-body" style="display:flex;flex-direction:column;gap:6px">
        <span class="skel skel-line" style="width:62%"></span>
        <span class="skel skel-line" style="width:34%"></span>
      </div>
      <span class="skel skel-line" style="width:36px;flex-shrink:0"></span>
    </div>`).join('')}</div>`;
}
function skelServiceCards(n) {
  return Array.from({length:n},()=>`
    <div class="svc-card" style="pointer-events:none">
      <div style="display:flex;justify-content:space-between;margin-bottom:.45rem">
        <span class="skel skel-line" style="width:55%"></span>
        <span class="skel skel-line" style="width:46px"></span>
      </div>
      <span class="skel skel-line" style="width:30%;margin:.35rem 0 .65rem"></span>
      <span class="skel skel-line" style="width:92%;margin-bottom:.3rem"></span>
      <span class="skel skel-line" style="width:72%"></span>
    </div>`).join('');
}
function skelKanban() {
  const cols = [['Backlog',3],['To Do',2],['In Progress',2],['Review',1],['Done',1]];
  return cols.map(([label,n])=>`
    <section class="kanban-col">
      <div class="kanban-col-head" style="pointer-events:none">
        <span class="skel skel-line" style="width:60px"></span>
        <span class="skel skel-line" style="width:18px;height:18px;border-radius:2px"></span>
      </div>
      <div class="kanban-list">${Array.from({length:n},()=>`
        <div class="project-card" style="pointer-events:none">
          <span class="skel skel-line" style="width:72%;height:14px;margin-bottom:.5rem"></span>
          <span class="skel skel-line" style="width:92%;margin-bottom:.28rem"></span>
          <span class="skel skel-line" style="width:58%"></span>
        </div>`).join('')}</div>
    </section>`).join('');
}
function skelClientProfile() {
  const infoRows = Array.from({length:5},()=>`
    <div class="info-row">
      <span class="skel skel-line" style="width:75px"></span>
      <span class="skel skel-line" style="width:115px"></span>
    </div>`).join('');
  return `
    <div class="profile-hero">
      <div class="profile-id">
        <span class="skel skel-circle" style="width:84px;height:84px"></span>
        <div style="display:flex;flex-direction:column;gap:.55rem;min-width:0">
          <span class="skel skel-line" style="width:190px;height:22px"></span>
          <span class="skel skel-line" style="width:130px;height:13px"></span>
          <span class="skel skel-line" style="width:90px;height:11px"></span>
        </div>
      </div>
    </div>
    <div class="profile-grid">
      <div style="display:flex;flex-direction:column;gap:1rem">
        <div class="mini-panel">
          <div class="mini-panel-head"><span class="skel skel-line" style="width:100px"></span></div>
          <div class="mini-panel-body"><div class="info-list">${infoRows}</div></div>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:1rem">
        <div class="mini-panel">
          <div class="mini-panel-head"><span class="skel skel-line" style="width:80px"></span></div>
          <div class="mini-panel-body">
            <span class="skel skel-line" style="width:90%;margin-bottom:6px"></span>
            <span class="skel skel-line" style="width:70%"></span>
          </div>
        </div>
        <div class="mini-panel">
          <div class="mini-panel-head"><span class="skel skel-line" style="width:70px"></span></div>
          <div class="mini-panel-body"><span class="skel skel-line" style="width:55%"></span></div>
        </div>
      </div>
    </div>`;
}
function btnLoad(el, loading, text) {
  if (!el) return;
  if (loading) {
    el.dataset.origHtml = el.innerHTML;
    el.innerHTML = `<span class="btn-spin"></span>${text || 'Saving…'}`;
    el.disabled = true;
    el.classList.add('btn-loading');
  } else {
    el.innerHTML = el.dataset.origHtml || el.innerHTML;
    el.disabled = false;
    el.classList.remove('btn-loading');
    delete el.dataset.origHtml;
  }
}

/* ── Date helpers ── */
const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const MONTHS_S = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function fmtDate(ds) {
  if (!ds) return '—';
  const d = String(ds).includes('T') ? new Date(ds) : new Date(ds + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return '—';
  return `${d.getDate()} ${MONTHS_S[d.getMonth()]} ${d.getFullYear()}`;
}
function fmtDateLong(ds) {
  if (!ds) return '—';
  const d = String(ds).includes('T') ? new Date(ds) : new Date(ds + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return '—';
  return `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS_S[d.getMonth()]}`;
}
function fmtTime(t) {
  if (!t) return '—';
  const [h, m] = t.slice(0, 5).split(':').map(Number);
  return `${h === 0 ? 12 : h > 12 ? h - 12 : h}:${String(m).padStart(2,'0')} ${h >= 12 ? 'PM' : 'AM'}`;
}
function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60)  return `${Math.max(1, m)}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7)   return `${d}d ago`;
  return fmtDate(iso.split('T')[0]);
}
function todayStr() { return new Date().toISOString().split('T')[0]; }
function esc(v) {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
function clientAddressParts(client = {}) {
  const legacy = client.company_address || '';
  const hasStructured = [
    client.address_line1,
    client.address_line2,
    client.address_suburb,
    client.address_city,
    client.address_province,
    client.address_postal_code,
    client.address_country,
  ].some(Boolean);
  if (!hasStructured && legacy) {
    const lines = String(legacy).split(/\r?\n/).map(v => v.trim()).filter(Boolean);
    const cityParts = (lines[2] || '').split(',').map(v => v.trim()).filter(Boolean);
    return {
      line1: lines[0] || legacy,
      line2: lines[1] || '',
      suburb: cityParts[0] || '',
      city: cityParts[1] || '',
      province: cityParts[2] || '',
      postalCode: cityParts[3] || '',
      country: lines[3] || 'South Africa',
    };
  }
  return {
    line1: client.address_line1 || legacy || '',
    line2: client.address_line2 || '',
    suburb: client.address_suburb || '',
    city: client.address_city || '',
    province: client.address_province || '',
    postalCode: client.address_postal_code || '',
    country: client.address_country || 'South Africa',
  };
}
function composeClientAddress(parts = {}) {
  const cityLine = [parts.suburb, parts.city, parts.province, parts.postalCode].map(v => String(v || '').trim()).filter(Boolean).join(', ');
  const hasAddressDetail = [parts.line1, parts.line2, parts.suburb, parts.city, parts.province, parts.postalCode].some(v => String(v || '').trim());
  return [parts.line1, parts.line2, cityLine, hasAddressDetail ? parts.country : '']
    .map(v => String(v || '').trim())
    .filter(Boolean)
    .join('\n');
}
function clientAddressText(client = {}) {
  return composeClientAddress(clientAddressParts(client));
}
function clientAddressHTML(client = {}) {
  const text = clientAddressText(client);
  return text ? text.split('\n').map(esc).join('<br>') : 'Not set';
}
function compactDate(ds) {
  return ds ? fmtDate(ds) : '—';
}

/* ── Toast ── */
function money(v) {
  const amount = Math.max(0, Number(v) || 0);
  return `R ${amount.toLocaleString('en-ZA')}`;
}
function addDays(date, days) {
  const d = new Date(date + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}
let _pdfBusy = false;
let _pdfLogoDataUrl = null;
let _pdfLogoLoaded = false;
let _pdfSignatureDataUrl = null;
let _pdfSignatureLoaded = false;
const OPS_SIGNATURE_KEY = 'ops-command-center-signature';
const OPS_SIGNATURE_DATE_KEY = 'ops-command-center-signature-date';
function imageToDataUrl(src, maxPx = 200) {
  return new Promise(resolve => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const nat = Math.max(img.naturalWidth || img.width, img.naturalHeight || img.height, 1);
        const scale = Math.min(1, maxPx / nat);
        canvas.width  = Math.round((img.naturalWidth  || img.width)  * scale);
        canvas.height = Math.round((img.naturalHeight || img.height) * scale);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/png'));
      } catch (error) {
        console.warn('PDF logo conversion failed.', error);
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}
async function pdfBrandLogo() {
  if (!_pdfLogoLoaded) {
    _pdfLogoLoaded = true;
    _pdfLogoDataUrl = await imageToDataUrl('images/oak-pixel-mark-hires-transparent.png');
  }
  return _pdfLogoDataUrl;
}
async function pdfSignature() {
  if (!_pdfSignatureLoaded) {
    _pdfSignatureLoaded = true;
    _pdfSignatureDataUrl = getStoredOpsSignature();
  }
  return _pdfSignatureDataUrl;
}
function getStoredOpsSignature() {
  try {
    return localStorage.getItem(OPS_SIGNATURE_KEY) || null;
  } catch (error) {
    return null;
  }
}
function getStoredOpsSignatureDate() {
  try {
    return localStorage.getItem(OPS_SIGNATURE_DATE_KEY) || '';
  } catch (error) {
    return '';
  }
}
function setStoredOpsSignature(dataUrl) {
  try {
    localStorage.setItem(OPS_SIGNATURE_KEY, dataUrl);
    localStorage.setItem(OPS_SIGNATURE_DATE_KEY, new Date().toISOString());
  } catch (error) {
    toast('Signature could not be saved in this browser.');
    return false;
  }
  _pdfSignatureLoaded = false;
  _pdfSignatureDataUrl = null;
  return true;
}
function removeStoredOpsSignature() {
  try {
    localStorage.removeItem(OPS_SIGNATURE_KEY);
    localStorage.removeItem(OPS_SIGNATURE_DATE_KEY);
  } catch (error) {}
  _pdfSignatureLoaded = false;
  _pdfSignatureDataUrl = null;
}
async function generatePDF(templateHTML, filename, { returnBase64 = false } = {}) {
  if (_pdfBusy) return null;
  _pdfBusy = true;
  let _base64Result = null;
  try {
    const PDF = window.jspdf?.jsPDF || window.jsPDF;
    if (!PDF) throw new Error('jsPDF is not available.');
    const parsed = new DOMParser().parseFromString(templateHTML, 'text/html');
    const root = parsed.querySelector('.pdf-wrap') || parsed.body;
    const printableText = (root.textContent || '').replace(/\s+/g, ' ').trim();
    if (!printableText) throw new Error('PDF template rendered without printable content.');

    const doc = new PDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
    const pageW = 210;
    const pageH = 297;
    const margin = 16;
    const contentW = pageW - margin * 2;
    let y = 18;

    const clean = value => String(value || '').replace(/\s+/g, ' ').trim();
    const nodeText = el => {
      if (!el) return '';
      const clone = el.cloneNode(true);
      clone.querySelectorAll('br').forEach(br => br.replaceWith('\n'));
      return clone.textContent.replace(/\n\s+/g, '\n').replace(/[ \t]+/g, ' ').trim();
    };
    const pageBreak = height => {
      if (y + height <= pageH - 18) return;
      doc.addPage();
      y = 18;
    };
    const setInk = () => doc.setTextColor(26, 26, 24);
    const setMuted = () => doc.setTextColor(107, 107, 100);
    const writeWrapped = (text, x, maxW, lineH = 5) => {
      const lines = doc.splitTextToSize(text || '-', maxW);
      pageBreak(lines.length * lineH + 2);
      doc.text(lines, x, y);
      y += lines.length * lineH;
      return lines;
    };
    const drawRule = () => {
      doc.setDrawColor(184, 149, 90);
      doc.setLineWidth(0.25);
      doc.line(margin, y, pageW - margin, y);
      y += 9;
    };
    const drawSectionTitle = text => {
      pageBreak(10);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      setInk();
      doc.text(clean(text).toUpperCase(), margin, y);
      y += 6;
    };
    const drawBody = text => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      setInk();
      String(text || '-').split(/\n+/).filter(Boolean).forEach(part => {
        writeWrapped(part, margin, contentW, 5);
        y += 2;
      });
      y += 2;
    };
    const drawTable = table => {
      const headerCells = [...table.querySelectorAll('thead th')].map(th => clean(th.textContent));
      const bodyRows = [...table.querySelectorAll('tbody tr')].map(tr => ({
        total: tr.classList.contains('total'),
        cells: [...tr.children].map(td => clean(td.textContent))
      }));
      const colCount = Math.max(headerCells.length, ...bodyRows.map(r => r.cells.length), 1);
      const colW = contentW / colCount;
      pageBreak(14);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      setMuted();
      doc.setFillColor(250, 249, 244);
      doc.rect(margin, y - 4, contentW, 8, 'F');
      headerCells.forEach((h, i) => doc.text(h.toUpperCase(), margin + i * colW + 2, y));
      y += 7;
      doc.setDrawColor(224, 223, 216);
      bodyRows.forEach(row => {
        doc.setFont('helvetica', row.total ? 'bold' : 'normal');
        doc.setFontSize(8.7);
        setInk();
        const wrapped = Array.from({ length: colCount }, (_, i) => doc.splitTextToSize(row.cells[i] || '-', colW - 4));
        const rowH = Math.max(8, Math.max(...wrapped.map(lines => lines.length)) * 4.2 + 4);
        pageBreak(rowH + 2);
        doc.line(margin, y - 3, pageW - margin, y - 3);
        wrapped.forEach((lines, i) => doc.text(lines, margin + i * colW + 2, y));
        y += rowH;
      });
      y += 5;
    };
    const drawTiles = () => {
      const tiles = [...root.querySelectorAll('.pdf-tile')].map(tile => ({
        label: clean(tile.querySelector('.pdf-tile-lbl')?.textContent),
        value: clean(tile.querySelector('.pdf-tile-val')?.textContent)
      }));
      if (!tiles.length) return;
      const gap = 4;
      const tileW = (contentW - gap * 2) / 3;
      for (let i = 0; i < tiles.length; i += 3) {
        pageBreak(21);
        tiles.slice(i, i + 3).forEach((tile, idx) => {
          const x = margin + idx * (tileW + gap);
          doc.setDrawColor(224, 223, 216);
          doc.rect(x, y, tileW, 16);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7);
          setMuted();
          doc.text((tile.label || '-').toUpperCase(), x + 3, y + 5);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9.5);
          setInk();
          doc.text(doc.splitTextToSize(tile.value || '-', tileW - 6), x + 3, y + 11);
        });
        y += 22;
      }
    };
    const drawPreparedFor = () => {
      const clientLines = nodeText(root.querySelector('.pdf-client-lines'));
      if (!clientLines) return;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      const lines = doc.splitTextToSize(clientLines, contentW - 14);
      const blockH = Math.max(23, lines.length * 4.4 + 13);
      pageBreak(blockH + 8);
      doc.setFillColor(250, 249, 244);
      doc.setDrawColor(224, 223, 216);
      doc.rect(margin, y, contentW, blockH, 'FD');
      doc.setFont('courier', 'normal');
      doc.setFontSize(7);
      setMuted();
      doc.text('PREPARED FOR', margin + 6, y + 6);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.8);
      setInk();
      doc.text(lines, margin + 6, y + 14);
      y += blockH + 8;
    };
    const drawOpsSignatureBlock = () => {
      if (!signature) return;
      pageBreak(36);
      doc.setDrawColor(224, 223, 216);
      doc.setFillColor(250, 249, 244);
      doc.rect(margin, y, contentW, 28, 'FD');
      try { doc.addImage(signature, 'PNG', margin + 5, y + 3, 48, 16); } catch(e) {}
      doc.setFont('courier', 'normal');
      doc.setFontSize(7);
      setMuted();
      doc.text('DIGITALLY SIGNED BY', margin + 60, y + 8);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      setInk();
      doc.text('Neo Matime', margin + 60, y + 15);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.text('Founder & CEO, Oak & Pixel Studio', margin + 60, y + 21);
      y += 36;
    };

    const docNum = clean(root.querySelector('.pdf-doc-num')?.textContent) || filename.replace(/\.pdf$/i, '');
    const [logo, signature] = await Promise.all([pdfBrandLogo(), pdfSignature()]);
    if (logo) {
      try {
        doc.addImage(logo, 'PNG', margin, y - 7, 9, 9);
      } catch (error) {
        console.warn('PDF logo embed failed.', error);
      }
    }
    doc.setFont('times', 'normal');
    doc.setFontSize(20);
    setInk();
    doc.text('Oak & Pixel Studio', margin + (logo ? 12 : 0), y);
    doc.setFont('courier', 'normal');
    doc.setFontSize(8);
    setMuted();
    doc.text(docNum, pageW - margin, y, { align: 'right' });
    y += 10;
    drawRule();

    doc.setFont('times', 'normal');
    doc.setFontSize(18);
    setInk();
    writeWrapped(clean(root.querySelector('.pdf-title')?.textContent) || 'Document', margin, contentW, 9);
    y += 2;
    doc.setFont('courier', 'normal');
    doc.setFontSize(8);
    setMuted();
    writeWrapped(clean(root.querySelector('.pdf-subtitle')?.textContent), margin, contentW, 4);
    y += 7;
    drawPreparedFor();
    drawTiles();

    [...root.children].forEach(child => {
      if (child.matches('.pdf-header,.pdf-client-row,.pdf-title,.pdf-subtitle,.pdf-tiles,.pdf-footer') || child.tagName === 'HR') return;
      if (child.classList.contains('pdf-section-title')) drawSectionTitle(child.textContent);
      else if (child.classList.contains('pdf-body-text')) drawBody(nodeText(child));
      else if (child.matches('table.pdf-items')) drawTable(child);
      else if (child.classList.contains('pdf-tags')) drawBody(nodeText(child));
      else if (child.classList.contains('pdf-bank')) {
        drawSectionTitle(child.querySelector('.pdf-bank-title')?.textContent || 'Banking Details');
        drawBody(nodeText(child.querySelector('.pdf-bank-body')));
      } else if (child.classList.contains('pdf-ops-signature')) {
        drawOpsSignatureBlock();
      } else if (child.classList.contains('pdf-sig-block')) {
        pageBreak(50);
        const sigW = (contentW - 16) / 2;
        if (signature) {
          try { doc.addImage(signature, 'PNG', margin, y, 48, 17); } catch(e) {}
        }
        doc.setDrawColor(26, 26, 24);
        doc.line(margin, y + 20, margin + sigW, y + 20);
        doc.line(margin + sigW + 16, y + 20, pageW - margin, y + 20);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        setInk();
        doc.text('Neo Matime', margin, y + 26);
        doc.setFont('helvetica', 'normal');
        doc.text('Founder & CEO, Oak & Pixel Studio', margin, y + 31);
        doc.setFont('helvetica', 'bold');
        doc.text(clean(child.querySelector('.pdf-sig-col:last-child strong')?.textContent) || 'Client', margin + sigW + 16, y + 26);
        doc.setFont('helvetica', 'normal');
        doc.text('Authorised Signatory & Date', margin + sigW + 16, y + 31);
        y += 40;
      }
    });

    const pages = doc.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i);
      doc.setDrawColor(224, 223, 216);
      doc.line(margin, pageH - 15, pageW - margin, pageH - 15);
      doc.setFont('courier', 'normal');
      doc.setFontSize(7);
      setMuted();
      doc.text('Oak & Pixel Studio | info@oakandpixel.co.za', margin, pageH - 9);
      doc.text(`Page ${i} of ${pages}`, pageW - margin, pageH - 9, { align: 'right' });
    }

    if (returnBase64) {
      _base64Result = doc.output('datauristring').split(',')[1];
    } else {
      doc.save(filename);
    }
  } catch (error) {
    console.error(error);
    toast('PDF could not be generated. Please try again.');
  } finally {
    const zone = $('pdf-render-zone');
    if (zone) zone.setAttribute('style', 'display:none;');
    _pdfBusy = false;
  }
  return _base64Result;
}

function _pdfStyles() {
  return `<style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Jost',sans-serif;color:#1a1a18;font-size:11pt;line-height:1.5}
    .pdf-wrap{padding:0;color:#1a1a18;font-family:'Jost',sans-serif;font-size:11pt;line-height:1.5}
    .pdf-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:1.5rem}
    .pdf-logo{font-family:'Jost',sans-serif;font-weight:700;font-size:18pt;letter-spacing:.04em}
    .pdf-doc-num{font-family:'DM Mono',monospace;font-size:8pt;color:#6b6b64;padding-top:.3rem}
    .pdf-rule{border:none;border-top:1px solid #B8955A;margin:1rem 0}
    .pdf-client-row{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:1.5rem}
    .pdf-client-info{display:flex;align-items:flex-start;gap:.75rem;font-size:9pt;color:#4a4a42;max-width:70%}
    .pdf-client-logo{width:42px;height:42px;border:1px solid #d7d2c4;background:#f4f1e8;display:flex;align-items:center;justify-content:center;flex:0 0 42px;font-family:'DM Mono',monospace;font-size:9pt;color:#165c3a;letter-spacing:.06em;overflow:hidden}
    .pdf-client-logo img{width:100%;height:100%;object-fit:cover;display:block}
    .pdf-client-lines{text-align:left}
    .pdf-title{font-family:'Cormorant Garamond',serif;font-size:28pt;font-weight:600;margin-bottom:.3rem}
    .pdf-subtitle{font-family:'DM Mono',monospace;font-size:8pt;text-transform:uppercase;letter-spacing:.08em;color:#6b6b64;margin-bottom:1.5rem}
    .pdf-tiles{display:flex;gap:1rem;margin-bottom:1.5rem}
    .pdf-tile{flex:1;border:1px solid #e0dfd8;border-radius:4px;padding:.75rem}
    .pdf-tile-lbl{font-size:8pt;text-transform:uppercase;letter-spacing:.06em;color:#6b6b64;margin-bottom:.25rem}
    .pdf-tile-val{font-size:11pt;font-weight:600}
    table.pdf-items{width:100%;border-collapse:collapse;margin-bottom:1.5rem}
    table.pdf-items th{text-align:left;font-size:8pt;text-transform:uppercase;letter-spacing:.06em;color:#6b6b64;padding:.5rem;border-bottom:1px solid #e0dfd8}
    table.pdf-items td{padding:.6rem .5rem;border-bottom:1px solid #f0efe8;font-size:10pt}
    table.pdf-items tr.total td{font-weight:700;border-top:2px solid #B8955A;border-bottom:none}
    .pdf-bank{border:1px solid #e0dfd8;background:#faf9f4;padding:.85rem 1rem;margin:0 0 1.5rem}
    .pdf-bank-title{font-size:8pt;text-transform:uppercase;letter-spacing:.08em;color:#6b6b64;margin-bottom:.35rem}
    .pdf-bank-body{font-size:10pt;line-height:1.55;color:#1A1A18;white-space:pre-line}
    .pdf-bank-lbl{font-weight:600;color:#6b6b64}
    .pdf-footer{margin-top:2rem;padding-top:1rem;border-top:1px solid #e0dfd8;font-size:8pt;color:#6b6b64;display:flex;justify-content:space-between}
    .pdf-section-title{font-size:9pt;font-weight:700;text-transform:uppercase;letter-spacing:.06em;margin-bottom:.5rem;color:#2d2d2b}
    .pdf-body-text{font-size:10pt;margin-bottom:1rem;color:#2d2d2b}
    .pdf-sig-block{display:flex;gap:2rem;margin-top:2rem}
    .pdf-sig-col{flex:1;border-top:1px solid #1a1a18;padding-top:.5rem;font-size:9pt}
    .pdf-mini-note{border-left:2px solid #B8955A;padding:.65rem .85rem;background:#faf9f4;margin:0 0 1rem;font-size:9pt;color:#4a4a42}
    .pdf-tags{display:flex;flex-wrap:wrap;gap:.35rem;margin:.25rem 0 1rem}
    .pdf-tag{border:1px solid #e0dfd8;padding:.2rem .45rem;font-size:8pt;color:#4a4a42}
  </style>`;
}

function _pdfHeader(docNum) {
  return `<div class="pdf-header">
    <div class="pdf-logo">Oak &amp; Pixel Studio</div>
    <div class="pdf-doc-num">${docNum}</div>
  </div>
  <hr class="pdf-rule">`;
}

function _pdfClientBlock(client) {
  const logo = client.logo_url
    ? `<img src="${esc(client.logo_url)}" alt="${esc(client.company || client.full_name || 'Client')} logo">`
    : esc(clientInitials(client));
  const address = clientAddressText(client);
  return `<div class="pdf-client-row">
    <div></div>
    <div class="pdf-client-info">
      <div class="pdf-client-logo">${logo}</div>
      <div class="pdf-client-lines">
        <strong>${esc(client.company || client.full_name || '')}</strong><br>
        ${client.full_name ? `${esc(client.full_name)}${client.position ? `, ${esc(client.position)}` : ''}<br>` : ''}
        ${address ? address.split('\n').map(esc).join('<br>') + '<br>' : ''}
        ${esc(client.company_email || client.email || '')}<br>
        ${esc(client.company_phone || client.phone || '')}
      </div>
    </div>
  </div>`;
}

function _pdfLineItems(doc) {
  const items = doc.additional_items || [];
  const rows = [
    { label: 'Setup Fee', amount: doc.setup_fee },
    { label: 'Monthly Retainer', amount: doc.monthly_retainer },
    ...items
  ].filter(r => Number(r.amount) > 0);
  return `<table class="pdf-items">
    <thead><tr><th>Description</th><th style="text-align:right">Amount</th></tr></thead>
    <tbody>
      ${rows.map(r => `<tr><td>${esc(r.label)}</td><td style="text-align:right">${money(Number(r.amount))}</td></tr>`).join('')}
      <tr class="total"><td>Total</td><td style="text-align:right">${money(doc.total_amount)}</td></tr>
    </tbody>
  </table>`;
}

function _pdfFooter() {
  return `<div class="pdf-footer">
    <span>Oak &amp; Pixel Studio &middot; info@oakandpixel.co.za</span>
    <span>Generated: ${new Date().toLocaleDateString('en-ZA')}</span>
  </div>`;
}

function _pdfBankingDetails(invoice) {
  const b = k => invoice[k] || BANKING_DEFAULTS[k] || '';
  const rows = [
    ['Bank Name',         b('bank_name')],
    ['Account Holder',    b('account_holder')],
    ['Account Number',    b('account_number')],
    ['Branch Code',       b('branch_code')],
    ['Account Type',      b('account_type')],
    ['Payment Reference', b('payment_reference')],
  ].filter(([, v]) => v);
  if (!rows.length) return '';
  return `<div class="pdf-bank">
    <div class="pdf-bank-title">Banking Details</div>
    <div class="pdf-bank-body">${rows.map(([l,v]) => `<span class="pdf-bank-lbl">${l}:</span> ${esc(v)}`).join('<br>')}</div>
  </div>`;
}

/* Dynamic document template layer. Every document (quote, invoice, proposal,
   SOW, welcome letter) is built from one shared _documentTemplate. */
function _pdfText(value) {
  return esc(value || '').replace(/\n/g, '<br>');
}

function _pdfTiles(tiles = []) {
  const rows = tiles.filter(t => t && t.label);
  if (!rows.length) return '';
  return `<div class="pdf-tiles">${rows.map(t => `
    <div class="pdf-tile">
      <div class="pdf-tile-lbl">${esc(t.label)}</div>
      <div class="pdf-tile-val">${esc(t.value || '-')}</div>
    </div>`).join('')}</div>`;
}

function _pdfSections(sections = [], numbered = false) {
  return sections
    .filter(s => s && s.title && s.body)
    .map((s, i) => `<div class="pdf-section-title">${numbered ? `${i + 1}. ` : ''}${esc(s.title)}</div><div class="pdf-body-text">${_pdfText(s.body)}</div>`)
    .join('');
}

function _pdfTable(title, headers, rows) {
  const body = (rows || []).filter(Boolean);
  if (!body.length) return '';
  return `${title ? `<div class="pdf-section-title">${esc(title)}</div>` : ''}
    <table class="pdf-items">
      <thead><tr>${headers.map(h => `<th${h.align === 'right' ? ' style="text-align:right"' : ''}>${esc(h.label)}</th>`).join('')}</tr></thead>
      <tbody>
        ${body.map(row => `<tr${row.total ? ' class="total"' : ''}>${row.cells.map((cell, i) => `<td${headers[i]?.align === 'right' ? ' style="text-align:right"' : ''}>${cell.html ? cell.value : esc(cell.value || '-')}</td>`).join('')}</tr>`).join('')}
      </tbody>
    </table>`;
}

function _documentTemplate({ docNum, client = {}, title, subtitle, tiles = [], sections = [], numberedSections = false, html = '', signatures = false }) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">${_pdfStyles()}</head><body><div class="pdf-wrap">
    ${_pdfHeader(docNum)}
    ${_pdfClientBlock(client)}
    <div class="pdf-title">${esc(title)}</div>
    <div class="pdf-subtitle">${esc(subtitle)}</div>
    ${_pdfTiles(tiles)}
    ${_pdfSections(sections, numberedSections)}
    ${html}
    ${signatures ? `<div class="pdf-sig-block">
      <div class="pdf-sig-col"><strong>Oak &amp; Pixel Studio</strong><br><br><br>Signature &amp; Date</div>
      <div class="pdf-sig-col"><strong>${esc(client.company || client.full_name || 'Client')}</strong><br><br><br>Signature &amp; Date</div>
    </div>` : '<div class="pdf-ops-signature"></div>'}
    ${_pdfFooter()}
  </div></body></html>`;
}

const AGREEMENT_TYPES = [
  { key: 'msa', label: 'Master Services Agreement (MSA)', number: 'MSA' },
  { key: 'nda', label: 'NDA', number: 'NDA' },
  { key: 'debit-order', label: 'Debit Order Mandate', number: 'DOM' }
];

function agreementNumber(kind, client = {}) {
  const type = AGREEMENT_TYPES.find(a => a.key === kind) || AGREEMENT_TYPES[0];
  return `${type.number}-${todayStr().replace(/-/g, '')}-${String(client.id || 'CLIENT').slice(0, 6).toUpperCase()}`;
}

function serviceContextText(doc, client, docType) {
  const clientName = clientDisplayName(client);
  const serviceName = doc.service_name || doc.title || client.selected_plan || 'Oak & Pixel Studio service';
  return `${docType} prepared by Oak & Pixel Studio for ${clientName}. This document relates to ${serviceName} and should be read together with the agreed service scope, client onboarding details, payment terms, and any approved proposal or scope of work.`;
}

function clientPartyText(client = {}) {
  return `Oak & Pixel Studio is the service provider. ${clientDisplayName(client)} is the client and is responsible for ensuring that its nominated contact, approvers, billing contact, and technical representatives have authority to make decisions for the engagement.`;
}

function commercialProtectionText(docType) {
  return `${docType} covers only the services, deliverables, dates, and fees expressly recorded in this document or an approved linked scope. Anything not expressly included is out of scope and may require a written change request, revised quote, adjusted timeline, or additional fee before work begins.`;
}

function operationalProtectionText() {
  return 'Delivery depends on timely client inputs, approvals, access credentials, brand assets, content, third-party platform access, and accurate business information. Delays caused by missing inputs, late approvals, unavailable systems, or changed requirements may move delivery dates without placing Oak & Pixel Studio in breach.';
}

function paymentProtectionText() {
  return 'Fees remain payable according to the relevant quote, invoice, agreement, or retainer schedule. Late, failed, reversed, or disputed payments may result in paused delivery, suspended support, delayed handover, or restricted access until the account is brought up to date. Previously approved work and incurred costs remain payable.';
}

function ipProtectionText() {
  return 'After full payment, the client owns final approved client-specific deliverables created for the engagement. Oak & Pixel Studio retains ownership of its pre-existing methods, reusable components, templates, internal systems, source libraries, know-how, strategy frameworks, and non-client-specific assets. Third-party software, plugins, fonts, platforms, stock assets, and integrations remain subject to their own licence terms.';
}

function riskProtectionText() {
  return 'Oak & Pixel Studio is not responsible for third-party platform outages, hosting interruptions, payment gateway failures, domain registrar issues, search engine or social platform changes, client-side data errors, unsupported client modifications, force majeure events, or business losses that could not reasonably be controlled by Oak & Pixel Studio. Any liability should be limited to fees paid for the affected service unless a signed agreement states otherwise.';
}

function confidentialityProtectionText() {
  return 'Both parties must protect confidential information. This includes client business information, customer data, credentials, commercial terms, Oak & Pixel Studio methodologies, internal systems, workflows, templates, pricing logic, and intellectual property. Information should only be used for the approved engagement and shared with people who need it for delivery.';
}

function complianceNoteText() {
  return 'The parties should handle personal information, payment information, access credentials, and client data in line with applicable South African law, reasonable security practices, and agreed business purposes. This template is a commercial operating document and should be reviewed by a qualified legal adviser where formal legal execution is required.';
}

function acceptanceText(docType) {
  return `Approval, payment, signature, written confirmation, or continued instruction to proceed may be treated as acceptance of this ${docType}, including its scope, dependencies, fees, responsibilities, and limitations.`;
}

function docText(value, fallback) {
  const text = String(value || '').trim();
  return text || fallback;
}

function clientPlanName(client = {}) {
  return client.selected_plan || client.project_type || 'Selected plan';
}

function defaultSowMilestones() {
  return 'Recommended milestones: onboarding and discovery; structure, content, and access confirmation; design, build, or system configuration; internal quality review; client review and agreed revisions; launch, handover, or activation; first optimization or support checkpoint.';
}

function defaultSowTimeline() {
  return 'The delivery timeline will be confirmed once onboarding inputs, platform access, content, and approvals are available. Dates may move where client inputs, third-party platform availability, approved change requests, or late approvals affect the planned sequence of work.';
}

function defaultSowResponsibilities() {
  return 'Oak & Pixel Studio will plan, design, build, configure, review, and support the approved deliverables using reasonable professional care. The client will provide accurate business information, timely approvals, content, brand assets, billing details, required system access, and an authorized decision maker.';
}

function defaultSowAssumptions() {
  return 'This SOW assumes the selected plan, approved proposal, service requirements, and commercial terms remain stable; the client has authority to use supplied content and assets; required access can be provided promptly; and there are no undisclosed technical, legal, brand, hosting, or platform constraints that materially change delivery.';
}

function defaultSowExclusions() {
  return 'Unless expressly included, this SOW excludes paid advertising management, formal legal drafting, advanced data migration, custom integrations, additional pages or features, third-party licence fees, emergency support, unsupported platform repairs, and rework caused by changed instructions, late content, or client-side modifications.';
}

function defaultWelcomeMessage(client = {}) {
  const clientName = clientDisplayName(client);
  return `Welcome to Oak & Pixel Studio. We are pleased to begin this partnership with ${clientName}. Our role is to help translate your digital presence, client journey, and operating systems into a more refined, reliable, and commercially useful experience.`;
}

function defaultWelcomeInfo() {
  return 'To keep onboarding efficient, please confirm the primary decision maker, billing contact, brand assets, website/domain/hosting access, platform credentials, preferred communication channel, and any time-sensitive launch dates. Access credentials should be shared through secure channels only and may be removed or rotated after handover where appropriate.';
}

function quoteTemplate(quote, client) {
  return _documentTemplate({
    docNum: quote.quote_number,
    client,
    title: quote.service_name || 'Quotation',
    subtitle: `Quote | ${compactDate(quote.quote_date)}`,
    tiles: [
      { label: 'Quote Date', value: compactDate(quote.quote_date) },
      { label: 'Valid Until', value: compactDate(quote.expiry_date) },
      { label: 'Status', value: quote.status }
    ],
    sections: [
      { title: 'Executive Summary', body: serviceContextText(quote, client, 'Quote') },
      { title: 'Parties Involved', body: clientPartyText(client) },
      { title: 'Purpose and Scope', body: quote.description || `${quote.service_name || 'The selected service'} includes the setup work, delivery support, and ongoing care required to establish or improve the client digital operating system.` },
      { title: 'Scope Boundaries', body: commercialProtectionText('This quote') },
      { title: 'Payment Terms', body: `${paymentProtectionText()} Setup fees cover project preparation and implementation. Monthly retainers cover recurring service delivery, optimization, support, and agreed ongoing tasks.` },
      { title: 'Client Dependencies', body: operationalProtectionText() },
      { title: 'Intellectual Property', body: ipProtectionText() },
      { title: 'Confidentiality', body: confidentialityProtectionText() },
      { title: 'Risk Management', body: riskProtectionText() },
      { title: 'Compliance Notes', body: complianceNoteText() },
      { title: 'Approval and Acceptance', body: `${acceptanceText('quote')} Quote acceptance authorizes Oak & Pixel Studio to prepare onboarding, schedule service delivery, and issue any required agreement documents.` }
    ],
    html: _pdfLineItems(quote)
  });
}

function invoiceTemplate(invoice, client) {
  return _documentTemplate({
    docNum: invoice.invoice_number,
    client,
    title: invoice.service_name || 'Invoice',
    subtitle: `Invoice | ${compactDate(invoice.invoice_date)}`,
    tiles: [
      { label: 'Invoice Date', value: compactDate(invoice.invoice_date) },
      { label: 'Due Date', value: compactDate(invoice.due_date) },
      { label: 'Status', value: invoice.payment_status }
    ],
    sections: [
      { title: 'Executive Summary', body: serviceContextText(invoice, client, 'Invoice') },
      { title: 'Parties Involved', body: clientPartyText(client) },
      { title: 'Service Context', body: invoice.description || `${invoice.service_name || 'The selected service'} reflects approved setup, retainer, recurring support, or delivery work for the client account.` },
      { title: 'Payment Obligations', body: `${paymentProtectionText()} Please use the invoice number as payment reference.` },
      { title: 'Service Suspension', body: 'Oak & Pixel Studio may pause active delivery, support, handover, maintenance, publishing, or new work where an invoice is overdue, disputed without reasonable basis, reversed, or unpaid after reminder.' },
      { title: 'Risk and Compliance Notes', body: `${riskProtectionText()} ${complianceNoteText()}` },
      { title: 'Acceptance', body: 'Payment of this invoice confirms the commercial record for the listed services and does not remove the need to comply with any signed agreement, scope of work, retainer terms, or change request.' }
    ],
    html: `${_pdfLineItems(invoice)}${_pdfBankingDetails(invoice)}`
  });
}

function proposalTemplate(proposal, client) {
  const investment = _pdfTable('Investment', [
    { label: 'Item' },
    { label: 'Amount', align: 'right' }
  ], [
    Number(proposal.setup_fee) > 0 ? { cells: [{ value: 'Setup Fee' }, { value: money(proposal.setup_fee) }] } : null,
    Number(proposal.monthly_retainer) > 0 ? { cells: [{ value: 'Monthly Retainer' }, { value: money(proposal.monthly_retainer) }] } : null,
    { total: true, cells: [{ value: 'Total' }, { value: money(proposal.total_amount) }] }
  ]);
  return _documentTemplate({
    docNum: proposal.proposal_number,
    client,
    title: proposal.title || 'Proposal',
    subtitle: `Proposal | ${compactDate(proposal.proposal_date)}`,
    tiles: [
      { label: 'Proposal Date', value: compactDate(proposal.proposal_date) },
      { label: 'Expiry Date', value: compactDate(proposal.expiry_date) },
      { label: 'Status', value: proposal.status }
    ],
    sections: [
      { title: 'Executive Summary', body: proposal.executive_summary || `Oak & Pixel Studio proposes a focused digital delivery engagement for ${clientDisplayName(client)}, designed to improve presentation, systems, client experience, operational clarity, and long-term digital reliability.` },
      { title: 'Parties Involved', body: clientPartyText(client) },
      { title: 'Purpose', body: serviceContextText(proposal, client, 'Proposal') },
      { title: 'Challenges', body: proposal.challenges },
      { title: 'Our Solution', body: proposal.solution || 'The proposed solution combines premium web experience, workflow structure, service delivery discipline, and ongoing optimization so the client can operate with more confidence online.' },
      { title: 'Deliverables', body: proposal.deliverables },
      { title: 'Timeline', body: proposal.timeline },
      { title: 'Scope Boundaries and Change Requests', body: commercialProtectionText('This proposal') },
      { title: 'Client Responsibilities', body: operationalProtectionText() },
      { title: 'Payment Terms', body: paymentProtectionText() },
      { title: 'Intellectual Property', body: ipProtectionText() },
      { title: 'Confidentiality', body: confidentialityProtectionText() },
      { title: 'Risk and Compliance Notes', body: `${riskProtectionText()} ${complianceNoteText()}` },
      { title: 'Next Steps and Acceptance', body: proposal.next_steps || `${acceptanceText('proposal')} Once approved, Oak & Pixel Studio will confirm onboarding requirements, prepare the scope of work, issue the required agreements, and schedule the project kickoff.` }
    ],
    html: investment,
    signatures: true
  });
}

function sowTemplate(scope, client, proposal) {
  const plan = clientPlanName(client);
  const commercialRows = [
    { cells: [{ value: 'Client Plan' }, { value: plan }] },
    proposal?.proposal_number ? { cells: [{ value: 'Linked Proposal' }, { value: proposal.proposal_number }] } : null,
    Number(proposal?.setup_fee) > 0 ? { cells: [{ value: 'Setup Fee' }, { value: money(proposal.setup_fee) }] } : null,
    Number(proposal?.monthly_retainer) > 0 ? { cells: [{ value: 'Monthly Retainer' }, { value: money(proposal.monthly_retainer) }] } : null,
    Number(proposal?.total_amount) > 0 ? { total: true, cells: [{ value: 'Commercial Total' }, { value: money(proposal.total_amount) }] } : null
  ];
  const commercialSummary = _pdfTable('Commercial Summary', [
    { label: 'Item' },
    { label: 'Detail' }
  ], commercialRows);

  return _documentTemplate({
    docNum: scope.scope_number,
    client,
    title: scope.title || 'Scope of Work',
    subtitle: `SOW | ${compactDate(scope.scope_date)}${proposal ? ` | Ref: ${proposal.proposal_number}` : ''}`,
    tiles: [
      { label: 'Scope Date', value: compactDate(scope.scope_date) },
      { label: 'Status', value: scope.status },
      { label: 'Linked Proposal', value: proposal?.proposal_number || '-' }
    ],
    numberedSections: true,
    sections: [
      { title: 'Executive Summary', body: `${serviceContextText(scope, client, 'Scope of Work')} This SOW is intended to keep the engagement clear, controlled, and commercially accountable from kickoff through handover.` },
      { title: 'Parties Involved', body: clientPartyText(client) },
      { title: 'Purpose', body: 'This Scope of Work translates the approved commercial intent into a practical delivery record. It defines what Oak & Pixel Studio will deliver, what the client must provide, and how changes, approvals, and delays will be handled.' },
      { title: 'Deliverables', body: docText(scope.deliverables || proposal?.deliverables, 'Deliverables are limited to the items expressly listed in this SOW, the approved proposal, or a written change request accepted by Oak & Pixel Studio. Any delivery item not written into the approved scope should be treated as out of scope until confirmed in writing.') },
      { title: 'Milestones and Delivery Flow', body: docText(scope.milestones, defaultSowMilestones()) },
      { title: 'Timeline and Dependencies', body: docText(scope.timeline || proposal?.timeline, defaultSowTimeline()) },
      { title: 'Responsibilities', body: docText(scope.responsibilities, defaultSowResponsibilities()) },
      { title: 'Communication and Approvals', body: 'The client should appoint one primary decision maker for feedback, approvals, access coordination, and priority calls. Feedback should be consolidated before submission. Delayed, conflicting, or incomplete feedback may extend timelines and may require rescheduling of delivery work.' },
      { title: 'Scope Boundaries and Change Requests', body: commercialProtectionText('This SOW') },
      { title: 'Revision and Acceptance Standard', body: 'Revisions are limited to the agreed scope, approved direction, and reasonable refinement of the listed deliverables. A deliverable may be treated as accepted once approved in writing, paid for, published, used in production, or left without material feedback after a reasonable review period.' },
      { title: 'Assumptions', body: docText(scope.assumptions, defaultSowAssumptions()) },
      { title: 'Exclusions', body: docText(scope.exclusions, defaultSowExclusions()) },
      { title: 'Payment Terms', body: paymentProtectionText() },
      { title: 'Intellectual Property', body: ipProtectionText() },
      { title: 'Confidentiality', body: confidentialityProtectionText() },
      { title: 'Risk, Platforms, and Compliance Notes', body: `${riskProtectionText()} ${complianceNoteText()}` },
      { title: 'Approval and Acceptance', body: `${acceptanceText('scope of work')} Acceptance authorizes Oak & Pixel Studio to schedule work, request access and assets, and treat the listed deliverables as the controlling delivery record for this engagement.` }
    ],
    html: commercialSummary,
    signatures: true
  });
}

function welcomeLetterTemplate(letter, client) {
  const services = (letter.assigned_services || []).join(', ') || '-';
  const details = _pdfTable('Client Setup', [
    { label: 'Detail' },
    { label: 'Information' }
  ], [
    { cells: [{ value: 'Plan' }, { value: client.selected_plan || '-' }] },
    { cells: [{ value: 'Start Date' }, { value: compactDate(client.project_start_date) }] },
    { cells: [{ value: 'Primary Contact' }, { value: client.full_name || '-' }] },
    { cells: [{ value: 'Contact Email' }, { value: client.email || client.company_email || '-' }] },
    { cells: [{ value: 'Contact Phone' }, { value: client.phone || client.company_phone || '-' }] },
    { cells: [{ value: 'Services' }, { value: services }] }
  ]);
  const checklist = _pdfTable('Onboarding Checklist', [
    { label: 'Area' },
    { label: 'Expectation' }
  ], [
    { cells: [{ value: 'Decision Maker' }, { value: 'Confirm the person authorized to approve direction, scope decisions, launch timing, and commercial changes.' }] },
    { cells: [{ value: 'Assets and Content' }, { value: 'Provide brand assets, copy, imagery, service information, credentials, and any existing platform details needed for delivery.' }] },
    { cells: [{ value: 'Approvals' }, { value: 'Keep feedback consolidated, clear, and timely so delivery dates and review windows remain practical.' }] },
    { cells: [{ value: 'Billing and Access' }, { value: 'Keep payment details, billing contact, platform access, and security information accurate throughout the engagement.' }] }
  ]);
  return _documentTemplate({
    docNum: letter.letter_number,
    client,
    title: 'Welcome to Oak & Pixel Studio',
    subtitle: `Welcome Letter | ${compactDate(letter.created_at)}`,
    tiles: [
      { label: 'Status', value: letter.status },
      { label: 'Created', value: compactDate(letter.created_at) },
      { label: 'Plan', value: client.selected_plan || '-' }
    ],
    sections: [
      { title: 'Executive Summary', body: docText(letter.welcome_message, defaultWelcomeMessage(client)) },
      { title: 'Parties Involved', body: clientPartyText(client) },
      { title: 'Purpose', body: 'This welcome letter is an onboarding guide. It is not a replacement for a signed agreement, quote, invoice, proposal, scope of work, or retainer schedule.' },
      { title: 'Engagement Context', body: `${clientDisplayName(client)} is being onboarded under the ${clientPlanName(client)} framework unless another written service order applies. Oak & Pixel Studio will use the confirmed plan, approved documents, and onboarding information to coordinate delivery priorities.` },
      { title: 'What Happens Next', body: 'Oak & Pixel Studio will confirm access requirements, review the selected services, align on priorities, prepare or confirm the relevant delivery documents, and schedule the first operational steps. Any urgent deadlines should be flagged before delivery dates are confirmed.' },
      { title: 'Delivery Standard', body: 'Our standard is calm, precise, and commercially useful delivery. Work is managed through clear scope records, structured feedback, practical timelines, and careful handling of the systems, content, and brand assets entrusted to us.' },
      { title: 'Scope and Service Boundaries', body: commercialProtectionText('This welcome letter') },
      { title: 'Client Responsibilities', body: operationalProtectionText() },
      { title: 'Communication Expectations', body: 'The client should keep one primary contact available for decisions, provide consolidated feedback, and notify Oak & Pixel Studio early where priorities, dates, approvals, or access requirements change.' },
      { title: 'Commercial Notes', body: paymentProtectionText() },
      { title: 'Intellectual Property and Methodologies', body: ipProtectionText() },
      { title: 'Confidentiality and Access', body: confidentialityProtectionText() },
      { title: 'Important Information', body: docText(letter.important_info, defaultWelcomeInfo()) },
      { title: 'Compliance Notes', body: complianceNoteText() },
      { title: 'Acknowledgement', body: `${acceptanceText('welcome letter')} This acknowledgement helps both parties begin with shared expectations while the formal commercial documents continue to govern fees, scope, delivery, and acceptance.` }
    ],
    html: `${details}${checklist}`,
    signatures: true
  });
}

function retainerStatementNumber(retainer) {
  return `RS-${todayStr().slice(0, 7).replace('-', '')}-${String(retainer.id || '').slice(0, 6).toUpperCase()}`;
}

function projectBriefNumber(project) {
  return `PB-${String(project.id || '').slice(0, 8).toUpperCase()}`;
}

function projectCompletionNumber(project) {
  return `PCR-${String(project.id || '').slice(0, 8).toUpperCase()}`;
}

function retainerStatementTemplate(retainer, client, payments = []) {
  const totalPaid = payments
    .filter(p => p.payment_status === 'Paid')
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const historyRows = payments.length ? payments.map(p => ({
    cells: [
      { value: p.month || '-' },
      { value: p.invoice_number || '-' },
      { value: money(p.amount) },
      { value: compactDate(p.payment_date) },
      { value: p.payment_status || 'Pending' }
    ]
  })) : [{ cells: [{ value: 'No payment history yet.' }, { value: '-' }, { value: '-' }, { value: '-' }, { value: '-' }] }];
  return _documentTemplate({
    docNum: retainerStatementNumber(retainer),
    client,
    title: 'Retainer Statement',
    subtitle: `Retainer Statement | ${compactDate(todayStr())}`,
    tiles: [
      { label: 'Assigned Plan', value: retainer.assigned_plan || client.selected_plan || '-' },
      { label: 'Monthly Retainer', value: money(retainer.monthly_retainer) },
      { label: 'Payment Status', value: retainer.payment_status || 'Pending' }
    ],
    sections: [
      { title: 'Executive Summary', body: `This monthly retainer statement summarizes the active recurring service relationship between Oak & Pixel Studio and ${clientDisplayName(client)}.` },
      { title: 'Purpose', body: 'The statement is intended to support account visibility, payment follow-up, and monthly service management. It does not replace invoices, agreements, or bank payment records.' },
      { title: 'Payment Obligations', body: paymentProtectionText() },
      { title: 'Scope and Support Boundaries', body: 'Retainer services are limited to the active plan, approved support terms, available monthly capacity, and agreed service schedule. Unused capacity, emergency work, new builds, major redesigns, advanced integrations, or work outside the active plan may require separate approval or quotation.' },
      { title: 'Service Continuity', body: 'Retainer services are planned around reserved capacity. Missed or failed payments may pause recurring services, priority support, maintenance, reporting, optimization, or new delivery work until resolved.' },
      { title: 'Confidentiality and Data', body: confidentialityProtectionText() },
      { title: 'Compliance Notes', body: complianceNoteText() }
    ],
    html: `${_pdfTable('Retainer Summary', [
      { label: 'Detail' },
      { label: 'Information' }
    ], [
      { cells: [{ value: 'Billing Day' }, { value: String(retainer.billing_day || '-') }] },
      { cells: [{ value: 'Last Payment Date' }, { value: compactDate(retainer.last_payment_date) }] },
      { cells: [{ value: 'Next Payment Date' }, { value: compactDate(retainer.next_payment_date) }] },
      { cells: [{ value: 'Total Paid Recorded' }, { value: money(totalPaid) }] }
    ])}${_pdfTable('Payment History', [
      { label: 'Month' },
      { label: 'Invoice' },
      { label: 'Amount', align: 'right' },
      { label: 'Payment Date' },
      { label: 'Status' }
    ], historyRows)}`
  });
}

function projectBriefTemplate(project, client) {
  const tags = Array.isArray(project.tags) ? project.tags : String(project.tags || '').split(',').map(t => t.trim()).filter(Boolean);
  const statusLabel = PROJECT_COLUMNS.find(([value]) => value === project.status)?.[1] || project.status || 'Backlog';
  const tagsHTML = tags.length ? `<div class="pdf-section-title">Tags / Categories</div><div class="pdf-tags">${tags.map(t => `<span class="pdf-tag">${esc(t)}</span>`).join('')}</div>` : '';
  return _documentTemplate({
    docNum: projectBriefNumber(project),
    client,
    title: project.title || 'Project Brief',
    subtitle: `Project Brief | ${compactDate(project.created_at || todayStr())}`,
    tiles: [
      { label: 'Status', value: statusLabel },
      { label: 'Priority', value: project.priority || 'Medium' },
      { label: 'Due Date', value: compactDate(project.due_date) }
    ],
    sections: [
      { title: 'Executive Summary', body: `This project brief records the working context for ${project.title || 'the project'} and aligns Oak & Pixel Studio and ${clientDisplayName(client)} on purpose, ownership, dependencies, and delivery expectations.` },
      { title: 'Parties Involved', body: clientPartyText(client) },
      { title: 'Purpose', body: project.description || 'No project description has been added yet. The project brief should be updated before execution if scope, owner, due date, or client dependencies are unclear.' },
      { title: 'Deliverables and Boundaries', body: commercialProtectionText('This project brief') },
      { title: 'Responsibilities and Dependencies', body: operationalProtectionText() },
      { title: 'Timeline', body: `Current due date: ${compactDate(project.due_date)}. Timelines may move where client dependencies, approvals, access, third-party platforms, or change requests affect delivery.` },
      { title: 'Intellectual Property', body: ipProtectionText() },
      { title: 'Risk and Compliance Notes', body: `${riskProtectionText()} ${complianceNoteText()}` },
      { title: 'Acceptance', body: acceptanceText('project brief') }
    ],
    html: `${tagsHTML}${_pdfTable('Client Context', [
      { label: 'Detail' },
      { label: 'Information' }
    ], [
      { cells: [{ value: 'Company' }, { value: client.company || client.full_name || '-' }] },
      { cells: [{ value: 'Industry' }, { value: client.industry || '-' }] },
      { cells: [{ value: 'OPS Plan' }, { value: client.selected_plan || '-' }] },
      { cells: [{ value: 'Start Date' }, { value: compactDate(client.project_start_date) }] }
    ])}`
  });
}

function projectCompletionTemplate(project, client) {
  const tags = Array.isArray(project.tags) ? project.tags : String(project.tags || '').split(',').map(t => t.trim()).filter(Boolean);
  const tagsHTML = tags.length ? `<div class="pdf-section-title">Project Categories</div><div class="pdf-tags">${tags.map(t => `<span class="pdf-tag">${esc(t)}</span>`).join('')}</div>` : '';
  return _documentTemplate({
    docNum: projectCompletionNumber(project),
    client,
    title: `${project.title || 'Project'} Completion Report`,
    subtitle: `Project Completion Report | ${compactDate(todayStr())}`,
    tiles: [
      { label: 'Completion Status', value: PROJECT_COLUMNS.find(([value]) => value === project.status)?.[1] || 'Done' },
      { label: 'Priority', value: project.priority || 'Medium' },
      { label: 'Owner', value: project.owner || 'Unassigned' }
    ],
    sections: [
      { title: 'Executive Summary', body: `This completion report records the closure position for ${project.title || 'the project'} delivered by Oak & Pixel Studio for ${clientDisplayName(client)}.` },
      { title: 'Parties Involved', body: clientPartyText(client) },
      { title: 'Purpose', body: 'The purpose of this report is to confirm what was completed, note the delivery context, identify handover responsibilities, and record the commercial assumptions that apply after project closure.' },
      { title: 'Delivered Work', body: project.description || 'The completed work follows the approved project brief, proposal, scope of work, or accepted task record in OPS Studio Command Center.' },
      { title: 'Scope Boundaries', body: 'Completion confirms delivery of the approved scope only. New requests, additional changes, future improvements, fixes caused by client-side changes, new integrations, and work outside the approved record require a new task, retainer request, or change quote.' },
      { title: 'Client Acceptance Responsibilities', body: 'The client is responsible for reviewing the delivered work promptly, reporting any material issue within the agreed review window, and confirming acceptance or required corrections in writing.' },
      { title: 'Post-Completion Support', body: 'Post-completion support is limited to the active plan, retainer, warranty window, or written support agreement. Ongoing maintenance, optimization, content updates, monitoring, and platform support are not included unless expressly agreed.' },
      { title: 'Intellectual Property and Handover', body: ipProtectionText() },
      { title: 'Risk and Compliance Notes', body: `${riskProtectionText()} ${complianceNoteText()}` },
      { title: 'Approval and Acceptance', body: acceptanceText('project completion report') }
    ],
    html: `${tagsHTML}${_pdfTable('Completion Details', [
      { label: 'Detail' },
      { label: 'Information' }
    ], [
      { cells: [{ value: 'Client' }, { value: clientDisplayName(client) }] },
      { cells: [{ value: 'Project Owner' }, { value: project.owner || 'Unassigned' }] },
      { cells: [{ value: 'Due Date' }, { value: compactDate(project.due_date) }] },
      { cells: [{ value: 'Completion Date' }, { value: compactDate(todayStr()) }] }
    ])}`,
    signatures: true
  });
}

function agreementTemplate(kind, client, retainer = {}) {
  const type = AGREEMENT_TYPES.find(a => a.key === kind) || AGREEMENT_TYPES[0];
  const clientName = clientDisplayName(client);
  const plan = retainer.assigned_plan || client.selected_plan || client.project_type || '-';
  const retainerAmount = Number(retainer.monthly_retainer) > 0 ? money(retainer.monthly_retainer) : '-';
  const billingDay = retainer.billing_day || '-';
  const commonTiles = [
    { label: 'Agreement Date', value: compactDate(todayStr()) },
    { label: 'Client', value: clientName },
    { label: 'Status', value: 'Template' }
  ];
  const msaSections = [
    { title: 'Executive Summary', body: `This Master Services Agreement sets the commercial operating rules for the relationship between Oak & Pixel Studio and ${clientName}. It is designed to support long-term digital delivery while keeping scope, ownership, payment, confidentiality, and responsibilities clear.` },
    { title: 'Parties', body: clientPartyText(client) },
    { title: 'Purpose', body: `This agreement governs premium websites, online booking experiences, lead capture, client onboarding, client operating system implementation, digital presence management, standalone services, retainers, and related work confirmed in a quote, proposal, scope of work, or service order.` },
    { title: 'Services and Scope Boundaries', body: `${commercialProtectionText('This agreement')} Current plan: ${plan}. Monthly retainer: ${retainerAmount}.` },
    { title: 'Change Requests and Revisions', body: 'Reasonable revisions may be included only where they are expressly stated in the applicable quote, proposal, or SOW. New features, major design changes, additional pages, integrations, emergency work, rework caused by changed instructions, or work outside approved scope requires written approval and may be quoted separately.' },
    { title: 'Client Responsibilities', body: operationalProtectionText() },
    { title: 'Fees, Payment and Suspension', body: `${paymentProtectionText()} Retainer billing day: ${billingDay}. Oak & Pixel Studio may withhold publishing, handover, maintenance, source exports, credentials transfer, or further delivery until overdue amounts are settled.` },
    { title: 'Intellectual Property', body: ipProtectionText() },
    { title: 'Confidentiality', body: confidentialityProtectionText() },
    { title: 'Third-Party Platforms and Data Accuracy', body: 'The client remains responsible for the accuracy of business, product, pricing, customer, banking, legal, and compliance information supplied to Oak & Pixel Studio. Third-party platforms, hosting providers, payment gateways, plugins, domain registrars, analytics tools, and AI or automation services remain outside Oak & Pixel Studio control.' },
    { title: 'Limitation of Liability and Force Majeure', body: riskProtectionText() },
    { title: 'Term, Termination and Handover', body: 'The agreement remains active while services, retainers, invoices, or scopes of work are active. Either party may terminate according to the written notice period in the relevant service order or retainer terms. On termination, all approved unpaid fees, third-party costs, and completed work remain payable before final handover.' },
    { title: 'Compliance Notes', body: complianceNoteText() },
    { title: 'Approval and Acceptance', body: acceptanceText('Master Services Agreement') }
  ];
  const ndaSections = [
    { title: 'Executive Summary', body: `This NDA protects confidential information exchanged between Oak & Pixel Studio and ${clientName} during consultation, quoting, onboarding, implementation, support, and long-term service delivery.` },
    { title: 'Parties', body: clientPartyText(client) },
    { title: 'Purpose', body: 'The purpose is to allow both parties to share information needed to evaluate, plan, deliver, manage, or support digital infrastructure while protecting sensitive business, technical, commercial, and operational information.' },
    { title: 'Confidential Information', body: 'Confidential information includes non-public business information, customer data, strategy, pricing, operational details, access credentials, financial details, technical configurations, brand materials, marketing plans, internal systems, workflows, templates, proposals, code, processes, and Oak & Pixel Studio methodologies.' },
    { title: 'Obligations', body: 'Each party must use confidential information only for the approved business purpose, protect it with reasonable care, restrict access to people who need it, and avoid disclosure to unauthorized third parties.' },
    { title: 'OPS Methodologies and Internal Systems', body: 'Oak & Pixel Studio methodologies, templates, internal operating systems, service processes, pricing logic, automations, frameworks, and know-how remain confidential and owned by Oak & Pixel Studio, even where they are visible during delivery.' },
    { title: 'Data Handling and Access', body: 'Where access credentials, personal information, customer records, or business data are shared, both parties should handle them according to applicable South African law, reasonable security practices, and the agreed engagement purpose.' },
    { title: 'Exclusions', body: 'Information is not confidential if it is publicly available through no breach, already known before disclosure, independently developed without using confidential information, lawfully received from another source, or required to be disclosed by law or competent authority.' },
    { title: 'Return or Destruction', body: 'On request, each party should return, delete, or securely destroy confidential materials where reasonably practical, except for records required for backups, legal, accounting, security, or legitimate business purposes.' },
    { title: 'Term', body: 'Confidentiality obligations continue for the duration of the engagement and for a reasonable period after the relationship ends, or longer where required by a signed agreement or applicable law.' },
    { title: 'Compliance Notes', body: complianceNoteText() },
    { title: 'Acceptance', body: acceptanceText('NDA') }
  ];
  const debitSections = [
    { title: 'Executive Summary', body: `This Debit Order Mandate records ${clientName}'s authorization for recurring collections relating to approved Oak & Pixel Studio retainers, service plans, and related charges.` },
    { title: 'Parties', body: clientPartyText(client) },
    { title: 'Mandate Authorization', body: `${clientName} authorizes Oak & Pixel Studio or its nominated payment provider to collect approved recurring service fees, retainers, arrears, failed payment recovery amounts, and related charges according to the accepted service plan, quote, invoice, agreement, or retainer schedule.` },
    { title: 'Billing Details', body: `Assigned plan: ${plan}. Monthly retainer: ${retainerAmount}. Billing day: ${billingDay}. The actual collection amount may vary where additional approved line items, arrears, failed payment recovery, or plan changes apply.` },
    { title: 'Client Banking Information', body: 'Bank name: ______________________________\nAccount holder: __________________________\nAccount number: __________________________\nBranch code: _____________________________\nAccount type: ____________________________' },
    { title: 'Client Responsibilities', body: 'The client must provide accurate banking information, ensure authority to use the nominated account, keep payment details current, and ensure sufficient funds are available on the billing date.' },
    { title: 'Payment Terms and Failed Collections', body: `${paymentProtectionText()} Failed, disputed, or reversed collections may result in service pauses, recovery charges, manual invoice settlement, or restricted support until resolved.` },
    { title: 'Changes and Cancellation', body: 'The mandate may be changed or cancelled according to the agreed retainer or service terms. Cancellation does not cancel amounts already due, approved work, active invoices, or charges incurred before the cancellation takes effect.' },
    { title: 'Compliance Notes', body: 'Debit order processing should follow applicable South African banking, payment system, privacy, and consumer protection requirements. This mandate template should be reviewed by the payment provider or a qualified legal adviser before formal operational use.' },
    { title: 'Acceptance', body: acceptanceText('Debit Order Mandate') }
  ];
  return _documentTemplate({
    docNum: agreementNumber(kind, client),
    client,
    title: type.label,
    subtitle: `Agreement | ${compactDate(todayStr())}`,
    tiles: commonTiles,
    numberedSections: true,
    sections: kind === 'nda' ? ndaSections : kind === 'debit-order' ? debitSections : msaSections,
    signatures: true
  });
}

function docNumber(prefix) {
  return `${prefix}-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${Math.floor(100 + Math.random() * 900)}`;
}
function isSchemaError(error) {
  const msg = `${error?.code || ''} ${error?.message || ''} ${error?.details || ''}`.toLowerCase();
  return ['42p01','42703','pgrst200','pgrst202','pgrst204','pgrst205','schema cache','does not exist','could not find','column','function'].some(token => msg.includes(token));
}
function schemaNotice(text) {
  return `<div class="mini-panel" style="grid-column:1/-1"><div class="mini-panel-body td-dim">${text}</div></div>`;
}

function toast(msg) {
  const el = $('toast');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2800);
}

function emptyState(title, sub = '') {
  return `<div class="empty-state">
    <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
    <p style="margin-bottom:.3rem">${title}</p>
    ${sub ? `<p style="font-size:.72rem;opacity:.6">${sub}</p>` : ''}
  </div>`;
}
