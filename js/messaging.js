'use strict';

/* Messages — Outlook-style mail page (Backlog #3) + notification bell (#5).
   Folders: Sent = outbound rows (sent via /api/send-message / Resend), Inbox =
   inbound rows (populated once a real mail feed is connected). Messages live in
   the Supabase `messages` table. This module loads last; loadMessages() is
   called from loadAll(). */

let allMessages = [];
let messagingSchemaReady = true;
let mailFolder = 'inbox';
let selectedMessageId = null;
let mailComposing = false;
let composePrefill = {};

const NOTIF_SEEN_KEY = 'ops-notif-seen-at';

/* ── Data ── */
async function loadMessages() {
  const { data, error } = await sb
    .from('messages')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) {
    messagingSchemaReady = false;
    allMessages = [];
  } else {
    messagingSchemaReady = true;
    allMessages = data || [];
  }
  refreshNotifications();
  renderMailCounts();
  if ($('page-messages')?.classList.contains('active')) renderMessages();
}

function clientRecipientEmail(client = {}) {
  return client.company_email || client.email || '';
}
function folderMessages(folder = mailFolder) {
  const want = folder === 'sent' ? 'outbound' : 'inbound';
  return allMessages.filter(m => (m.direction || 'outbound') === want);
}
function messageById(id) {
  return allMessages.find(m => m.id === id);
}
function messageClientName(m) {
  const c = m.client_id ? clientById(m.client_id) : null;
  return c ? clientDisplayName(c) : (m.recipient_email || 'Unknown');
}

/* ── Page render ── */
function renderMessages() {
  renderMailCounts();
  document.querySelectorAll('#page-messages .mail-folder').forEach(b =>
    b.classList.toggle('active', b.dataset.folder === mailFolder));
  renderMailList();
  renderReadingPane();
}

function renderMailCounts() {
  const inbox = folderMessages('inbox');
  const sent = folderMessages('sent');
  const unreadInbox = inbox.filter(m => !m.is_read).length;
  const setCount = (id, n) => { const el = $(id); if (el) el.textContent = n > 0 ? n : ''; };
  setCount('mail-inbox-count', unreadInbox || inbox.length);
  setCount('mail-sent-count', sent.length);
  const navBadge = $('messages-badge');
  if (navBadge) {
    navBadge.textContent = unreadInbox;
    navBadge.classList.toggle('show', unreadInbox > 0);
  }
}

function renderMailList() {
  const list = $('mail-list');
  if (!list) return;
  const rows = folderMessages();
  if (!rows.length) {
    list.innerHTML = mailListEmpty();
    return;
  }
  list.innerHTML = rows.map(m => {
    const who = mailFolder === 'sent'
      ? `To: ${esc(messageClientName(m))}`
      : esc(messageClientName(m));
    const unread = mailFolder === 'inbox' && !m.is_read;
    const status = m.status && m.status !== 'sent'
      ? `<div class="mail-li-badges"><span class="msg-status ${esc(m.status)}">${esc(m.status)}</span></div>`
      : '';
    return `
      <button class="mail-list-item${m.id === selectedMessageId ? ' active' : ''}${unread ? ' unread' : ''}" type="button" data-id="${esc(m.id)}">
        <div class="mail-li-top">
          <span class="mail-li-from">${who}</span>
          <span class="mail-li-time">${timeAgo(m.created_at)}</span>
        </div>
        <div class="mail-li-subject">${esc(m.subject)}</div>
        <div class="mail-li-preview">${esc(m.body)}</div>
        ${status}
      </button>`;
  }).join('');
}

function mailListEmpty() {
  if (mailFolder === 'inbox') {
    return `<div class="mail-empty">
      <svg viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>
      <div class="mail-empty-title">Your inbox is ready</div>
      <div class="mail-empty-sub">Connect a mailbox to start receiving client replies and email here.</div>
    </div>`;
  }
  return `<div class="mail-empty">
    <svg viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round"><path d="m22 2-7 20-4-9-9-4z"/><path d="M22 2 11 13"/></svg>
    <div class="mail-empty-title">No sent messages yet</div>
    <div class="mail-empty-sub">Compose a message and it will appear here once sent.</div>
  </div>`;
}

function renderReadingPane() {
  const pane = $('mail-reading');
  if (!pane) return;
  if (mailComposing) { pane.innerHTML = composeFormHTML(composePrefill); afterComposeRender(); return; }
  const m = selectedMessageId ? messageById(selectedMessageId) : null;
  if (!m) {
    pane.innerHTML = `<div class="mail-empty">
      <svg viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>
      <div class="mail-empty-title">Select a message</div>
      <div class="mail-empty-sub">Choose a message from the list to read it here, or compose a new one.</div>
    </div>`;
    return;
  }
  const client = m.client_id ? clientById(m.client_id) : null;
  const avatar = client ? clientAvatar(client) : `<div class="client-avatar">${esc((m.recipient_email || '?')[0].toUpperCase())}</div>`;
  const dirLabel = (m.direction || 'outbound') === 'outbound' ? 'To' : 'From';
  const statusPill = m.status && m.status !== 'sent'
    ? ` <span class="msg-status ${esc(m.status)}">${esc(m.status)}</span>` : '';
  pane.innerHTML = `
    <div class="mail-read-head">
      <div class="mail-read-subject">${esc(m.subject)}</div>
      <div class="mail-read-meta">
        ${avatar}
        <div class="mail-read-who">
          <div class="mail-read-who-line">${esc(messageClientName(m))}${statusPill}</div>
          <div class="mail-read-who-sub">${esc(dirLabel)}: ${esc(m.recipient_email)} · ${fmtDateLong((m.created_at || '').split('T')[0])}</div>
        </div>
      </div>
    </div>
    <div class="mail-read-body">${esc(m.body)}</div>
    <div class="mail-read-foot">
      <button class="btn-add" type="button" id="mail-reply">Reply</button>
    </div>`;
}

/* ── Compose ── */
function composeFormHTML(prefill = {}) {
  const clients = [...allClients].sort((a, b) => clientDisplayName(a).localeCompare(clientDisplayName(b)));
  return `<div class="mail-compose">
    <div class="mail-compose-title">${prefill.subject && prefill.isReply ? 'Reply' : 'New message'}</div>
    <div class="modal-field full"><label>Client (optional)</label><select id="mail-compose-client" autocomplete="off">
      <option value="">— None / ad-hoc —</option>
      ${clients.map(c => `<option value="${esc(c.id)}"${prefill.clientId === c.id ? ' selected' : ''}>${esc(clientDisplayName(c))}</option>`).join('')}
    </select></div>
    <div class="modal-field full"><label>To</label><input id="mail-compose-to" type="email" value="${esc(prefill.to || '')}" placeholder="client@email.com" autocomplete="off"></div>
    <div class="modal-field full"><label>Subject</label><input id="mail-compose-subject" type="text" value="${esc(prefill.subject || '')}" placeholder="Subject line" autocomplete="off"></div>
    <div class="modal-field full"><label>Message</label><textarea id="mail-compose-body" rows="10" style="resize:vertical" placeholder="Write your message…" autocomplete="off">${esc(prefill.body || '')}</textarea></div>
    <div class="mail-compose-actions">
      <button class="btn-add" type="button" id="mail-send">Send</button>
      <button class="btn-ghost" type="button" id="mail-cancel">Cancel</button>
      <span class="mail-compose-feedback" id="mail-compose-feedback"></span>
    </div>
  </div>`;
}

function afterComposeRender() {
  const select = $('mail-compose-client');
  if (select && typeof enhanceOpsSelects === 'function') enhanceOpsSelects(select);
  if (select && typeof syncOpsSelect === 'function') syncOpsSelect(select, true);
  setTimeout(() => { (composePrefill.to ? $('mail-compose-subject') : $('mail-compose-to'))?.focus(); }, 60);
}

function openCompose(prefill = {}) {
  composePrefill = prefill;
  mailComposing = true;
  selectedMessageId = null;
  renderMailList();
  renderReadingPane();
}

function cancelCompose() {
  mailComposing = false;
  renderReadingPane();
}

function onComposeClientChange() {
  const id = $('mail-compose-client')?.value || '';
  const client = id ? clientById(id) : null;
  const toEl = $('mail-compose-to');
  if (client && toEl && !toEl.value.trim()) toEl.value = clientRecipientEmail(client);
}

function setComposeFeedback(text, ok = false) {
  const el = $('mail-compose-feedback');
  if (!el) return;
  el.style.color = ok ? 'var(--emerald)' : 'var(--err)';
  el.textContent = text;
}

async function sendComposed() {
  const btn = $('mail-send');
  const clientId = $('mail-compose-client')?.value || null;
  const to = ($('mail-compose-to')?.value || '').trim();
  const subject = ($('mail-compose-subject')?.value || '').trim();
  const body = ($('mail-compose-body')?.value || '').trim();

  if (!to)      { setComposeFeedback('Add a recipient email address.'); return; }
  if (!subject) { setComposeFeedback('Add a subject line.'); return; }
  if (!body)    { setComposeFeedback('Write a message before sending.'); return; }

  setComposeFeedback('');
  btnLoad(btn, true, 'Sending…');

  let status = 'sent';
  let errorText = null;
  try {
    const res = await fetch('/api/send-message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, subject, body }),
    });
    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      status = 'failed';
      errorText = payload.error || `Send failed (${res.status})`;
    }
  } catch {
    status = 'failed';
    errorText = 'Network error — message not sent.';
  }

  const { error: insertErr } = await sb.from('messages').insert({
    client_id: clientId || null,
    direction: 'outbound',
    recipient_email: to,
    subject, body, status, error: errorText,
  });

  btnLoad(btn, false);

  if (status === 'failed') {
    setComposeFeedback(errorText || 'Message could not be sent.');
    return;
  }
  if (insertErr) {
    toast('Message sent, but it could not be saved to history.');
  } else {
    toast('Message sent.');
  }
  mailComposing = false;
  await loadMessages();
  mailFolder = 'sent';
  selectedMessageId = folderMessages('sent')[0]?.id || null;
  renderMessages();
}

function replyToSelected() {
  const m = selectedMessageId ? messageById(selectedMessageId) : null;
  if (!m) return;
  const subject = /^re:/i.test(m.subject || '') ? m.subject : `Re: ${m.subject || ''}`;
  openCompose({ to: m.recipient_email, subject, clientId: m.client_id || null, isReply: true });
}

/* ── Folder + message selection ── */
function selectFolder(folder) {
  mailFolder = folder;
  selectedMessageId = null;
  mailComposing = false;
  renderMessages();
}

async function selectMessage(id) {
  selectedMessageId = id;
  mailComposing = false;
  const m = messageById(id);
  if (m && (m.direction === 'inbound') && !m.is_read) {
    m.is_read = true;
    sb.from('messages').update({ is_read: true }).eq('id', id).then(() => {});
    renderMailCounts();
  }
  renderMailList();
  renderReadingPane();
}

/* ── Notification bell ── */
function notifSeenAt() {
  try { return localStorage.getItem(NOTIF_SEEN_KEY) || ''; } catch { return ''; }
}
function setNotifSeen() {
  try { localStorage.setItem(NOTIF_SEEN_KEY, new Date().toISOString()); } catch {}
}
function unreadNotifications() {
  const seen = notifSeenAt();
  return allMessages.filter(m => !seen || m.created_at > seen);
}

function refreshNotifications() {
  const badge = $('notif-badge');
  if (badge) {
    const n = unreadNotifications().length;
    badge.textContent = n > 9 ? '9+' : String(n);
    badge.classList.toggle('show', n > 0);
  }
  if (!$('notif-menu')?.hasAttribute('hidden')) renderNotifications();
}

function notifIcon(status) {
  return status === 'failed'
    ? `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/></svg>`
    : `<svg viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg>`;
}

function renderNotifications() {
  const menu = $('notif-menu');
  if (!menu) return;
  const unread = unreadNotifications().length;
  const head = `
    <div class="notif-head">
      <span class="notif-head-title">Notifications</span>
      <button class="notif-markread" id="notif-markread" type="button"${unread ? '' : ' disabled'}>Mark all read</button>
    </div>`;
  const recent = allMessages.slice(0, 10);
  if (!recent.length) {
    menu.innerHTML = head + `
      <div class="notif-empty">
        <svg viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
        <div class="notif-empty-title">You're all caught up</div>
        <div class="notif-empty-sub">Message activity will appear here.</div>
      </div>`;
    return;
  }
  const items = recent.map(m => {
    const name = messageClientName(m);
    const inbound = (m.direction || 'outbound') === 'inbound';
    const title = inbound ? `New message from ${name}`
      : (m.status === 'failed' ? `Message failed to ${name}` : `Message sent to ${name}`);
    const icon = inbound ? 'sent' : m.status;
    return `
      <button class="notif-item" type="button" data-id="${esc(m.id)}" data-dir="${esc(m.direction || 'outbound')}">
        <span class="notif-dot ${esc(icon)}">${notifIcon(icon)}</span>
        <span class="notif-body">
          <span class="notif-title">${esc(title)}</span>
          <span class="notif-sub">${esc(m.subject)}</span>
          <span class="notif-time">${timeAgo(m.created_at)}</span>
        </span>
      </button>`;
  }).join('');
  menu.innerHTML = head + `<div class="notif-list">${items}</div>`;
}

function toggleNotifications(force) {
  const menu = $('notif-menu');
  const trigger = $('notif-trigger');
  if (!menu || !trigger) return;
  const open = force === undefined ? menu.hasAttribute('hidden') : force;
  if (open) {
    renderNotifications();
    menu.removeAttribute('hidden');
    trigger.setAttribute('aria-expanded', 'true');
  } else {
    menu.setAttribute('hidden', '');
    trigger.setAttribute('aria-expanded', 'false');
  }
}

function notifMarkAllRead() {
  setNotifSeen();
  refreshNotifications();
}

function openMessageFromNotif(id, dir) {
  switchPage('messages');
  mailFolder = dir === 'inbound' ? 'inbox' : 'sent';
  selectedMessageId = id;
  mailComposing = false;
  renderMessages();
}

/* ── Wiring (static elements always present) ── */
$('mail-compose-btn')?.addEventListener('click', () => openCompose());
$('page-messages')?.querySelector('.mail-folders')?.addEventListener('click', e => {
  const folderBtn = e.target.closest('.mail-folder');
  if (folderBtn) selectFolder(folderBtn.dataset.folder);
});
$('mail-list')?.addEventListener('click', e => {
  const item = e.target.closest('.mail-list-item');
  if (item) selectMessage(item.dataset.id);
});
$('mail-reading')?.addEventListener('click', e => {
  if (e.target.closest('#mail-send'))   { sendComposed(); return; }
  if (e.target.closest('#mail-cancel')) { cancelCompose(); return; }
  if (e.target.closest('#mail-reply'))  { replyToSelected(); return; }
});
$('mail-reading')?.addEventListener('change', e => {
  if (e.target.id === 'mail-compose-client') onComposeClientChange();
});

$('notif-trigger')?.addEventListener('click', e => { e.stopPropagation(); toggleNotifications(); });
$('notif-menu')?.addEventListener('click', e => {
  if (e.target.closest('#notif-markread')) { notifMarkAllRead(); return; }
  const item = e.target.closest('.notif-item');
  if (item) {
    toggleNotifications(false);
    openMessageFromNotif(item.dataset.id, item.dataset.dir);
  }
});
document.addEventListener('click', e => {
  if (!e.target.closest('#notif-wrap')) toggleNotifications(false);
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') toggleNotifications(false);
});
