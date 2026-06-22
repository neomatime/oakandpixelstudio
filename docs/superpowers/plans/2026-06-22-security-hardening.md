# Security Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close 3 Supabase linter security advisories and prevent the admin URL from appearing in search results.

**Architecture:** Four point fixes with no application logic changes — a SQL migration for RLS and storage policy corrections, a Vercel headers config, a robots.txt update, and a Supabase auth toggle. Each fix is independent of the others.

**Tech Stack:** Supabase (PostgreSQL RLS + Storage), Vercel (headers config), Git

## Global Constraints

- Repo root: `C:\Users\Neo\OneDrive\Documents\Oak & Pixel Studio\OPS\oakandpixel`
- Branch off `main` into `feature/security-hardening`; merge back when all tasks complete
- Supabase project ID: `wdbsmcxzhmdkfjoftulm`
- Do NOT commit a root `package.json` (Vercel static-site mode — adding one switches Vercel to Node build and breaks deploys)
- Do NOT touch: `bookings` or `applications` anon INSERT policies — intentional for public intake forms
- Do NOT touch: `client-logos`, `available_slots`, `services` policies — correct as-is
- Migration filename must be exactly `016_security_hardening.sql`
- After every task: run `node scripts/check-syntax.mjs` from repo root — must exit 0

---

### Task 1: SQL migration — drop clients anon INSERT + restrict admin-avatars listing

**Files:**
- Create: `migrations/016_security_hardening.sql`
- Apply via Supabase MCP (`apply_migration`, project `wdbsmcxzhmdkfjoftulm`)

- [ ] **Step 1: Create the feature branch**

```bash
cd "C:\Users\Neo\OneDrive\Documents\Oak & Pixel Studio\OPS\oakandpixel"
git checkout -b feature/security-hardening
```

- [ ] **Step 2: Confirm the advisories exist (baseline)**

Call the Supabase MCP `get_advisors` tool with `project_id = "wdbsmcxzhmdkfjoftulm"`.

You should see advisories for:
- `clients` table allowing anon INSERT
- `admin-avatars` bucket allowing public listing
- Leaked-password protection disabled

Note them. They are what these tasks fix.

- [ ] **Step 3: Write the migration file**

Create `migrations/016_security_hardening.sql`:

```sql
-- Drop anon INSERT on clients.
-- Clients are only created by authenticated admins (direct or via "Convert to Client").
-- Authenticated users keep full access via the existing "auth_all" policy.
DROP POLICY IF EXISTS "anon_insert" ON clients;

-- Restrict admin-avatars SELECT to authenticated users only.
-- Individual file access via public URL (/storage/v1/object/public/admin-avatars/...)
-- is controlled by the bucket's public=true flag and is unaffected by RLS.
-- This only blocks anonymous bucket enumeration via the Storage API.
DROP POLICY IF EXISTS "admin-avatars public read" ON storage.objects;
CREATE POLICY "admin-avatars authenticated read"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'admin-avatars');
```

- [ ] **Step 4: Apply the migration**

Call the Supabase MCP `apply_migration` tool:
- `project_id`: `wdbsmcxzhmdkfjoftulm`
- `name`: `016_security_hardening`
- `query`: the full SQL from Step 3

Expected: no errors.

- [ ] **Step 5: Verify the clients policy is gone**

Call the Supabase MCP `execute_sql` tool:

```sql
SELECT policyname, roles, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'clients'
  AND policyname = 'anon_insert';
```

Expected: **0 rows**. If 1 row is returned, the DROP did not apply — check for errors and retry.

- [ ] **Step 6: Verify the storage policy is correct**

Call the Supabase MCP `execute_sql` tool:

```sql
SELECT policyname, roles, cmd
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND policyname IN ('admin-avatars public read', 'admin-avatars authenticated read');
```

Expected: exactly **1 row** — `admin-avatars authenticated read` with `roles = {authenticated}`.

- [ ] **Step 7: Run parse check**

```bash
node scripts/check-syntax.mjs
```

Expected: exit 0, all JS files passed.

- [ ] **Step 8: Commit**

```bash
git add migrations/016_security_hardening.sql
git commit -m "fix(security): drop clients anon INSERT + restrict admin-avatars listing (SH-T1)"
```

---

### Task 2: Block admin URL from search indexing

**Files:**
- Create: `vercel.json` (repo root)
- Modify: `robots.txt` (repo root, existing)

- [ ] **Step 1: Confirm the baseline (no header, no Disallow)**

`vercel.json` does not exist in the repo. `robots.txt` has `Allow: /` but no `Disallow: /admin.html`. These absences are the failing state.

- [ ] **Step 2: Create `vercel.json`**

Create at repo root — `vercel.json`:

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

This tells Vercel to add the `X-Robots-Tag` HTTP header on every response for `/admin.html`. The header is authoritative — it prevents indexing even when crawlers ignore `robots.txt`.

- [ ] **Step 3: Update `robots.txt`**

Replace the full file content with:

```
User-agent: *
Allow: /
Disallow: /admin.html

Sitemap: https://www.oakandpixel.co.za/sitemap.xml

# AI/answer-engine orientation files:
# https://www.oakandpixel.co.za/llms.txt
# https://www.oakandpixel.co.za/llms-full.txt
```

Only change: `Disallow: /admin.html` is added on the line immediately after `Allow: /`.

- [ ] **Step 4: Run parse check**

```bash
node scripts/check-syntax.mjs
```

Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add vercel.json robots.txt
git commit -m "fix(security): X-Robots-Tag noindex on admin.html + robots.txt Disallow (SH-T2)"
```

---

### Task 3: Leaked-password protection + merge + verify

**Files:** No file changes — Supabase auth configuration and git merge only.

- [ ] **Step 1: Enable leaked-password protection in Supabase**

In the Supabase dashboard for project `wdbsmcxzhmdkfjoftulm`:
1. Navigate to **Authentication → Settings**
2. Find **"Leaked Password Protection"** (or "HaveIBeenPwned Integration")
3. Toggle it **On**
4. Click **Save**

When enabled, Supabase rejects passwords found in known breach databases (via haveibeenpwned.com) at sign-in and password change time.

- [ ] **Step 2: Confirm all 3 advisories are cleared**

Call the Supabase MCP `get_advisors` tool with `project_id = "wdbsmcxzhmdkfjoftulm"`.

Expected: the 3 advisories noted in Task 1 Step 2 are gone or marked resolved. If any remain, revisit the corresponding task step.

- [ ] **Step 3: Merge to main and push**

```bash
git checkout main
git merge feature/security-hardening --no-ff -m "fix(security): close 3 Supabase advisories + block admin URL indexing"
git push origin main
```

- [ ] **Step 4: Confirm CI is green**

Check GitHub Actions on the repository (`Actions` tab). The **CI / verify** workflow triggered by the push must show a green tick. If it fails, read the logs, fix the issue on a new commit on `main`, and push again.

- [ ] **Step 5: Confirm the X-Robots-Tag header is live**

After the Vercel deployment completes (check the Vercel dashboard for the deployment URL — it is shown under the project's deployments list), run:

```bash
curl -I https://<your-vercel-deployment-url>/admin.html
```

Expected: the response includes:
```
X-Robots-Tag: noindex, nofollow
```

If the header is absent, check that `vercel.json` was committed and that the Vercel deployment picked up the latest commit.

- [ ] **Step 6: Confirm avatar display is unaffected**

Open the deployed admin app, log in, and navigate to My Profile. Confirm your avatar image renders correctly. The public URL path (`/storage/v1/object/public/admin-avatars/…`) is unaffected by the storage policy change in Task 1.

- [ ] **Step 7: Delete the feature branch**

```bash
git branch -d feature/security-hardening
git push origin --delete feature/security-hardening
```
