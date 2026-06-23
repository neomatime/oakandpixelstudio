// Vercel serverless function — sends a plain client message via Resend, with
// optional attachments. Attachments arrive as Storage paths (in the private
// message-attachments bucket); this function downloads each with the service
// key and forwards them to Resend as base64 content.
// Env vars: RESEND_API_KEY (required); SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
// (required only when attachments are present).

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const { to, subject, body, attachments, cc, bcc } = req.body || {};

  if (!to || !subject || !body) {
    res.status(400).json({ error: 'Missing required fields: to, subject, body' });
    return;
  }

  const normalizeRecipients = value => {
    if (!value) return [];
    const raw = Array.isArray(value) ? value : String(value).split(',');
    return raw.map(item => String(item || '').trim()).filter(Boolean);
  };
  const ccList = normalizeRecipients(cc);
  const bccList = normalizeRecipients(bcc);

  const key = process.env.RESEND_API_KEY;
  if (!key) {
    res.status(503).json({ error: 'Email not configured — add RESEND_API_KEY to Vercel env vars' });
    return;
  }

  // Resolve attachments (download from Storage → base64) before sending.
  let resendAttachments;
  if (Array.isArray(attachments) && attachments.length) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      res.status(503).json({ error: 'Attachments not configured — SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing' });
      return;
    }
    try {
      resendAttachments = await Promise.all(attachments.slice(0, 10).map(async (att) => {
        const path = String(att.path || '');
        const encoded = path.split('/').map(encodeURIComponent).join('/');
        const r = await fetch(`${supabaseUrl}/storage/v1/object/message-attachments/${encoded}`, {
          headers: { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey },
        });
        if (!r.ok) throw new Error(att.filename || path);
        const content = Buffer.from(await r.arrayBuffer()).toString('base64');
        return { filename: att.filename || path.split('/').pop(), content };
      }));
    } catch (e) {
      res.status(502).json({ error: `Could not attach "${e.message}". Message not sent.` });
      return;
    }
  }

  const esc = v => String(v == null ? '' : v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const htmlBody = `<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;color:#1a1a18;line-height:1.6">
    <div style="font-size:18px;font-weight:700;letter-spacing:.02em;padding:0 0 14px;border-bottom:1px solid #e0dfd8;margin-bottom:20px">Oak &amp; Pixel Studio</div>
    <div style="font-size:15px;white-space:pre-wrap">${esc(body)}</div>
    <div style="margin-top:28px;padding-top:16px;border-top:1px solid #e0dfd8;font-size:12px;color:#6b6b64">Oak &amp; Pixel Studio &middot; info@oakandpixel.co.za</div>
  </div>`;

  let response;
  try {
    response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Oak & Pixel Studio <info@oakandpixel.co.za>',
        to: [to],
        ...(ccList.length ? { cc: ccList } : {}),
        ...(bccList.length ? { bcc: bccList } : {}),
        subject,
        html: htmlBody,
        ...(resendAttachments && resendAttachments.length ? { attachments: resendAttachments } : {}),
      }),
    });
  } catch (err) {
    res.status(502).json({ error: 'Network error reaching email service' });
    return;
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    res.status(502).json({ error: payload.message || `Resend error ${response.status}` });
    return;
  }

  res.status(200).json({ ok: true });
};
