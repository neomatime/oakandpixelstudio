# Client Electronic Signatures — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow clients to digitally sign Proposals, SOWs, and Agreements via a one-time email link, generating a signature certificate PDF that is automatically emailed to both parties.

**Architecture:** Token-based public signing page (`sign.html`) within the existing Vercel + Supabase + Resend stack. A dedicated `signing_requests` Supabase table tracks all requests. Three new Vercel serverless API functions handle token creation, validation, and submission. `admin.html` gains a Signature status column, a "Sign" button per eligible document, and auto-includes the signing link when emailing a Proposal/SOW/Agreement.

**Tech Stack:** Vanilla JS, jsPDF CDN (`cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js`), Supabase JS CDN v2, Resend REST API, Google Fonts — Dancing Script (typed signature), Vercel serverless functions (CommonJS via `api/package.json`).

## Global Constraints

- All API functions: CommonJS (`module.exports`) — `api/package.json` already sets `{"type":"commonjs"}`
- Supabase project URL: `https://wdbsmcxzhmdkfjoftulm.supabase.co` (Supabase project `wdbsmcxzhmdkfjoftulm`)
- Supabase anon key is already hardcoded in `admin.html` as `SB_KEY` — never reuse it in API functions
- New Vercel env vars required: `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (service role key from Supabase dashboard → Project Settings → API)
- Existing Vercel env var: `RESEND_API_KEY` (already set)
- Signing from email address: `Oak & Pixel Studio <info@oakandpixel.co.za>`
- Site URL: `https://oakandpixel.co.za`
- Token TTL: 30 days
- Signable doc types: Proposal, SOW, Agreement only
- Design tokens: `--black:#0A0A09`, `--emerald:#1A5C3A`, `--gold:#B8955A`, `--silk:#EDE9E3`
- CORS: `Access-Control-Allow-Origin: *` on all new API functions (matching existing `api/send-email.js` pattern)

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `admin.html` | Modify | Add signing status column, "Sign" button, load signing data, auto-link in emails |
| `sign.html` | Create | Public signing page — 4 states: loading, signing, success, error |
| `api/request-signature.js` | Create | Generate token, store in DB, optionally send invite email |
| `api/get-signing-request.js` | Create | Validate token, return document metadata |
| `api/submit-signature.js` | Create | Store client sig, email signed certificate, mark as signed |

---

## Task 1: Supabase migration — signing_requests table

**Files:**
- No file changes — run SQL directly in Supabase SQL editor at `https://supabase.com/dashboard/project/wdbsmcxzhmdkfjoftulm/sql`

**Interfaces:**
- Produces: `signing_requests` table with columns used by all subsequent tasks

- [ ] **Step 1: Open Supabase SQL editor and run the migration**

```sql
CREATE TABLE IF NOT EXISTS signing_requests (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token                    TEXT UNIQUE,
  token_expires_at         TIMESTAMPTZ,
  request_sent_at          TIMESTAMPTZ DEFAULT NOW(),
  doc_type                 TEXT NOT NULL,
  doc_number               TEXT NOT NULL,
  client_id                UUID REFERENCES clients(id),
  client_email             TEXT NOT NULL,
  client_company           TEXT NOT NULL,
  proposal_id              UUID REFERENCES proposals(id),
  scope_id                 UUID REFERENCES scopes(id),
  agreement_kind           TEXT,
  ops_signature_data_url   TEXT,
  client_signature_data_url TEXT,
  client_signed_at         TIMESTAMPTZ,
  client_signed_by_name    TEXT
);

CREATE INDEX IF NOT EXISTS signing_requests_token_idx ON signing_requests(token);
CREATE INDEX IF NOT EXISTS signing_requests_proposal_id_idx ON signing_requests(proposal_id);
CREATE INDEX IF NOT EXISTS signing_requests_scope_id_idx ON signing_requests(scope_id);
```

- [ ] **Step 2: Verify the table was created**

In Supabase SQL editor, run:
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'signing_requests'
ORDER BY ordinal_position;
```

Expected: 15 rows listing all columns above.

- [ ] **Step 3: Commit a note**

```bash
git commit --allow-empty -m "feat: signing_requests table migration applied in Supabase"
```

---

## Task 2: `api/request-signature.js` — generate token and optionally send invite email

**Files:**
- Create: `api/request-signature.js`

**Interfaces:**
- Consumes: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY` env vars
- Produces: `POST /api/request-signature` → `{ ok: true, token: string }` or error

- [ ] **Step 1: Create `api/request-signature.js`**

```javascript
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
    }).catch(() => null);
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
```

- [ ] **Step 2: Commit**

```bash
git add api/request-signature.js
git commit -m "feat(api): request-signature — generate token, store in DB, optional invite email"
```

---

## Task 3: `api/get-signing-request.js` — validate token, return doc metadata

**Files:**
- Create: `api/get-signing-request.js`

**Interfaces:**
- Consumes: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` env vars
- Produces: `GET /api/get-signing-request?token=xxx` → `{ doc_type, doc_number, client_email, client_company, issued_date, ops_signature_data_url }` or `{ error: 'invalid' | 'expired' | 'already_signed' }`

- [ ] **Step 1: Create `api/get-signing-request.js`**

```javascript
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
```

- [ ] **Step 2: Commit**

```bash
git add api/get-signing-request.js
git commit -m "feat(api): get-signing-request — validate token, return doc metadata"
```

---

## Task 4: `api/submit-signature.js` — store client sig, email certificate, mark signed

**Files:**
- Create: `api/submit-signature.js`

**Interfaces:**
- Consumes: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY` env vars
- Consumes (request body): `{ token, client_signature_data_url, signed_pdf_base64, client_signed_by_name }`
- Produces: `POST /api/submit-signature` → `{ ok: true }` or error

- [ ] **Step 1: Create `api/submit-signature.js`**

```javascript
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
  const patchRes = await fetch(
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
      }),
    }
  ).catch(() => null);

  if (!patchRes || !patchRes.ok) {
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
    } catch {}
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
```

- [ ] **Step 2: Commit**

```bash
git add api/submit-signature.js
git commit -m "feat(api): submit-signature — store client sig, email certificate, mark signed"
```

---

## Task 5: `sign.html` — public signing page

**Files:**
- Create: `sign.html` (root of repo, served at `https://oakandpixel.co.za/sign.html`)

**Interfaces:**
- Consumes: `GET /api/get-signing-request?token=xxx` → doc metadata
- Consumes: `POST /api/submit-signature` → confirm signing
- Produces: public page at `/sign.html?token=xxx`

- [ ] **Step 1: Create `sign.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sign Document — Oak &amp; Pixel Studio</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@600&display=swap" rel="stylesheet">
  <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --black:   #0A0A09;
      --emerald: #1A5C3A;
      --gold:    #B8955A;
      --silk:    #EDE9E3;
      --border:  #E0DFD8;
      --muted:   #3a3a35;
    }
    body {
      background: var(--silk);
      font-family: Georgia, serif;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 2rem 1rem;
      color: var(--black);
    }
    .card {
      width: 100%;
      max-width: 560px;
      background: #fff;
      border: 1px solid var(--border);
    }
    .card-header {
      background: var(--black);
      padding: 1.1rem 1.75rem;
      display: flex;
      align-items: center;
      gap: .7rem;
    }
    .card-header img { width: 28px; height: 28px; object-fit: contain; }
    .header-brand { color: var(--emerald); font-size: 1.15rem; font-weight: bold; }
    .header-sep { color: rgba(245,244,241,.25); font-size: 1rem; margin: 0 .1rem; }
    .header-sub { color: rgba(245,244,241,.45); font-size: .58rem; letter-spacing: .14em; text-transform: uppercase; font-family: monospace; }
    .card-body { padding: 2rem 1.75rem 1.5rem; }
    .doc-info {
      background: #F7F6F3;
      border: 1px solid var(--border);
      padding: .9rem 1.1rem;
      margin-bottom: 1.25rem;
    }
    .doc-type-label {
      font-size: .6rem;
      letter-spacing: .13em;
      text-transform: uppercase;
      font-family: monospace;
      color: var(--gold);
      margin-bottom: .3rem;
    }
    .doc-title { font-size: 1rem; font-weight: bold; color: var(--black); }
    .doc-meta { font-size: .8rem; color: var(--muted); margin-top: .3rem; }
    .notice {
      font-size: .82rem;
      color: var(--muted);
      line-height: 1.65;
      margin-bottom: 1.5rem;
    }
    .sig-tabs { display: flex; gap: 0; border: 1px solid var(--border); margin-bottom: 0; }
    .sig-tab {
      flex: 1;
      padding: .55rem;
      text-align: center;
      font-size: .75rem;
      letter-spacing: .08em;
      text-transform: uppercase;
      font-family: monospace;
      background: #F7F6F3;
      border: none;
      cursor: pointer;
      color: var(--muted);
      border-bottom: 2px solid transparent;
    }
    .sig-tab.active {
      background: #fff;
      color: var(--black);
      border-bottom: 2px solid var(--emerald);
    }
    .sig-panel { border: 1px solid var(--border); border-top: none; padding: 1rem; background: #fff; }
    #draw-canvas {
      display: block;
      width: 100%;
      height: 150px;
      background: #fff;
      border: 1px dashed #ccc;
      cursor: crosshair;
      touch-action: none;
    }
    .canvas-actions {
      display: flex;
      justify-content: flex-end;
      margin-top: .5rem;
    }
    .btn-ghost-sm {
      font-size: .7rem;
      letter-spacing: .08em;
      text-transform: uppercase;
      font-family: monospace;
      border: 1px solid var(--border);
      background: none;
      padding: .35rem .75rem;
      cursor: pointer;
      color: var(--muted);
    }
    .btn-ghost-sm:hover { background: #F7F6F3; }
    #type-input {
      width: 100%;
      font-family: 'Dancing Script', cursive;
      font-size: 2rem;
      border: none;
      border-bottom: 1px solid var(--border);
      outline: none;
      padding: .5rem .25rem;
      color: var(--black);
      background: transparent;
    }
    #type-preview {
      min-height: 60px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: 'Dancing Script', cursive;
      font-size: 2rem;
      color: var(--black);
      padding: .75rem;
      border: 1px dashed #ccc;
      margin-top: .75rem;
      background: #fff;
    }
    .field-group { margin-top: 1.25rem; }
    .field-label { font-size: .72rem; letter-spacing: .1em; text-transform: uppercase; font-family: monospace; color: var(--muted); margin-bottom: .4rem; }
    .field-input {
      width: 100%;
      border: 1px solid var(--border);
      padding: .6rem .75rem;
      font-size: .9rem;
      font-family: Georgia, serif;
      outline: none;
      color: var(--black);
    }
    .field-input:focus { border-color: var(--emerald); }
    .legal-text { font-size: .72rem; color: #aaa; line-height: 1.6; margin-top: 1.25rem; }
    .btn-confirm {
      width: 100%;
      background: var(--emerald);
      color: #fff;
      border: none;
      padding: .9rem;
      font-family: Georgia, serif;
      font-size: 1rem;
      cursor: pointer;
      margin-top: 1.25rem;
      letter-spacing: .02em;
    }
    .btn-confirm:disabled { opacity: .45; cursor: not-allowed; }
    .btn-confirm:not(:disabled):hover { background: #154e30; }
    .spinner {
      width: 36px; height: 36px;
      border: 3px solid var(--border);
      border-top-color: var(--emerald);
      border-radius: 50%;
      animation: spin .8s linear infinite;
      margin: 0 auto 1rem;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .center { text-align: center; }
    .state { display: none; }
    .state.active { display: block; }
    .success-icon { font-size: 2.5rem; color: var(--emerald); margin-bottom: .75rem; }
    .error-icon { font-size: 2.5rem; color: #c0392b; margin-bottom: .75rem; }
    h2 { font-size: 1.2rem; font-weight: normal; margin-bottom: .5rem; }
    p.sub { font-size: .88rem; color: var(--muted); line-height: 1.65; margin-top: .5rem; }
    a { color: var(--gold); }
  </style>
</head>
<body>

<div class="card">
  <div class="card-header">
    <img src="https://www.oakandpixel.co.za/images/oak-pixel-mark-hires-transparent.png" alt="Oak &amp; Pixel Studio">
    <span class="header-brand">Oak &amp; Pixel</span>
    <span class="header-sep">|</span>
    <span class="header-sub">Studio</span>
  </div>

  <div class="card-body">

    <!-- State: loading -->
    <div id="state-loading" class="state active center">
      <div class="spinner"></div>
      <p style="color:var(--muted);font-size:.88rem">Verifying signing request…</p>
    </div>

    <!-- State: signing -->
    <div id="state-signing" class="state">
      <div class="doc-info">
        <div class="doc-type-label" id="sig-doc-type"></div>
        <div class="doc-title" id="sig-doc-number"></div>
        <div class="doc-meta" id="sig-doc-meta"></div>
      </div>
      <p class="notice">
        The full document was sent to your email. By confirming your signature below you agree to be legally bound by its terms.
      </p>

      <div class="sig-tabs">
        <button class="sig-tab active" id="tab-draw" onclick="switchTab('draw')">Draw</button>
        <button class="sig-tab" id="tab-type" onclick="switchTab('type')">Type</button>
      </div>

      <div class="sig-panel" id="panel-draw">
        <canvas id="draw-canvas"></canvas>
        <div class="canvas-actions">
          <button class="btn-ghost-sm" onclick="clearCanvas()">Clear</button>
        </div>
      </div>

      <div class="sig-panel" id="panel-type" style="display:none">
        <input id="type-input" type="text" placeholder="Type your name here…" oninput="onTypeInput()">
        <div id="type-preview"></div>
      </div>

      <div class="field-group">
        <div class="field-label">Full legal name (required)</div>
        <input class="field-input" id="sig-name" type="text" placeholder="Your full name…" oninput="checkReady()">
      </div>

      <p class="legal-text">
        By clicking Confirm Signature you confirm that the name entered is your legal name and you agree this constitutes a legally binding electronic signature under the Electronic Communications and Transactions Act, 2002 (South Africa).
      </p>

      <button class="btn-confirm" id="btn-confirm" disabled onclick="confirmSignature()">Confirm Signature</button>
    </div>

    <!-- State: submitting -->
    <div id="state-submitting" class="state center">
      <div class="spinner"></div>
      <p style="color:var(--muted);font-size:.88rem">Saving your signature and sending the signed certificate…</p>
    </div>

    <!-- State: success -->
    <div id="state-success" class="state center">
      <div class="success-icon">&#10003;</div>
      <h2 id="success-heading">Thank you</h2>
      <p class="sub" id="success-body"></p>
    </div>

    <!-- State: error -->
    <div id="state-error" class="state center">
      <div class="error-icon">&#10005;</div>
      <h2 id="error-heading">Unable to open this signing link</h2>
      <p class="sub" id="error-body"></p>
      <p class="sub" style="margin-top:.75rem">
        Please contact Oak &amp; Pixel Studio at <a href="mailto:info@oakandpixel.co.za">info@oakandpixel.co.za</a>
      </p>
    </div>

  </div>
</div>

<script>
  const token = new URLSearchParams(location.search).get('token');
  let docData  = null;
  let _drawPad = null;
  let _activeTab = 'draw';

  function showState(id) {
    document.querySelectorAll('.state').forEach(el => el.classList.remove('active'));
    document.getElementById(id).classList.add('active');
  }

  // ── Load and validate token ────────────────────────────────────────────────
  async function init() {
    if (!token) { showError('No signing token was found in this link.'); return; }
    try {
      const res = await fetch(`/api/get-signing-request?token=${encodeURIComponent(token)}`);
      const data = await res.json();
      if (!res.ok) {
        const msgs = {
          invalid:      'This signing link is not valid.',
          expired:      'This signing link has expired (links are valid for 30 days).',
          already_signed: 'This document has already been signed.',
        };
        showError(msgs[data.error] || 'This signing link could not be verified.');
        return;
      }
      docData = data;
      populateSigning(data);
      showState('state-signing');
      initCanvas();
    } catch {
      showError('A network error occurred. Please try again.');
    }
  }

  function showError(msg) {
    document.getElementById('error-body').textContent = msg;
    showState('state-error');
  }

  function populateSigning(data) {
    const typeLabel = data.doc_type === 'SOW' ? 'Scope of Work' : data.doc_type;
    document.getElementById('sig-doc-type').textContent   = typeLabel;
    document.getElementById('sig-doc-number').textContent = data.doc_number;
    document.getElementById('sig-doc-meta').textContent   =
      `${data.client_company}  ·  ${new Date(data.issued_date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })}`;
  }

  // ── Canvas (Draw tab) ──────────────────────────────────────────────────────
  function initCanvas() {
    const canvas = document.getElementById('draw-canvas');
    const rect   = canvas.getBoundingClientRect();
    const dpr    = Math.max(1, devicePixelRatio || 1);
    canvas.width  = Math.round(rect.width  * dpr);
    canvas.height = Math.round(rect.height * dpr);
    const ctx = canvas.getContext('2d');
    ctx.lineCap   = 'round';
    ctx.lineJoin  = 'round';
    ctx.strokeStyle = '#0A0A09';
    ctx.lineWidth   = Math.max(3, 2.6 * dpr);
    _drawPad = { canvas, ctx, drawing: false, hasMarks: false };

    const pt = e => {
      const b = canvas.getBoundingClientRect();
      return { x: (e.clientX - b.left) * (canvas.width / b.width), y: (e.clientY - b.top) * (canvas.height / b.height) };
    };
    canvas.addEventListener('pointerdown', e => {
      e.preventDefault();
      canvas.setPointerCapture?.(e.pointerId);
      const p = pt(e);
      _drawPad.drawing = _drawPad.hasMarks = true;
      ctx.beginPath(); ctx.moveTo(p.x, p.y);
    });
    canvas.addEventListener('pointermove', e => {
      if (!_drawPad?.drawing) return;
      e.preventDefault();
      const p = pt(e); ctx.lineTo(p.x, p.y); ctx.stroke();
    });
    const stop = e => { if (_drawPad) { _drawPad.drawing = false; canvas.releasePointerCapture?.(e.pointerId); checkReady(); } };
    canvas.addEventListener('pointerup', stop);
    canvas.addEventListener('pointercancel', stop);
    canvas.addEventListener('pointerleave', stop);
  }

  function clearCanvas() {
    if (!_drawPad) return;
    _drawPad.ctx.clearRect(0, 0, _drawPad.canvas.width, _drawPad.canvas.height);
    _drawPad.hasMarks = false;
    checkReady();
  }

  // ── Type tab ───────────────────────────────────────────────────────────────
  function switchTab(tab) {
    _activeTab = tab;
    document.getElementById('tab-draw').classList.toggle('active', tab === 'draw');
    document.getElementById('tab-type').classList.toggle('active', tab === 'type');
    document.getElementById('panel-draw').style.display = tab === 'draw' ? '' : 'none';
    document.getElementById('panel-type').style.display = tab === 'type' ? '' : 'none';
    checkReady();
  }

  function onTypeInput() {
    const val = document.getElementById('type-input').value;
    document.getElementById('type-preview').textContent = val;
    checkReady();
  }

  // ── Readiness check ────────────────────────────────────────────────────────
  function checkReady() {
    const name = (document.getElementById('sig-name').value || '').trim();
    const hasSig = _activeTab === 'draw'
      ? (_drawPad?.hasMarks || false)
      : !!(document.getElementById('type-input').value || '').trim();
    document.getElementById('btn-confirm').disabled = !(name && hasSig);
  }

  // ── Signature extraction ───────────────────────────────────────────────────
  function cropCanvasToDataUrl(canvas) {
    const ctx    = canvas.getContext('2d');
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let minX = canvas.width, minY = canvas.height, maxX = -1, maxY = -1;
    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        if (pixels[(y * canvas.width + x) * 4 + 3] > 10) {
          if (x < minX) minX = x; if (x > maxX) maxX = x;
          if (y < minY) minY = y; if (y > maxY) maxY = y;
        }
      }
    }
    if (maxX < 0) return null;
    const pad  = Math.ceil(12 * Math.max(1, devicePixelRatio || 1));
    const out  = document.createElement('canvas');
    out.width  = maxX - minX + 1 + pad * 2;
    out.height = maxY - minY + 1 + pad * 2;
    out.getContext('2d').drawImage(canvas, minX, minY, out.width - pad*2, out.height - pad*2, pad, pad, out.width - pad*2, out.height - pad*2);
    return out.toDataURL('image/png');
  }

  async function typeToDataUrl(text) {
    await document.fonts.load('600 48px "Dancing Script"').catch(() => {});
    const tmp = document.createElement('canvas');
    const ctx = tmp.getContext('2d');
    ctx.font = '600 48px "Dancing Script"';
    const w  = Math.ceil(ctx.measureText(text).width) + 32;
    tmp.width  = w;
    tmp.height = 72;
    ctx.font         = '600 48px "Dancing Script"';
    ctx.fillStyle    = '#0A0A09';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(text, 16, 56);
    return tmp.toDataURL('image/png');
  }

  // ── Load image to data URL (for OPS logo) ─────────────────────────────────
  function loadImage(src) {
    return new Promise(resolve => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload  = () => { try { const c = document.createElement('canvas'); const s = Math.min(1, 200 / Math.max(img.naturalWidth, img.naturalHeight, 1)); c.width = Math.round(img.naturalWidth * s); c.height = Math.round(img.naturalHeight * s); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); resolve(c.toDataURL('image/png')); } catch { resolve(null); } };
      img.onerror = () => resolve(null);
      img.src = src;
    });
  }

  // ── Generate certificate PDF ───────────────────────────────────────────────
  async function generateCertificate(clientSigDataUrl, clientName) {
    const { jsPDF } = window.jspdf;
    const doc       = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageW     = doc.internal.pageSize.getWidth();
    const margin    = 20;
    const contentW  = pageW - margin * 2;
    let y           = 0;

    // Dark header bar
    doc.setFillColor(10, 10, 9);
    doc.rect(0, 0, pageW, 20, 'F');

    // OPS logo
    const logo = await loadImage('https://www.oakandpixel.co.za/images/oak-pixel-mark-hires-transparent.png');
    if (logo) { try { doc.addImage(logo, 'PNG', margin, 4, 10, 10); } catch {} }

    // Brand wordmark in header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(26, 92, 58);
    doc.text('Oak & Pixel Studio', margin + (logo ? 13 : 0), 11.5);

    y = 30;

    // Certificate title
    doc.setFont('times', 'normal');
    doc.setFontSize(18);
    doc.setTextColor(10, 10, 9);
    doc.text('SIGNATURE CERTIFICATE', pageW / 2, y, { align: 'center' });

    y += 4;

    // Gold divider
    doc.setDrawColor(184, 149, 90);
    doc.setLineWidth(0.6);
    doc.line(margin, y + 4, pageW - margin, y + 4);

    y += 14;

    // Document metadata
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(58, 58, 53);
    const typeLabel = docData.doc_type === 'SOW' ? 'Scope of Work' : docData.doc_type;
    const signedAt  = new Date().toLocaleString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Johannesburg' });

    const metaRows = [
      ['Document', typeLabel],
      ['Reference', docData.doc_number],
      ['Client', docData.client_company],
      ['Date Signed', `${signedAt} SAST`],
    ];
    metaRows.forEach(([label, value]) => {
      doc.setFont('helvetica', 'bold'); doc.text(label + ':', margin, y);
      doc.setFont('helvetica', 'normal'); doc.text(value, margin + 36, y);
      y += 7;
    });

    y += 6;

    // Signature blocks
    const colW = (contentW - 12) / 2;

    // OPS signature image
    if (docData.ops_signature_data_url) {
      try { doc.addImage(docData.ops_signature_data_url, 'PNG', margin, y, 44, 16); } catch {}
    }
    // Client signature image
    if (clientSigDataUrl) {
      try { doc.addImage(clientSigDataUrl, 'PNG', margin + colW + 12, y, 44, 16); } catch {}
    }

    y += 20;

    // Signature lines
    doc.setDrawColor(26, 26, 24);
    doc.setLineWidth(0.3);
    doc.line(margin, y, margin + colW, y);
    doc.line(margin + colW + 12, y, pageW - margin, y);

    y += 5;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(10, 10, 9);
    doc.text('Neo Matime', margin, y);
    doc.text(clientName, margin + colW + 12, y);

    y += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 95);
    doc.text('Founder & CEO, Oak & Pixel Studio', margin, y);
    doc.text(docData.client_company, margin + colW + 12, y);

    y += 4;
    doc.text('info@oakandpixel.co.za', margin, y);
    doc.text(docData.client_email, margin + colW + 12, y);

    y += 14;

    // Thin grey divider
    doc.setDrawColor(224, 223, 216);
    doc.setLineWidth(0.3);
    doc.line(margin, y, pageW - margin, y);

    y += 7;

    // Legal notice
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(140, 140, 135);
    doc.text('This certificate confirms a legally binding electronic signature under the Electronic Communications and', margin, y);
    doc.text('Transactions Act, 2002 (South Africa). A copy has been emailed to all parties for their records.', margin, y + 4);

    return doc.output('datauristring').split(',')[1]; // base64
  }

  // ── Confirm and submit ─────────────────────────────────────────────────────
  async function confirmSignature() {
    const clientName = (document.getElementById('sig-name').value || '').trim();
    if (!clientName) return;

    let sigDataUrl;
    if (_activeTab === 'draw') {
      sigDataUrl = cropCanvasToDataUrl(_drawPad.canvas);
      if (!sigDataUrl) { alert('Please draw your signature first.'); return; }
    } else {
      const typed = (document.getElementById('type-input').value || '').trim();
      if (!typed) { alert('Please type your name to generate a signature.'); return; }
      sigDataUrl = await typeToDataUrl(typed);
    }

    showState('state-submitting');

    let pdfBase64;
    try {
      pdfBase64 = await generateCertificate(sigDataUrl, clientName);
    } catch (e) {
      showState('state-signing');
      alert('Could not generate the certificate. Please try again.');
      return;
    }

    try {
      const res = await fetch('/api/submit-signature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          client_signature_data_url: sigDataUrl,
          signed_pdf_base64:         pdfBase64,
          client_signed_by_name:     clientName,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msgs = { already_signed: 'This document has already been signed.', expired: 'The signing link has expired.' };
        showState('state-signing');
        alert(msgs[data.error] || 'Submission failed. Please try again.');
        return;
      }
      document.getElementById('success-heading').textContent = `Thank you, ${docData.client_company}`;
      document.getElementById('success-body').textContent    =
        `Your signed certificate has been emailed to ${docData.client_email}. This page will not accept further signatures.`;
      showState('state-success');
    } catch {
      showState('state-signing');
      alert('A network error occurred. Please try again.');
    }
  }

  init();
</script>
</body>
</html>
```

- [ ] **Step 2: Test locally — open in a browser with a dummy token**

Visit `file:///path/to/sign.html?token=test` — it should show the loading spinner briefly, then transition to the error state with "This signing link is not valid."

- [ ] **Step 3: Commit**

```bash
git add sign.html
git commit -m "feat: sign.html — public signing page with draw/type signature and PDF certificate"
```

---

## Task 6: `admin.html` — load signing requests and add Signature status column

**Files:**
- Modify: `admin.html`

**Interfaces:**
- Consumes: `signing_requests` table via Supabase JS client (`sb`)
- Produces: `allSigningRequests` global array; `signingStatusFor(r)` helper; Signature column in document table

- [ ] **Step 1: Add `allSigningRequests` global (line ~1444, after `let allScopes = [];`)**

Find this line in `admin.html`:
```javascript
let allWelcomeLetters = [];
```

Add immediately after it:
```javascript
let allSigningRequests = [];
```

- [ ] **Step 2: Add `loadSigningRequests()` function (after `loadWelcomeLetters` function, around line ~3402)**

Find this function in `admin.html`:
```javascript
async function loadWelcomeLetters() {
```

Add the following new function directly after the closing `}` of `loadWelcomeLetters`:
```javascript
async function loadSigningRequests() {
  const { data } = await sb.from('signing_requests').select('*');
  allSigningRequests = data || [];
}
```

- [ ] **Step 3: Add `loadSigningRequests()` to `loadAll()` (around line ~3297)**

Find:
```javascript
await Promise.all([loadStats(), loadBookings(), loadSlots(), loadServices(), loadContacts(), loadClients(), loadProjects(), loadRecentActivity(), loadRetainerOverview(), loadQuotes(), loadInvoices(), loadRetainers(), loadProposalEcosystem()]);
```

Replace with:
```javascript
await Promise.all([loadStats(), loadBookings(), loadSlots(), loadServices(), loadContacts(), loadClients(), loadProjects(), loadRecentActivity(), loadRetainerOverview(), loadQuotes(), loadInvoices(), loadRetainers(), loadProposalEcosystem(), loadSigningRequests()]);
```

- [ ] **Step 4: Add `signingStatusFor()` helper function (add near `buildDocumentList`, around line ~5561)**

Find this line:
```javascript
function buildDocumentList() {
```

Add directly before it:
```javascript
const SIGNABLE_TYPES = ['Proposal', 'SOW', 'Agreement'];

function signingStatusFor(r) {
  if (!SIGNABLE_TYPES.includes(r._type)) return null;
  let req;
  if (r._type === 'Proposal')  req = allSigningRequests.find(s => s.proposal_id  === r.id);
  if (r._type === 'SOW')       req = allSigningRequests.find(s => s.scope_id      === r.id);
  if (r._type === 'Agreement') req = allSigningRequests.find(s => s.agreement_kind === r._agreementKind && s.client_id === r.client_id);
  if (!req) return 'not_sent';
  if (req.client_signed_at) return 'signed';
  if (req.token && new Date(req.token_expires_at) > new Date()) return 'awaiting';
  return 'expired';
}

function sigBadge(r) {
  const status = signingStatusFor(r);
  if (!status) return '<td>—</td>';
  if (status === 'signed')   return '<td><span class="badge badge-ok">Signed ✓</span></td>';
  if (status === 'awaiting') return '<td><span class="badge badge-amber">Awaiting</span></td>';
  if (status === 'expired')  return '<td><span class="badge" style="opacity:.5">Expired</span></td>';
  return '<td><span class="badge" style="opacity:.35">Not Sent</span></td>';
}
```

- [ ] **Step 5: Update `renderDocumentsTable()` to add the Signature column**

In `renderDocumentsTable()`, find the thead line:
```javascript
    <thead><tr><th>#</th><th>Type</th><th>Client</th><th>Title</th><th>Date</th><th>Status</th><th>Actions</th></tr></thead>
```

Replace with:
```javascript
    <thead><tr><th>#</th><th>Type</th><th>Client</th><th>Title</th><th>Date</th><th>Status</th><th>Sig</th><th>Actions</th></tr></thead>
```

Then find the row template inside `renderDocumentsTable()`. Find this part of the row:
```javascript
        <td>${esc(r._status||'—')}</td>
        <td class="td-actions">
```

Replace with:
```javascript
        <td>${esc(r._status||'—')}</td>
        ${sigBadge(r)}
        <td class="td-actions">
```

- [ ] **Step 6: Commit**

```bash
git add admin.html
git commit -m "feat(admin): load signing_requests, add Sig status column to document table"
```

---

## Task 7: `admin.html` — "Sign" button and requestSignatureForDoc flow

**Files:**
- Modify: `admin.html`

**Interfaces:**
- Consumes: `signingStatusFor(r)`, `allSigningRequests`, `getStoredOpsSignature()`, `clientDisplayName()`, `toast()`, `opsConfirm()`
- Consumes: `POST /api/request-signature`
- Produces: `requestSignatureForDoc(type, id, agreementKind)` function; "Sign" button in document table actions

- [ ] **Step 1: Add `requestSignatureForDoc()` function near the send email functions (~line 5689)**

Find:
```javascript
async function sendProposalEmail(proposalId) {
```

Add directly before it:
```javascript
async function requestSignatureForDoc(docType, docId, agreementKind) {
  let doc, client, docNumber, proposalId = null, scopeId = null;

  if (docType === 'Proposal') {
    doc    = allProposals.find(p => p.id === docId);
    client = allClients.find(c => c.id === doc?.client_id) || {};
    docNumber  = doc?.proposal_number || '';
    proposalId = docId;
  } else if (docType === 'SOW') {
    doc    = allScopes.find(s => s.id === docId);
    const prop = doc?.proposal_id ? allProposals.find(p => p.id === doc.proposal_id) : null;
    client = allClients.find(c => c.id === (prop?.client_id || doc?.client_id)) || {};
    docNumber = doc?.scope_number || '';
    scopeId   = docId;
  } else if (docType === 'Agreement') {
    // docId is client_id for agreements
    client    = allClients.find(c => c.id === docId) || {};
    docNumber = agreementNumber(agreementKind, client);
  }

  if (!client || !client.id) { toast('Client not found.'); return; }

  const clientEmail = client.email || client.company_email || '';
  if (!clientEmail) { toast('Client has no email address on record.'); return; }

  const existing = allSigningRequests.find(s => {
    if (docType === 'Proposal')  return s.proposal_id  === proposalId;
    if (docType === 'SOW')       return s.scope_id      === scopeId;
    if (docType === 'Agreement') return s.agreement_kind === agreementKind && s.client_id === client.id;
    return false;
  });

  const alreadySigned = existing?.client_signed_at;
  if (alreadySigned) { toast('This document is already signed.'); return; }

  const isResend = !!(existing?.token);
  const action   = isResend ? 'Resend signing invite' : 'Send signing invite';
  const ok = await opsConfirm({
    title: `${action}?`,
    message: `Send a signing link for ${docType} ${docNumber} to ${clientEmail}.`,
    confirmText: action,
    tone: 'emerald',
  });
  if (!ok) return;

  const opsSignature = getStoredOpsSignature();

  try {
    const res = await fetch('/api/request-signature', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        doc_type:               docType,
        doc_number:             docNumber,
        client_id:              client.id,
        client_email:           clientEmail,
        client_company:         clientDisplayName(client),
        proposal_id:            proposalId,
        scope_id:               scopeId,
        agreement_kind:         docType === 'Agreement' ? agreementKind : null,
        ops_signature_data_url: opsSignature,
        send_email:             true,
      }),
    });
    if (!res.ok) { const e = await res.json().catch(()=>({})); toast(e.error || 'Failed to send signing invite.'); return; }
    toast('Signing invite sent to ' + clientEmail + '.');
    await loadSigningRequests();
    renderDocumentsTable();
  } catch {
    toast('Network error. Please try again.');
  }
}
```

- [ ] **Step 2: Add "Sign" button to document table action cells**

In `renderDocumentsTable()`, find the actions cell. Find this line (it's the last `${}` before the closing `</td>`):
```javascript
          ${!r.archived && !['Agreement','Retainer Statement','Project Brief','Project Completion Report'].includes(r._type) ? `<button class="btn-ghost btn-sm" onclick="archiveDocument('${r._type}','${r.id}')">Archive</button>` : ''}
```

Add the following line directly before it:
```javascript
          ${SIGNABLE_TYPES.includes(r._type) && signingStatusFor(r) !== 'signed' ? `<button class="btn-ghost btn-sm" onclick="requestSignatureForDoc('${r._type}','${r._type==='Agreement' ? r.client_id : r.id}','${r._agreementKind||''}')">Sign</button>` : ''}
```

- [ ] **Step 3: Commit**

```bash
git add admin.html
git commit -m "feat(admin): Request Signature button and flow for Proposal, SOW, Agreement"
```

---

## Task 8: `admin.html` — auto-include signing link when emailing Proposal or SOW

**Files:**
- Modify: `admin.html`

**Interfaces:**
- Consumes: `POST /api/request-signature` (with `send_email: false`)
- Consumes: `buildEmailHTML(docType, clientName, docNumber, customMessage, signingLink)`
- Produces: modified `buildEmailHTML`, `_dispatchEmail`, `sendProposalEmail`, `sendSOWEmail`

- [ ] **Step 1: Modify `buildEmailHTML` to accept and render a signing link**

Find the `buildEmailHTML` function signature:
```javascript
function buildEmailHTML(docType, clientName, docNumber, customMessage) {
```

Replace with:
```javascript
function buildEmailHTML(docType, clientName, docNumber, customMessage, signingLink = null) {
```

Then, still inside `buildEmailHTML`, find the const that defines `msgHtml` (it follows immediately after `greetingName`):
```javascript
  const msgHtml = customMessage ? `<p style="color:#3a3a35;font-size:.95rem;line-height:1.7;margin:0 0 1.25rem">${customMessage.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/\n/g,'<br>')}</p>` : '';
```

Add this line directly after it:
```javascript
  const sigSection = signingLink ? `<div style="background:#F7F6F3;border:1px solid #E0DFD8;padding:1.25rem;margin:1.5rem 0;text-align:center"><p style="color:#0A0A09;font-size:.85rem;margin:0 0 .9rem;font-family:Georgia,serif">Please sign this document electronically:</p><a href="${signingLink}" style="background:#1A5C3A;color:#fff;text-decoration:none;padding:.7rem 1.75rem;font-family:Georgia,serif;font-size:.9rem;display:inline-block;letter-spacing:.02em">Sign Document</a><p style="color:#aaa;font-size:.72rem;margin:.75rem 0 0;line-height:1.5">Valid for 30 days. If the button does not work: <span style="color:#B8955A">${signingLink}</span></p></div>` : '';
```

Then in the `return` template string inside `buildEmailHTML`, find the single occurrence of:
```javascript
    ${msgHtml}
```

Replace with:
```javascript
    ${msgHtml}
    ${sigSection}
```

- [ ] **Step 2: Modify `_dispatchEmail` to accept and pass through `signingLink`**

Find the `_dispatchEmail` function signature:
```javascript
async function _dispatchEmail({ templateHTML, filename, docType, clientName, docNumber, to, subject, message, table, docId, statusField, reload }) {
```

Replace with:
```javascript
async function _dispatchEmail({ templateHTML, filename, docType, clientName, docNumber, to, subject, message, table, docId, statusField, reload, signingLink = null }) {
```

Then inside `_dispatchEmail`, find:
```javascript
        htmlBody: buildEmailHTML(docType, clientName, docNumber, message),
```

Replace with:
```javascript
        htmlBody: buildEmailHTML(docType, clientName, docNumber, message, signingLink),
```

- [ ] **Step 3: Modify `sendProposalEmail` to auto-generate signing token**

Find the `sendProposalEmail` function and replace it entirely:
```javascript
async function sendProposalEmail(proposalId) {
  const proposal = allProposals.find(p => p.id === proposalId);
  if (!proposal) return;
  const client = allClients.find(c => c.id === proposal.client_id) || {};
  const to     = client.email || client.company_email || '';
  showSendEmailModal({
    to, message: '',
    subject: `Your Proposal from Oak & Pixel Studio — ${proposal.proposal_number}`,
    onSend: async (finalTo, finalSubject, finalMessage) => {
      let signingLink = null;
      try {
        const opsSignature = getStoredOpsSignature();
        const r = await fetch('/api/request-signature', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            doc_type: 'Proposal', doc_number: proposal.proposal_number,
            client_id: proposal.client_id, client_email: finalTo,
            client_company: clientDisplayName(client),
            proposal_id: proposalId,
            ops_signature_data_url: opsSignature,
            send_email: false,
          }),
        });
        const d = await r.json();
        if (d.token) signingLink = `https://oakandpixel.co.za/sign.html?token=${d.token}`;
      } catch {}
      await _dispatchEmail({
        templateHTML: proposalTemplate(proposal, client), filename: `${proposal.proposal_number}.pdf`,
        docType: 'Proposal', clientName: clientDisplayName(client), docNumber: proposal.proposal_number,
        to: finalTo, subject: finalSubject, message: finalMessage,
        table: 'proposals', docId: proposalId, statusField: 'status', reload: loadProposals,
        signingLink,
      });
      await loadSigningRequests();
      renderDocumentsTable();
    },
  });
}
```

- [ ] **Step 4: Modify `sendSOWEmail` to auto-generate signing token**

Find the `sendSOWEmail` function and replace it entirely:
```javascript
async function sendSOWEmail(scopeId) {
  const scope    = allScopes.find(s => s.id === scopeId);
  if (!scope) return;
  const proposal = scope.proposal_id ? allProposals.find(p => p.id === scope.proposal_id) : null;
  const client   = allClients.find(c => c.id === (proposal?.client_id || scope.client_id)) || {};
  const to       = client.email || client.company_email || '';
  showSendEmailModal({
    to, message: '',
    subject: `Your Scope of Work from Oak & Pixel Studio — ${scope.scope_number}`,
    onSend: async (finalTo, finalSubject, finalMessage) => {
      let signingLink = null;
      try {
        const opsSignature = getStoredOpsSignature();
        const r = await fetch('/api/request-signature', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            doc_type: 'SOW', doc_number: scope.scope_number,
            client_id: client.id, client_email: finalTo,
            client_company: clientDisplayName(client),
            scope_id: scopeId,
            ops_signature_data_url: opsSignature,
            send_email: false,
          }),
        });
        const d = await r.json();
        if (d.token) signingLink = `https://oakandpixel.co.za/sign.html?token=${d.token}`;
      } catch {}
      await _dispatchEmail({
        templateHTML: sowTemplate(scope, client, proposal), filename: `${scope.scope_number}.pdf`,
        docType: 'SOW', clientName: clientDisplayName(client), docNumber: scope.scope_number,
        to: finalTo, subject: finalSubject, message: finalMessage,
        table: 'scopes', docId: scopeId, statusField: 'status', reload: loadScopes,
        signingLink,
      });
      await loadSigningRequests();
      renderDocumentsTable();
    },
  });
}
```

- [ ] **Step 5: Commit**

```bash
git add admin.html
git commit -m "feat(admin): auto-include signing link in Proposal and SOW emails"
```

---

## Task 9: Deploy — add Vercel env vars and end-to-end verification

**Files:**
- No code changes — Vercel dashboard configuration + git push

**Interfaces:**
- Consumes: Supabase service role key from Supabase dashboard
- Produces: live deployment at `oakandpixel.co.za`

- [ ] **Step 1: Get the Supabase service role key**

Open `https://supabase.com/dashboard/project/wdbsmcxzhmdkfjoftulm/settings/api`

Copy the value labelled **service_role** (under "Project API keys"). Keep this secret — it bypasses Row Level Security.

- [ ] **Step 2: Add env vars to Vercel**

Open `https://vercel.com/oakandpixelstudio/oakandpixelstudio/settings/environment-variables` (or the Vercel project settings for `oakandpixelstudio`).

Add two new environment variables:
- Name: `SUPABASE_URL` / Value: `https://wdbsmcxzhmdkfjoftulm.supabase.co`
- Name: `SUPABASE_SERVICE_ROLE_KEY` / Value: `[the service_role key from Step 1]`

Set both to apply to **Production, Preview, and Development** environments.

- [ ] **Step 3: Push to deploy**

```bash
git push origin main
```

Wait for the Vercel deployment to complete (typically 1–2 minutes).

- [ ] **Step 4: Verify API functions are reachable**

```bash
curl -s "https://oakandpixel.co.za/api/get-signing-request?token=test-invalid" | cat
```

Expected: `{"error":"invalid"}`

- [ ] **Step 5: End-to-end test — send a Proposal with signing link**

1. Open `https://oakandpixel.co.za/admin.html`
2. Navigate to Documents → Proposals
3. Click "Send" on any test Proposal
4. Confirm the send — check the received email contains a "Sign Document" button/link
5. Click the signing link — verify it opens `sign.html` with the document details
6. Draw a signature, enter a name, click "Confirm Signature"
7. Verify the success screen appears
8. Check both `info@oakandpixel.co.za` and the client email received the signed certificate PDF attachment
9. Back in admin, refresh the Documents tab — verify the Proposal row shows "Signed ✓" in the Sig column

- [ ] **Step 6: End-to-end test — standalone "Sign" button**

1. In Documents, find a Proposal with Sig status "Not Sent"
2. Click the "Sign" button → confirm the dialog
3. Verify the client email receives the dedicated signing invitation email (separate from the document)
4. Check the Sig column updates to "Awaiting"
