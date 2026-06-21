# Client Electronic Signatures — Design Spec

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Allow clients to digitally sign Proposals, SOWs, and Agreements via a secure one-time link, with the signed PDF automatically emailed to both parties.

**Architecture:** Token-based public signing page (`sign.html`) within the existing Vercel + Supabase + Resend stack. No external e-signature service. All PDF generation happens client-side in the browser using the existing jsPDF setup.

**Tech Stack:** Vanilla JS, jsPDF CDN, Supabase JS CDN v2, Resend via Vercel serverless functions (CommonJS), Google Fonts (Dancing Script for typed signatures).

**Base file:** `oakandpixel/admin.html` (single-file Command Center, ~5500+ lines). New files: `sign.html`, `api/request-signature.js`, `api/get-signing-request.js`, `api/submit-signature.js`.

---

## 1. Scope

Client signatures apply only to contractual document types: **Proposal, SOW, Agreement**. Invoices, Quotes, and Welcome Letters are excluded.

---

## 2. Data Model

Seven new columns on the existing `documents` table in Supabase (project: `wdbsmcxzhmdkfjoftulm`):

```sql
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS signature_token          TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS signature_token_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS signing_request_sent_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ops_signature_data_url   TEXT,
  ADD COLUMN IF NOT EXISTS client_signature_data_url TEXT,
  ADD COLUMN IF NOT EXISTS client_signed_at         TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS client_signed_by_name    TEXT;
```

| Column | Purpose |
|---|---|
| `signature_token` | UUID v4, one-time use, cleared after signing |
| `signature_token_expires_at` | `now() + interval '30 days'` |
| `signing_request_sent_at` | Timestamp the invite email was sent |
| `ops_signature_data_url` | OPS signature data URL captured from admin localStorage at request time — stored so `sign.html` can embed it in the final PDF without localStorage access |
| `client_signature_data_url` | PNG data URL of the client's drawn or typed signature |
| `client_signed_at` | When the client submitted |
| `client_signed_by_name` | Full name the client confirmed at signing |

---

## 3. Flows

### Flow 1 — Manual "Request Signature" (admin-initiated)

1. Admin clicks **"Request Signature"** on a Proposal/SOW/Agreement row in the Command Center
2. `admin.html` reads the OPS signature from `localStorage` (`OPS_SIGNATURE_KEY`)
3. Calls `api/request-signature.js` with `{ doc_id, ops_signature_data_url }`
4. API generates UUID v4 token, writes to `documents` record: `signature_token`, `signature_token_expires_at = now + 30d`, `signing_request_sent_at = now`, `ops_signature_data_url`
5. API sends branded OPS invitation email to the client's registered email via Resend — includes document name and a prominent "Sign Document" CTA button linking to `https://oakandpixel.co.za/sign.html?token={token}`

### Flow 2 — Auto-link with document email

When a Proposal, SOW, or Agreement is emailed via the existing send flow (`sendProposalEmail`, `sendSOWEmail`, `sendAgreementEmail`):
- The system runs the same token generation in the background before sending
- The signing link is appended to the email body as a "Sign this document" section
- Client receives the PDF attachment and the signing link in one email
- Admin can still send a dedicated reminder later via "Request Signature"

### Flow 3 — Client signs on `sign.html`

1. Client opens `https://oakandpixel.co.za/sign.html?token=xxx`
2. Page calls `api/get-signing-request.js?token=xxx`
   - Validates: token exists, not expired, `client_signed_at` is null
   - Returns: `{ doc_type, doc_number, client_company, issued_date, ops_signature_data_url }`
3. Page renders signing UI (see Section 4)
4. Client draws or types their signature and enters their full name
5. On "Confirm Signature": browser generates a **signature certificate PDF** using jsPDF — a single-page document containing:
   - OPS logo + branding header
   - Document title, number, and date
   - "This document was digitally signed on [timestamp]"
   - OPS signature block (name: Neo Matime, title: Founder & CEO)
   - Client signature block (drawn/typed image + confirmed name + email)
   - The original document PDF was already sent to the client's inbox; the certificate is the binding signing evidence
6. Page POSTs `{ token, client_signature_data_url, signed_pdf_base64, client_signed_by_name }` to `api/submit-signature.js`
7. API:
   - Validates token (re-checks expiry and unsigned state)
   - Stores `client_signature_data_url`, `client_signed_at = now`, `client_signed_by_name`
   - Clears `signature_token` and `signature_token_expires_at` (one-time use)
   - Emails signed PDF to client email and to `info@oakandpixel.co.za` via Resend
8. Page transitions to success state

### Flow 4 — Admin visibility

- Document table in Command Center gains a **Signature** column showing one of:
  - `—` for non-signable doc types
  - `Not Sent` for eligible docs with no token
  - `Awaiting` + sent date for pending requests
  - `Signed ✓` + signed date for completed docs
- Clicking "Awaiting" opens a small popover with option to resend the invitation

---

## 4. `sign.html` Page

Standalone public page — no navigation, no login, no sidebar. Four states:

### State 1 — Loading / Validating
- Centered OPS mark + wordmark
- Spinner while token is validated via API

### State 2 — Signing (valid token)
- **Header**: dark bar, OPS logo mark (32px), green "Oak & Pixel" wordmark, "| Studio" label — matching the email template header
- **Document summary card**: doc type badge, doc number, client company name, date issued
- **Note**: *"The full document was sent to your email. By confirming below you agree to be bound by its terms."*
- **Signature area** with two tabs:
  - **Draw** — canvas pad, pointer-event implementation matching the existing OPS signature pad in `admin.html`
  - **Type** — text input rendered live in Dancing Script (Google Fonts); preview updates as they type
- **Full name field** (required text input, becomes `client_signed_by_name`)
- **"Confirm Signature"** button — OPS emerald (`#1A5C3A`), disabled until both name and signature are present
- **Fine print**: *"This constitutes a legally binding electronic signature under South African law (ECTA, 2002)."*

### State 3 — Signed (success)
- Checkmark icon, "Thank you, [Company Name]"
- "Your signed copy has been emailed to [client email]"
- Page is inert — no further actions, token is spent

### State 4 — Invalid / Expired
- "This signing link is invalid or has expired."
- *"Please contact Oak & Pixel Studio at info@oakandpixel.co.za"*

---

## 5. Serverless Functions

All CommonJS (`module.exports`) in `/api`. Override via existing `api/package.json: {"type": "commonjs"}`.

### `api/request-signature.js`
- **Input**: `{ doc_id, ops_signature_data_url }`
- Generates UUID v4 token (using `crypto.randomUUID()`)
- Writes token + expiry + OPS sig to `documents` via Supabase REST API
- Sends invitation email via Resend
- **Output**: `{ ok: true, token }`

### `api/get-signing-request.js`
- **Input**: `?token=xxx` (GET)
- Queries `documents` (joined to `clients`) for matching `signature_token` where `signature_token_expires_at > now` and `client_signed_at IS NULL`
- **Output**: `{ doc_type, doc_number, client_company, client_email, issued_date, ops_signature_data_url }` where `issued_date` = `documents.created_at`, or `{ error: 'invalid' | 'expired' | 'already_signed' }`

### `api/submit-signature.js`
- **Input**: `{ token, client_signature_data_url, signed_pdf_base64, client_signed_by_name }`
- Re-validates token (idempotency guard)
- Updates document record
- Clears token columns
- Emails signed PDF to both parties via Resend (`api/send-email.js` pattern)
- **Output**: `{ ok: true }`

---

## 6. Admin UI Changes (`admin.html`)

- **Document table**: add "Signature" column (visible only for Proposal/SOW/Agreement rows)
- **Row actions**: "Request Signature" button (replaces or supplements existing row actions for eligible doc types)
- **Send email wrappers** (`sendProposalEmail`, `sendSOWEmail`, `sendAgreementEmail`): call `api/request-signature.js` before/after sending, append signing link to `buildEmailHTML()` output
- **Status display**: badge logic for `Not Sent / Awaiting / Signed` based on `signature_token` and `client_signed_at` columns

---

## 7. Environment Variables

Two new env vars required in Vercel project settings (in addition to existing `RESEND_API_KEY`):

| Variable | Purpose |
|---|---|
| `SUPABASE_URL` | Project URL (`https://wdbsmcxzhmdkfjoftulm.supabase.co`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key — allows serverless functions to write to Supabase bypassing RLS, never exposed to the browser |

The existing `admin.html` uses the anon key embedded in the page for browser-side Supabase access. The new API functions use the service role key server-side for secure writes.

---

## 8. Security

- **Token entropy**: UUID v4 = 122 bits — not guessable
- **One-time use**: token cleared immediately after successful submission
- **TTL**: 30-day expiry enforced server-side on every request
- **No RLS bypass**: all `sign.html` interactions go through Vercel serverless functions — the Supabase anon key is never exposed to the public page
- **Resend to**: signed PDF only goes to the client's email address on record and `info@oakandpixel.co.za` — not user-supplied

---

## 9. Out of Scope

- PDF preview on `sign.html` (client has the PDF from the original email)
- SMS / OTP identity verification
- Multi-party signing (more than two signatories)
- Audit log / certificate of completion beyond Supabase column timestamps
- Document expiry or revocation after signing
