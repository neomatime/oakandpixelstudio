module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'GET') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const token = (req.query || {}).token;
  if (!token) return res.status(400).json({ error: 'Missing token' });

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) return res.status(503).json({ error: 'Server misconfigured' });

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

  if (!rows.length) return res.status(404).json({ error: 'invalid' });

  const row = rows[0];
  if (row.client_signed_at) return res.status(410).json({ error: 'already_signed' });
  if (!row.token_expires_at || new Date(row.token_expires_at) < new Date()) {
    return res.status(410).json({ error: 'expired' });
  }

  return res.status(200).json({
    doc_type:               row.doc_type,
    doc_number:             row.doc_number,
    client_email:           row.client_email,
    client_company:         row.client_company,
    issued_date:            row.request_sent_at,
    ops_signature_data_url: row.ops_signature_data_url || null,
  });
};
