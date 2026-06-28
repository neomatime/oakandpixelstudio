// Vercel serverless function — pulls recent INBOX mail from GoDaddy Workspace
// (IMAP) into the `messages` table as inbound rows, for the Messages page Inbox.
//
// Triggered two ways:
//   1. The "Refresh" button in the OPS Inbox (Authorization: Bearer <supabase user JWT>)
//   2. A Vercel cron (Authorization: Bearer <CRON_SECRET>)
//
// Required env vars:
//   IMAP_USER, IMAP_PASSWORD            — the mailbox (info@oakandpixel.co.za)
//   IMAP_HOST (default imap.secureserver.net), IMAP_PORT (default 993)
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//   CRON_SECRET                         — optional, only needed for the cron trigger

const { ImapFlow } = require('imapflow');
const { simpleParser } = require('mailparser');

const FETCH_RECENT = 40;   // how many of the newest INBOX messages to scan per run
const DEDUP_LOOKBACK = 200; // recent inbound external_ids to compare against

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST' && req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' }); return;
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const IMAP_USER    = process.env.IMAP_USER;
  const IMAP_PASS    = process.env.IMAP_PASSWORD;
  const IMAP_HOST    = process.env.IMAP_HOST || 'imap.secureserver.net';
  const IMAP_PORT    = Number(process.env.IMAP_PORT || 993);

  if (!SUPABASE_URL || !SERVICE_KEY) {
    res.status(503).json({ error: 'Server misconfigured (Supabase env vars missing)' }); return;
  }
  if (!IMAP_USER || !IMAP_PASS) {
    res.status(503).json({ error: 'Inbox not configured — add IMAP_USER and IMAP_PASSWORD in Vercel' }); return;
  }

  // ── Auth: cron secret OR a valid Supabase user session ──
  const authorized = await verifyCaller(req, SUPABASE_URL, SERVICE_KEY);
  if (!authorized) { res.status(401).json({ error: 'Unauthorized' }); return; }

  const sbHeaders = { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY };

  // ── Pull recent INBOX messages over IMAP ──
  let parsed = [];
  const client = new ImapFlow({
    host: IMAP_HOST, port: IMAP_PORT, secure: true,
    auth: { user: IMAP_USER, pass: IMAP_PASS }, logger: false,
  });
  try {
    await client.connect();
    const lock = await client.getMailboxLock('INBOX');
    try {
      const total = client.mailbox && client.mailbox.exists ? client.mailbox.exists : 0;
      if (total > 0) {
        const start = Math.max(1, total - (FETCH_RECENT - 1));
        for await (const msg of client.fetch(`${start}:*`, { source: true })) {
          try {
            const mail = await simpleParser(msg.source);
            const fromAddr = mail.from && mail.from.value && mail.from.value[0];
            parsed.push({
              messageId: mail.messageId || `imap-${IMAP_USER}-${msg.uid}`,
              from: fromAddr ? fromAddr.address : '',
              fromName: fromAddr ? fromAddr.name : '',
              subject: mail.subject || '(no subject)',
              body: (mail.text || '').trim() || stripHtml(mail.html) || '(no text content)',
              html: mail.html || '',
              date: mail.date ? mail.date.toISOString() : new Date().toISOString(),
            });
          } catch (e) { /* skip unparseable message */ }
        }
      }
    } finally {
      lock.release();
    }
    await client.logout();
  } catch (err) {
    try { await client.close(); } catch {}
    const msg = /auth/i.test(err && err.message || '')
      ? 'IMAP login failed — check the mailbox password, or the mailbox may have moved to Microsoft 365.'
      : 'Could not reach the mail server.';
    res.status(502).json({ error: msg }); return;
  }

  if (!parsed.length) { res.status(200).json({ ok: true, new: 0 }); return; }

  // ── Look up already-imported inbound rows (for dedup + HTML backfill) ──
  const existingByExtId = {};  // external_id -> { id, hasHtml }
  try {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/messages?direction=eq.inbound&select=id,external_id,body_html&order=created_at.desc&limit=${DEDUP_LOOKBACK}`,
      { headers: sbHeaders }
    );
    if (r.ok) (await r.json()).forEach(row => {
      if (row.external_id) existingByExtId[row.external_id] = { id: row.id, hasHtml: Boolean(row.body_html && String(row.body_html).length) };
    });
  } catch { /* dedup read failed — proceed, accepting some dup risk */ }

  // Backfill HTML onto already-imported emails missing it. Match by row id
  // (uuid) so special chars in Message-IDs can't break the filter; only sets
  // body_html — read/star/archive state is never touched.
  let backfilled = 0;
  const toBackfill = parsed.filter(p => existingByExtId[p.messageId] && !existingByExtId[p.messageId].hasHtml && p.html);
  await Promise.all(toBackfill.map(async (p) => {
    try {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/messages?id=eq.${existingByExtId[p.messageId].id}`, {
        method: 'PATCH',
        headers: { ...sbHeaders, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify({ body_html: p.html }),
      });
      if (r.ok) backfilled++;
    } catch { /* best-effort */ }
  }));

  const fresh = parsed.filter(p => !existingByExtId[p.messageId]);
  if (!fresh.length) { res.status(200).json({ ok: true, new: 0, backfilled }); return; }

  // ── Map senders to clients, then insert ──
  const emailToClient = await mapClients(fresh.map(p => p.from), SUPABASE_URL, sbHeaders);
  const rows = fresh.map(p => ({
    client_id: emailToClient[p.from.toLowerCase()] || null,
    direction: 'inbound',
    recipient_email: p.from,
    subject: p.subject,
    body: p.body,
    body_html: p.html || null,
    status: 'sent',
    is_read: false,
    external_id: p.messageId,
    created_at: p.date,
  }));

  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/messages`, {
      method: 'POST',
      headers: { ...sbHeaders, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify(rows),
    });
    if (!r.ok) {
      const e = await r.json().catch(() => ({}));
      res.status(502).json({ error: e.message || 'Could not save inbound mail' }); return;
    }
  } catch {
    res.status(502).json({ error: 'Could not save inbound mail' }); return;
  }

  res.status(200).json({ ok: true, new: rows.length, backfilled });
};

async function verifyCaller(req, supabaseUrl, serviceKey) {
  const header = req.headers.authorization || req.headers.Authorization || '';
  const token = String(header).replace(/^Bearer\s+/i, '').trim();
  if (!token) return false;
  if (process.env.CRON_SECRET && token === process.env.CRON_SECRET) return true;
  try {
    const r = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: serviceKey },
    });
    return r.ok;
  } catch {
    return false;
  }
}

async function mapClients(emails, supabaseUrl, sbHeaders) {
  const map = {};
  const unique = [...new Set(emails.filter(Boolean).map(e => e.toLowerCase()))];
  await Promise.all(unique.map(async (email) => {
    try {
      const enc = encodeURIComponent(email);
      const r = await fetch(
        `${supabaseUrl}/rest/v1/clients?or=(company_email.eq.${enc},email.eq.${enc})&select=id&limit=1`,
        { headers: sbHeaders }
      );
      if (r.ok) { const rows = await r.json(); if (rows[0]) map[email] = rows[0].id; }
    } catch { /* leave unmapped */ }
  }));
  return map;
}

function stripHtml(html) {
  if (!html) return '';
  return String(html)
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
