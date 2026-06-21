module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const { token, client_signature_data_url, signed_pdf_base64, client_signed_by_name } = req.body || {};
  if (!token || !client_signature_data_url || !signed_pdf_base64 || !client_signed_by_name) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const resendKey   = process.env.RESEND_API_KEY;
  if (!supabaseUrl || !supabaseKey || !resendKey) {
    return res.status(503).json({ error: 'Server misconfigured' });
  }

  // Fetch and validate
  let rows;
  try {
    const r = await fetch(
      `${supabaseUrl}/rest/v1/signing_requests?token=eq.${encodeURIComponent(token)}&select=*`,
      { headers: { Authorization: `Bearer ${supabaseKey}`, apikey: supabaseKey } }
    );
    if (!r.ok) return res.status(502).json({ error: 'Database error' });
    rows = await r.json();
  } catch {
    return res.status(502).json({ error: 'Database error' });
  }

  if (!rows || !rows.length) return res.status(404).json({ error: 'invalid' });
  const row = rows[0];
  if (row.client_signed_at) return res.status(410).json({ error: 'already_signed' });
  if (!row.token_expires_at || new Date(row.token_expires_at) < new Date()) {
    return res.status(410).json({ error: 'expired' });
  }

  // Store signature
  let patchRes;
  try {
    patchRes = await fetch(
      `${supabaseUrl}/rest/v1/signing_requests?id=eq.${row.id}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${supabaseKey}`,
          apikey: supabaseKey,
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({
          client_signature_data_url,
          client_signed_at:     new Date().toISOString(),
          client_signed_by_name,
          token:               null,
          token_expires_at:    null,
        }),
      }
    );
  } catch {
    return res.status(502).json({ error: 'Failed to store signature' });
  }

  if (!patchRes.ok) {
    return res.status(502).json({ error: 'Failed to store signature' });
  }

  // Email signed certificate to both parties
  const label    = row.doc_type === 'SOW' ? 'Scope of Work' : row.doc_type;
  const filename = `${row.doc_number}-signed-certificate.pdf`;
  const html     = buildConfirmationEmail(label, row.doc_number, row.client_company, client_signed_by_name);

  const sendEmail = async (to) => {
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'Oak & Pixel Studio <info@oakandpixel.co.za>',
          to: [to],
          subject: `Signed: ${label} ${row.doc_number} — ${row.client_company}`,
          html,
          attachments: [{ filename, content: signed_pdf_base64 }],
        }),
      });
    } catch (e) {
      console.error('[submit-signature] Resend error:', e);
    }
  };

  await Promise.all([sendEmail(row.client_email), sendEmail('info@oakandpixel.co.za')]);

  return res.status(200).json({ ok: true });
};

function buildConfirmationEmail(label, docNumber, clientCompany, signedByName) {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#F0EFEC;font-family:Georgia,serif">
<div style="max-width:580px;margin:2rem auto;background:#fff;border:1px solid #E0DFD8">
  <div style="background:#0A0A09;padding:1.25rem 2rem;display:flex;align-items:center;gap:.75rem">
    <img src="https://www.oakandpixel.co.za/images/oak-pixel-mark-hires-transparent.png" alt="Oak &amp; Pixel Studio" style="width:32px;height:32px;object-fit:contain">
    <span style="color:#1A5C3A;font-size:1.3rem;font-family:Georgia,serif;font-weight:bold">Oak &amp; Pixel</span>
    <span style="color:rgba(245,244,241,.25);font-size:1.1rem;margin:0 .1rem">|</span>
    <span style="color:rgba(245,244,241,.45);font-size:.65rem;letter-spacing:.14em;text-transform:uppercase;font-family:monospace">Studio</span>
  </div>
  <div style="padding:2rem 2rem 1.5rem">
    <p style="color:#1A5C3A;font-size:1rem;margin:0 0 1.1rem;font-weight:bold">&#10003; Document signed successfully</p>
    <div style="background:#F7F6F3;border:1px solid #E0DFD8;padding:1rem 1.25rem;margin:0 0 1.25rem">
      <p style="margin:0;color:#3a3a35;font-size:.9rem"><strong style="color:#0A0A09">${label}</strong> — ${docNumber}</p>
      <p style="margin:.4rem 0 0;color:#3a3a35;font-size:.85rem">Signed by: ${signedByName} &nbsp;·&nbsp; ${clientCompany}</p>
    </div>
    <p style="color:#3a3a35;font-size:.95rem;line-height:1.7;margin:0">
      Your signed certificate is attached to this email for your records. This constitutes a legally binding electronic signature under the Electronic Communications and Transactions Act, 2002 (South Africa).
    </p>
  </div>
  <div style="background:#F7F6F3;border-top:1px solid #E0DFD8;padding:1rem 2rem">
    <p style="margin:0;color:#999;font-size:.75rem">Oak &amp; Pixel Studio &nbsp;·&nbsp; <a href="mailto:info@oakandpixel.co.za" style="color:#B8955A;text-decoration:none">info@oakandpixel.co.za</a></p>
  </div>
</div>
</body></html>`;
}
