# Security Hardening — Sub-Project 2 Design

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Eliminate the 3 Supabase linter advisories and prevent the admin URL from being indexed by search engines.

**Approach:** Four targeted point fixes — one SQL migration, one Vercel config, one robots.txt update, one Supabase auth toggle. No application logic changes.

---

## Global Constraints

- Repo: `C:\Users\Neo\OneDrive\Documents\Oak & Pixel Studio\OPS\oakandpixel`
- No root `package.json` committed (Vercel static-site mode — do not add one)
- Migration file naming: `016_security_hardening.sql` (continues the existing sequence)
- All SQL applied via the Supabase MCP to project `wdbsmcxzhmdkfjoftulm`
- Do not touch: `bookings`, `applications`, or `contacts` anon INSERT policies — intentional for public intake forms
- Do not touch: `client-logos` bucket policies — already `TO authenticated` SELECT (no listing risk)
- `available_slots` and `services` anon SELECT policies — required by the public booking wizard

---

## Fix 1 — Drop `clients` anon INSERT (RLS)

**File:** `migrations/016_security_hardening.sql`

**Problem:** `migrations/001_initial_schema.sql` line 23 creates:
```sql
CREATE POLICY "anon_insert" ON clients FOR INSERT TO anon WITH CHECK (true);
```
Any unauthenticated user can POST to Supabase and insert arbitrary rows into the `clients` table. Clients are only created by authenticated admins (directly or via "Convert to Client" from a booking/application). There is no public-facing "become a client" form.

**Fix:**
```sql
DROP POLICY IF EXISTS "anon_insert" ON clients;
```

**Risk:** None. Authenticated users retain full access via the existing `auth_all` policy (`FOR ALL TO authenticated USING (true)`).

---

## Fix 2 — Restrict `admin-avatars` bucket listing (Storage RLS)

**File:** `migrations/016_security_hardening.sql` (same file as Fix 1)

**Problem:** `migrations/015_admin_avatars_bucket.sql` creates:
```sql
CREATE POLICY "admin-avatars public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'admin-avatars');
```
No `TO` clause means this applies to every role including `anon`. Any caller can invoke `supabase.storage.from('admin-avatars').list()` and enumerate all files in the bucket.

**What still works after the fix:** Avatar URLs stored in `user_metadata.avatar_url` use the `/storage/v1/object/public/admin-avatars/…` endpoint. That endpoint is controlled by the bucket's `public = true` flag, not by RLS on `storage.objects`. Individual file access via public URL is unaffected.

**Fix:**
```sql
DROP POLICY IF EXISTS "admin-avatars public read" ON storage.objects;
CREATE POLICY "admin-avatars authenticated read"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'admin-avatars');
```

---

## Fix 3 — Block admin URL indexing

### 3a. HTTP header via `vercel.json`

**File:** `vercel.json` (new file at repo root)

The `X-Robots-Tag` HTTP header is authoritative — it prevents indexing even if a crawler ignores `robots.txt`. Scoped to `/admin.html` only; the public marketing pages remain indexable.

```json
{
  "headers": [
    {
      "source": "/admin.html",
      "headers": [
        { "key": "X-Robots-Tag", "value": "noindex, nofollow" }
      ]
    }
  ]
}
```

### 3b. `robots.txt` Disallow

**File:** `robots.txt` (existing, at repo root)

Add a `Disallow` rule so polite crawlers don't fetch the page at all:

```
Disallow: /admin.html
```

Insert after the existing `Allow: /` line. Full resulting file:

```
User-agent: *
Allow: /
Disallow: /admin.html

Sitemap: https://www.oakandpixel.co.za/sitemap.xml

# AI/answer-engine orientation files:
# https://www.oakandpixel.co.za/llms.txt
# https://www.oakandpixel.co.za/llms-full.txt
```

---

## Fix 4 — Enable leaked-password protection

**Where:** Supabase Dashboard → Auth → Security → "Password protection" toggle  
**How:** Applied via the Supabase MCP (`update_auth_config` on project `wdbsmcxzhmdkfjoftulm`), or manually in the dashboard.

When enabled, Supabase checks submitted passwords against the haveibeenpwned.com database during sign-in and password changes. Passwords found in known breach lists are rejected. Since OPS has a single admin account this is low-risk, but closing the advisory keeps the linter clean.

---

## Verification

After applying:
1. Run Supabase linter — all 3 advisories should be cleared
2. `curl -I https://<deployed-url>/admin.html` — response must include `X-Robots-Tag: noindex, nofollow`
3. Confirm avatar display still works in the deployed app (public URL access)
4. CI (`node scripts/check-syntax.mjs` + smoke tests) must remain green
