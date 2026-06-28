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

  const { to, subject, body, htmlBody, bodyHtml, attachments, cc, bcc } = req.body || {};

  const suppliedHtml = String(htmlBody || bodyHtml || '').trim();

  if (!to || !subject || (!body && !suppliedHtml)) {
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
  const fallbackHtml = `<div style="font-size:15px;white-space:pre-wrap">${esc(body || '')}</div>`;
  // If suppliedHtml is already a full document, extract its body to avoid double-wrapping
  const extractBody = html => { const m = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i); return m ? m[1] : html; };
  const bodyContent = suppliedHtml
    ? (/<!doctype html|<html[\s>]/i.test(suppliedHtml) ? extractBody(suppliedHtml) : suppliedHtml)
    : fallbackHtml;
  const finalHtml = buildOpsEmail(bodyContent);

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
        html: finalHtml,
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

function buildOpsEmail(contentHtml) {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F0EFEC;font-family:Georgia,serif">
<div style="max-width:620px;margin:2rem auto;background:#ffffff;border:1px solid #E0DFD8">
  <div style="background:#0A0A09;padding:1.25rem 2rem;display:flex;align-items:center;gap:.75rem">
    <img src="https://www.oakandpixel.co.za/images/oak-pixel-mark-hires-transparent.png" alt="Oak &amp; Pixel Studio" style="width:32px;height:32px;object-fit:contain">
    <span style="color:#1A5C3A;font-size:1.3rem;font-family:Georgia,serif;font-weight:bold">Oak &amp; Pixel</span>
    <span style="color:rgba(245,244,241,.25);font-size:1.1rem;margin:0 .1rem">|</span>
    <span style="color:rgba(245,244,241,.45);font-size:.65rem;letter-spacing:.14em;text-transform:uppercase;font-family:monospace">Studio</span>
  </div>
  <div style="padding:2rem 2rem 1.5rem;color:#1a1a18;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.7">
    ${contentHtml}
  </div>
  <div style="background:#F7F6F3;border-top:1px solid #E0DFD8;padding:1rem 2rem">
    <p style="margin:0;color:#999;font-size:.75rem">Oak &amp; Pixel Studio &nbsp;·&nbsp; <a href="https://www.oakandpixel.co.za" style="color:#B8955A;text-decoration:none">oakandpixel.co.za</a> &nbsp;·&nbsp; <a href="mailto:info@oakandpixel.co.za" style="color:#B8955A;text-decoration:none">info@oakandpixel.co.za</a></p>
  </div>
</div>
</body></html>`;
}
