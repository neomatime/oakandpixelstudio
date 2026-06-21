const crypto = require('crypto');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const {
    doc_type, doc_number, client_id, client_email, client_company,
    proposal_id, scope_id, agreement_kind, ops_signature_data_url,
    send_email = false,
  } = req.body || {};

  if (!doc_type || !doc_number || !client_id || !client_email || !client_company) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const resendKey   = process.env.RESEND_API_KEY;

  if (!supabaseUrl || !supabaseKey) return res.status(503).json({ error: 'Server misconfigured' });

  const token          = crypto.randomUUID();
  const tokenExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  const insertRes = await fetch(`${supabaseUrl}/rest/v1/signing_requests`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${supabaseKey}`,
      apikey: supabaseKey,
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({
      token,
      token_expires_at: tokenExpiresAt,
      doc_type,
      doc_number,
      client_id,
      client_email,
      client_company,
      proposal_id:             proposal_id  || null,
      scope_id:                scope_id     || null,
      agreement_kind:          agreement_kind || null,
      ops_signature_data_url:  ops_signature_data_url || null,
    }),
  }).catch(() => null);

  if (!insertRes || !insertRes.ok) {
    const err = await insertRes?.json().catch(() => ({}));
    return res.status(502).json({ error: err?.message || 'Failed to create signing request' });
  }

  if (send_email && resendKey) {
    const signingUrl = `https://oakandpixel.co.za/sign.html?token=${token}`;
    const label      = doc_type === 'SOW' ? 'Scope of Work' : doc_type;
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Oak & Pixel Studio <info@oakandpixel.co.za>',
        to:   [client_email],
        subject: `Please sign: ${label} ${doc_number} — Oak & Pixel Studio`,
        html: buildInviteEmail(label, doc_number, client_company, signingUrl),
      }),
    }).catch(e => console.error('[request-signature] Resend error:', e));
  }

  return res.status(200).json({ ok: true, token });
};

function buildInviteEmail(label, docNumber, clientCompany, signingUrl) {
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
    <p style="color:#0A0A09;font-size:1rem;margin:0 0 1.1rem">Dear ${clientCompany} Team,</p>
    <p style="color:#3a3a35;font-size:.95rem;line-height:1.7;margin:0 0 1.25rem">
      Your signature is requested on the following document from Oak &amp; Pixel Studio:
    </p>
    <div style="background:#F7F6F3;border:1px solid #E0DFD8;padding:1rem 1.25rem;margin:0 0 1.5rem">
      <p style="margin:0;color:#3a3a35;font-size:.9rem"><strong style="color:#0A0A09">${label}</strong> — ${docNumber}</p>
    </div>
    <p style="color:#3a3a35;font-size:.95rem;line-height:1.7;margin:0 0 1.5rem">
      Please review the document (sent in a previous email) and click below to sign electronically. This link is valid for 30 days.
    </p>
    <div style="text-align:center;margin:2rem 0">
      <a href="${signingUrl}" style="background:#1A5C3A;color:#fff;text-decoration:none;padding:.85rem 2rem;font-family:Georgia,serif;font-size:1rem;display:inline-block;letter-spacing:.02em">Sign Document</a>
    </div>
    <p style="color:#aaa;font-size:.78rem;line-height:1.6;margin:0">If the button does not work, copy this link into your browser:<br><span style="color:#B8955A">${signingUrl}</span></p>
  </div>
  <div style="background:#F7F6F3;border-top:1px solid #E0DFD8;padding:1rem 2rem">
    <p style="margin:0;color:#999;font-size:.75rem">Oak &amp; Pixel Studio &nbsp;·&nbsp; <a href="mailto:info@oakandpixel.co.za" style="color:#B8955A;text-decoration:none">info@oakandpixel.co.za</a></p>
  </div>
</div>
</body></html>`;
}
