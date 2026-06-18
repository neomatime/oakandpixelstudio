# Oak & Pixel — Project Setup & Deploy Fix

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Set up a clean local git clone of `neomatime/oakandpixel` and restore the Vercel production deployment from ERROR to READY.

**Architecture:** The repo is a pure static HTML site (4 pages: index, brochure, privacy, terms) with no framework and no runtime build step. A local `validate-site.mjs` script performs content-quality checks. The Vercel project (`oakandpixel`, `prj_ImiMDKo9d1QHc7YxJ98C9Z7pXJo1`) has been erroring on every deploy since June 11 — the fix is to diagnose why (validate script failing or Vercel misconfiguration) and apply the smallest correct change, then push to `main` for an automatic redeploy.

**Tech Stack:** Static HTML · Node 24 (local tooling only) · Vercel (static hosting) · GitHub (`neomatime/oakandpixel`, public)

---

## Files Involved

| File | Action | Purpose |
|---|---|---|
| `vercel.json` | **Create** | Pin build command + output dir so Vercel never auto-detects wrong settings |
| `docs/superpowers/specs/2026-06-18-oakandpixel-project-setup-design.md` | **Add** | Spec written during brainstorming — move from stale folder into repo |
| `docs/superpowers/plans/2026-06-18-oakandpixel-project-setup.md` | **Add** | This file |
| `*.html` | **Conditionally edit** | Fix any content that causes `npm run validate` to fail |

---

## Task 1 — Preserve videos + retire stale local folder

The stale folder (`oakandpixel/`) is an older snapshot of the repo. The only unique assets are two promo `.mp4` files, which are not referenced by any page and belong with brand/IG assets.

**Files:**
- Source: `Clients/me/oakandpixel/oak-pixel-pixel-animation*.mp4`
- Destination: `Clients/me/IG Images & Videos/`
- Rename: `oakandpixel/` → `oakandpixel-legacy-backup/`

- [ ] **Step 1: Move the promo videos**

```powershell
$src = "C:\Users\Neo\OneDrive\Documents\Oak & Pixel Studio\Clients\me\oakandpixel"
$ig  = "C:\Users\Neo\OneDrive\Documents\Oak & Pixel Studio\Clients\me\IG Images & Videos"
Move-Item "$src\oak-pixel-pixel-animation-instagram.mp4" $ig -Force
Move-Item "$src\oak-pixel-pixel-animation.mp4" $ig -Force
```

Expected: no error, files appear in IG folder.

- [ ] **Step 2: Rename the stale folder to a backup**

```powershell
$base = "C:\Users\Neo\OneDrive\Documents\Oak & Pixel Studio\Clients\me"
Rename-Item "$base\oakandpixel" "oakandpixel-legacy-backup"
```

Expected: `oakandpixel-legacy-backup/` exists, `oakandpixel/` no longer exists.

---

## Task 2 — Clone the canonical repo

**Files:** creates `Clients/me/oakandpixel/` as a live git clone.

- [ ] **Step 1: Clone**

```bash
git clone https://github.com/neomatime/oakandpixel.git "/c/Users/Neo/OneDrive/Documents/Oak & Pixel Studio/Clients/me/oakandpixel"
```

Expected output ends with:
```
Resolving deltas: done.
```

- [ ] **Step 2: Verify clone is on main and up to date**

```bash
cd "/c/Users/Neo/OneDrive/Documents/Oak & Pixel Studio/Clients/me/oakandpixel"
git log --oneline -5
```

Expected: shows top commit `bbe6db5 chore: trigger redeploy to surface Vercel build error`.

---

## Task 3 — Run validate locally to expose the exact error

This is the diagnostic step. The validate script exits with code 1 on failure and prints each problem. Running it locally against the cloned repo tells us precisely what Vercel is failing on (if it's running validate) and/or what content issues exist.

**Files:** `scripts/validate-site.mjs`, `site.config.json`

- [ ] **Step 1: Install deps**

```bash
cd "/c/Users/Neo/OneDrive/Documents/Oak & Pixel Studio/Clients/me/oakandpixel"
npm install
```

Expected: clean install (no deps except the script tooling — `package.json` has no runtime deps).

- [ ] **Step 2: Run validate and capture output**

```bash
npm run validate 2>&1
```

Two possible outcomes:
- **PASS** → `Site validation passed for 4 pages.` — content is fine; the problem is Vercel project build settings (Task 4, Option B)
- **FAIL** → lists specific failures like `index.html: canonical URL does not match ...` or `index.html: forbidden pattern found: href="#"` — fix those pages (Task 4, Option A)

Record the exact failures before proceeding.

---

## Task 4A — Fix content validation failures (if validate failed in Task 3)

Skip to Task 4B if validate passed. Do this task if `npm run validate` printed failures.

**Files:** whichever `.html` files are named in the failures

Common issues and how to fix them:

**Forbidden pattern `href="#"`**
Edit the file and replace any `href="#"` in `<a>` tags with either `href="/brochure.html"`, `href="mailto:info@oakandpixel.co.za"`, or remove the link entirely. The forbidden patterns are defined in `site.config.json`:
```json
"forbiddenPatterns": [
  "__cf_email__",
  "/cdn-cgi/",
  "hello@oakandpixel.studio",
  "href=\"#\"",
  "href=\"www.oakandpixel.co.za\""
]
```

**Missing canonical**
Each page must contain exactly: `<link rel="canonical" href="<page.url>">` matching the URL in `site.config.json`.

**Missing meta tags**
Required: `description`, `twitter:card`, `twitter:title`, `twitter:description`, `twitter:image`. Add inside `<head>` if missing.

**Missing OG properties**
Required: `og:type`, `og:site_name`, `og:title`, `og:description`, `og:url`, `og:image`.

**`_blank` link missing `rel="noopener noreferrer"`**
Any `<a target="_blank">` must also have `rel="noopener noreferrer"`.

- [ ] **Step 1: Fix each reported failure**

Edit the reported files directly (use the Edit tool or your editor). After each file, re-run validate to confirm remaining issues.

- [ ] **Step 2: Re-run validate until it passes**

```bash
npm run validate
```

Expected: `Site validation passed for 4 pages.`

- [ ] **Step 3: Commit the content fixes**

```bash
git add index.html brochure.html privacy.html terms.html  # only files you changed
git commit -m "fix: resolve site validation failures"
```

---

## Task 4B — Add vercel.json to pin static site settings (always do this)

Whether or not content validation failed, the Vercel project needs an explicit `vercel.json` so that adding `package.json` in the future never causes Vercel to auto-detect a Node build command. Without this, Vercel may try to run `npm run build` (which doesn't exist) or detect the project incorrectly.

**Files:** create `vercel.json` at repo root.

- [ ] **Step 1: Create vercel.json**

Create `vercel.json` at the repo root with this content:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "buildCommand": "",
  "outputDirectory": "."
}
```

- `"buildCommand": ""` — explicitly no build step; Vercel serves files as-is
- `"outputDirectory": "."` — serve from the repo root (where `index.html` lives)

- [ ] **Step 2: Commit**

```bash
git add vercel.json
git commit -m "chore: add vercel.json — pin static site build settings"
```

---

## Task 5 — Copy spec + plan into repo and push

The spec and plan were written into the stale folder. Now that the clone exists, add them to the real repo alongside the fix commit.

**Files:**
- `docs/superpowers/specs/2026-06-18-oakandpixel-project-setup-design.md`
- `docs/superpowers/plans/2026-06-18-oakandpixel-project-setup.md`

- [ ] **Step 1: Copy from legacy backup into clone**

```powershell
$legacy = "C:\Users\Neo\OneDrive\Documents\Oak & Pixel Studio\Clients\me\oakandpixel-legacy-backup"
$clone  = "C:\Users\Neo\OneDrive\Documents\Oak & Pixel Studio\Clients\me\oakandpixel"
New-Item -ItemType Directory -Force "$clone\docs\superpowers\specs"
New-Item -ItemType Directory -Force "$clone\docs\superpowers\plans"
Copy-Item "$legacy\docs\superpowers\specs\2026-06-18-oakandpixel-project-setup-design.md" "$clone\docs\superpowers\specs\"
Copy-Item "$legacy\docs\superpowers\plans\2026-06-18-oakandpixel-project-setup.md" "$clone\docs\superpowers\plans\"
```

- [ ] **Step 2: Commit**

```bash
cd "/c/Users/Neo/OneDrive/Documents/Oak & Pixel Studio/Clients/me/oakandpixel"
git add docs/
git commit -m "docs: add project setup spec and implementation plan"
```

- [ ] **Step 3: Push to main**

```bash
git push origin main
```

Expected: push completes, GitHub shows latest commit, Vercel auto-deploys within ~30s.

---

## Task 6 — Verify Vercel deployment reaches READY

- [ ] **Step 1: Wait ~60s for Vercel to build, then check deployment state via MCP**

Use the Vercel MCP to call `list_deployments` on project `prj_ImiMDKo9d1QHc7YxJ98C9Z7pXJo1`, team `team_f0EIM6aIMMCg2Bs03J69J14U`. Confirm the latest deployment has `"state": "READY"`.

Expected: latest deploy `state: READY`, `target: production`.

- [ ] **Step 2: If still ERROR — get build logs**

Call `get_deployment_build_logs` on the latest deployment ID. Read the actual error and loop back to fix it (most likely a content validation failure that needs Task 4A).

- [ ] **Step 3: If READY — confirm the live site serves correctly**

Open `https://oakandpixel-git-main-neomatimes-projects.vercel.app/` and verify:
- `index.html` renders without errors
- Navigation links work
- No console errors

---

## Task 7 — Remove legacy backup

Only do this once Task 6 is confirmed READY and you've verified the live URL.

- [ ] **Step 1: Delete the stale backup folder**

```powershell
Remove-Item -Recurse -Force "C:\Users\Neo\OneDrive\Documents\Oak & Pixel Studio\Clients\me\oakandpixel-legacy-backup"
```

Expected: folder gone. All live data is in the cloned repo and on GitHub.

---

## Done

The `neomatime/oakandpixel` repo is now your local project at `Clients/me/oakandpixel/`, backed by git, and deploying successfully. Future changes: edit locally → commit → push → Vercel auto-deploys.

**Deferred (separate session):**
- Attach custom domain `www.oakandpixel.co.za` to the Vercel project
