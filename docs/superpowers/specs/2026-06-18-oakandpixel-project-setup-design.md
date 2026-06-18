# Oak & Pixel — Project Setup & Deploy Fix

**Date:** 2026-06-18  
**Status:** Approved

## Context

`neomatime/oakandpixel` is already a fully-formed, public GitHub repo — static HTML site with pages, SEO assets, `site.config.json`, `scripts/validate-site.mjs`, and `docs/`. It was deploying successfully on Vercel (April 2026) until a June 11 batch of commits caused every build to ERROR (7 consecutive failed deploys as of June 13). The last good deploy is rollback-candidate `da8e549`.

The loose local folder (`Clients/me/oakandpixel/`) is a stale June 11 snapshot — 171 lines behind the repo — and contains no unique content worth preserving except 2 promo `.mp4` videos that are not referenced by any page.

## Goal

Set up a clean local working copy of the canonical repo and restore the live Vercel production deployment to READY.

## Architecture

- **Tech stack:** Pure static HTML (no framework, no build step required by Vercel)
- **Hosting:** Vercel project `oakandpixel` (prj_ImiMDKo9d1QHc7YxJ98C9Z7pXJo1), team `neomatimes-projects`
- **Repo:** `https://github.com/neomatime/oakandpixel.git` (public)
- **Production URL:** `www.oakandpixel.co.za` (custom domain — not yet attached to Vercel; in-scope for later)
- **Validation script:** `npm run validate` runs `scripts/validate-site.mjs` which checks required files and forbidden patterns

## Implementation Plan

1. **Preserve videos** — move the 2 `.mp4` promo files from the stale folder to `Clients/me/IG Images & Videos/`
2. **Retire stale folder** — rename `oakandpixel/` → `oakandpixel-legacy-backup/`
3. **Clone repo** — `git clone https://github.com/neomatime/oakandpixel.git` into `Clients/me/oakandpixel/`
4. **Verify locally** — run `npm run validate`, serve pages, confirm nothing is obviously broken
5. **Diagnose Vercel failure** — re-trigger deploy, read build logs, inspect project build settings; hypothesis: `validate` script is being auto-run by Vercel and failing on a forbidden pattern
6. **Fix & redeploy** — smallest correct fix (likely `vercel.json` with `"buildCommand": null` and `"outputDirectory": "."`, or removing the validate call from auto-run); push and confirm READY
7. **Copy spec into repo** — move this doc into the cloned repo and commit it with the fix
8. **Remove legacy backup** — once deploy is verified green

## Design Decisions

- **No `vercel.json` currently in repo** — Vercel is auto-detecting settings; likely running `npm run validate` as the build command (since `package.json` has a `validate` script and Node 24.x is configured). A `vercel.json` pinning `"buildCommand": ""` and `"outputDirectory": "."` is the fix.
- **Plain static, no tooling churn** — YAGNI; `validate-site.mjs` is a local QA tool, not a deploy gate
- **Domain wiring deferred** — get green deploy first; DNS changes happen separately

## Out of Scope

- `www.oakandpixel.co.za` domain attachment
- Any page content changes
- HIMARK-style build scripts (the site has only 4 pages)
