// Shared caller check for admin-only endpoints. Files prefixed with "_" are not
// exposed as Vercel routes. Verifies the Supabase user JWT sent by the OPS app.
async function verifyCaller(req, supabaseUrl, serviceKey) {
  const header = req.headers.authorization || req.headers.Authorization || '';
  const token = String(header).replace(/^Bearer\s+/i, '').trim();
  if (!token || !supabaseUrl || !serviceKey) return null;
  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: serviceKey },
    });
    if (!response.ok) return null;
    const user = await response.json();
    return user && user.id ? user : null;
  } catch {
    return null;
  }
}

module.exports = { verifyCaller };
