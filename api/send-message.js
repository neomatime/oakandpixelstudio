// Vercel serverless function — sends a plain client message via Resend.
// Unlike send-email.js (which requires a PDF attachment), this sends a simple
// branded HTML email for the OPS messaging hub. Required env var: RESEND_API_KEY

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const { to, subject, body } = req.body || {};

  if (!to || !subject || !body) {
    res.status(400).json({ error: 'Missing required fields: to, subject, body' });
    return;
  }

  const key = process.env.RESEND_API_KEY;
  if (!key) {
    res.status(503).json({ error: 'Email not configured — add RESEND_API_KEY to Vercel env vars' });
    return;
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
        subject,
        html: htmlBody,
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
