// Vercel serverless function — sends a document as a PDF attachment via Resend.
// Required env var: RESEND_API_KEY (set in Vercel project settings)

const { verifyCaller } = require('./_auth');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const caller = await verifyCaller(req, process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!caller) { res.status(401).json({ error: 'Unauthorized' }); return; }

  const { to, subject, htmlBody, pdfBase64, pdfFilename } = req.body || {};

  if (!to || !subject || !pdfBase64) {
    res.status(400).json({ error: 'Missing required fields: to, subject, pdfBase64' });
    return;
  }

  const key = process.env.RESEND_API_KEY;
  if (!key) {
    res.status(503).json({ error: 'Email not configured — add RESEND_API_KEY to Vercel env vars' });
    return;
  }

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
        html: htmlBody || '<p>Please find your document attached.</p>',
        attachments: [{ filename: pdfFilename || 'document.pdf', content: pdfBase64 }],
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
