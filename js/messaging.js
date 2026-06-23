'use strict';

/* Client Messaging / Email hub (Backlog #3) + Notification bell (Backlog #5).
   Lightweight, tracked client communication — not a full inbox. Messages live
   in the Supabase `messages` table and are sent via /api/send-message (Resend).
   This module is loaded last; loadMessages() is called from loadAll(). */

let allMessages = [];
let messagingClientId = null;
let messagingSchemaReady = true;

const NOTIF_SEEN_KEY = 'ops-notif-seen-at';

/* ── Data ── */
async function loadMessages() {
  const { data, error } = await sb
    .from('messages')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) {
    // Table not migrated yet — degrade gracefully, hub still composes.
    messagingSchemaReady = false;
    allMessages = [];
  } else {
    messagingSchemaReady = true;
    allMessages = data || [];
  }
  refreshNotifications();
  if (!$('messaging-overlay')?.hasAttribute('hidden')) renderMessageHistory();
}

function clientRecipientEmail(client = {}) {
  return client.company_email || client.email || '';
}

/* ── Drawer open / close ── */
function openMessaging(clientId = null) {
  const overlay = $('messaging-overlay');
  if (!overlay) return;
  renderMsgClientOptions();
  const select = $('msg-client');
  if (clientId && clientById(clientId)) {
    messagingClientId = clientId;
    if (select) select.value = clientId;
  }
  // Keep the custom select UI in sync with the native <select>.
  if (typeof enhanceOpsSelects === 'function') enhanceOpsSelects(select);
  if (typeof syncOpsSelect === 'function') syncOpsSelect(select, true);
  prefillRecipient();
  renderMessageHistory();
  setMsgFeedback('');
  overlay.removeAttribute('hidden');
  setTimeout(() => $('msg-subject')?.focus(), 80);
}

function closeMessaging() {
  $('messaging-overlay')?.setAttribute('hidden', '');
}

function renderMsgClientOptions() {
  const select = $('msg-client');
  if (!select) return;
  const sorted = [...allClients].sort((a, b) =>
    clientDisplayName(a).localeCompare(clientDisplayName(b)));
  const current = messagingClientId || select.value || '';
  select.innerHTML = `<option value="">Select a client…</option>` +
    sorted.map(c => `<option value="${esc(c.id)}">${esc(clientDisplayName(c))}</option>`).join('');
  if (current && sorted.some(c => c.id === current)) select.value = current;
}

function onMsgClientChange() {
  messagingClientId = $('msg-client')?.value || null;
  prefillRecipient();
  renderMessageHistory();
  setMsgFeedback('');
}

function prefillRecipient() {
  const emailEl = $('msg-email');
  if (!emailEl) return;
  const client = messagingClientId ? clientById(messagingClientId) : null;
  emailEl.value = client ? clientRecipientEmail(client) : '';
}

/* ── History ── */
function renderMessageHistory() {
  const wrap = $('msg-history');
  if (!wrap) return;
  if (!messagingClientId) {
    wrap.innerHTML = `<div class="msg-empty">Select a client to see message history.</div>`;
    return;
  }
  const rows = allMessages.filter(m => m.client_id === messagingClientId);
  if (!rows.length) {
    wrap.innerHTML = `<div class="msg-empty">No messages yet for this client.</div>`;
    return;
  }
  wrap.innerHTML = rows.map(m => `
    <div class="msg-item">
      <div class="msg-item-top">
        <span class="msg-subject">${esc(m.subject)}</span>
        <span class="msg-status ${esc(m.status)}">${esc(m.status)}</span>
      </div>
      <div class="msg-preview">${esc(m.body)}</div>
      <div class="msg-meta">${esc(m.recipient_email)} · ${timeAgo(m.created_at)}</div>
    </div>`).join('');
}

function setMsgFeedback(text, ok = false) {
  const el = $('msg-feedback');
  if (!el) return;
  el.style.color = ok ? 'var(--emerald)' : 'var(--err)';
  el.textContent = text;
}

/* ── Send ── */
async function sendMessage() {
  const btn = $('msg-send');
  const clientId = $('msg-client')?.value || '';
  const to = ($('msg-email')?.value || '').trim();
  const subject = ($('msg-subject')?.value || '').trim();
  const body = ($('msg-body')?.value || '').trim();

  if (!clientId)             { setMsgFeedback('Select a client first.'); return; }
  if (!to)                   { setMsgFeedback('Add a recipient email address.'); return; }
  if (!subject)              { setMsgFeedback('Add a subject line.'); return; }
  if (!body)                 { setMsgFeedback('Write a message before sending.'); return; }

  setMsgFeedback('');
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

  // Record the attempt (sent or failed) so it shows in history + notifications.
  const { error: insertErr } = await sb.from('messages').insert({
    client_id: clientId,
    recipient_email: to,
    subject,
    body,
    status,
    error: errorText,
  });

  btnLoad(btn, false);

  if (insertErr && status === 'sent') {
    // Email went out but we couldn't log it (table missing / RLS).
    toast('Message sent, but it could not be saved to history.');
    clearCompose();
    return;
  }
  if (status === 'failed') {
    setMsgFeedback(errorText || 'Message could not be sent.');
  } else {
    setMsgFeedback(`Sent to ${to}.`, true);
    clearCompose();
    toast('Message sent.');
  }
  await loadMessages();
  renderMessageHistory();
}

function clearCompose() {
  if ($('msg-subject')) $('msg-subject').value = '';
  if ($('msg-body')) $('msg-body').value = '';
}

/* ── Notification bell ── */
function notifSeenAt() {
  try { return localStorage.getItem(NOTIF_SEEN_KEY) || ''; } catch { return ''; }
}
function setNotifSeen() {
  try { localStorage.setItem(NOTIF_SEEN_KEY, new Date().toISOString()); } catch {}
}
function unreadMessages() {
  const seen = notifSeenAt();
  return allMessages.filter(m => !seen || m.created_at > seen);
}

function refreshNotifications() {
  const badge = $('notif-badge');
  if (badge) {
    const n = unreadMessages().length;
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
  const unread = unreadMessages().length;
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
    const client = clientById(m.client_id);
    const name = client ? clientDisplayName(client) : 'a client';
    const title = m.status === 'failed' ? `Message failed to ${name}` : `Message sent to ${name}`;
    return `
      <button class="notif-item" type="button" data-client="${esc(m.client_id)}">
        <span class="notif-dot ${esc(m.status)}">${notifIcon(m.status)}</span>
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

/* ── Wiring ── */
$('messaging-btn')?.addEventListener('click', () => openMessaging());
$('messaging-close')?.addEventListener('click', closeMessaging);
$('messaging-overlay')?.addEventListener('click', e => {
  if (e.target === $('messaging-overlay')) closeMessaging();
});
$('msg-client')?.addEventListener('change', onMsgClientChange);
$('msg-send')?.addEventListener('click', sendMessage);

$('notif-trigger')?.addEventListener('click', e => { e.stopPropagation(); toggleNotifications(); });
$('notif-menu')?.addEventListener('click', e => {
  if (e.target.closest('#notif-markread')) { notifMarkAllRead(); return; }
  const item = e.target.closest('.notif-item');
  if (item) {
    toggleNotifications(false);
    openMessaging(item.dataset.client || null);
  }
});
document.addEventListener('click', e => {
  if (!e.target.closest('#notif-wrap')) toggleNotifications(false);
});
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  toggleNotifications(false);
  if (!$('messaging-overlay')?.hasAttribute('hidden')) closeMessaging();
});
