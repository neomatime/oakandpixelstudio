# Reliability Safety Net — Design Spec

**Date:** 2026-06-22
**Status:** Approved (pending spec review)
**Scope:** Sub-project 1 of 3 (reliability). Security hardening and architecture are separate later cycles.

## Goal

Add an automated safety net that catches, before deploy, the class of bugs that took down login — both the **parse-time** kind (`node --check`) and the **runtime load-order** kind (a headless browser smoke test) — and run it in CI on every push.

## Background

- The admin app is a no-bundler static site: ordered global `<script>` tags + `admin.css` + `admin.html`, backed by Supabase (client-side).
- There is **no CI** (`.github/` is empty). The existing `npm run validate` (`scripts/validate-site.mjs`) only checks the public pages' SEO (canonical/meta/OG/sitemap/robots/JSON-LD) — it never parse-checks the admin JS, so it would not have caught either login outage.
- Two real outages motivated this: (1) a duplicate `function` declaration under `'use strict'` → fatal parse error in `core.js`; (2) `init()` invoked at the end of `nav.js` before `buildTimePills` (in the later-loaded `bookings.js`) was defined → runtime `ReferenceError`, so the auth listener never registered.

## Tech Stack

Node ≥ 20, npm, Playwright (`@playwright/test`, dev-only), GitHub Actions. No runtime dependencies added.

## Global Constraints

- **No runtime dependencies added** — Playwright is `devDependencies` only; the shipped site stays dependency-light.
- **Cross-platform** — tooling scripts run on Windows (dev) and Linux (CI); no shell globbing, use Node APIs.
- **ESM** — `package.json` has `"type": "module"`; new scripts/config are `.mjs` ESM (matching `scripts/validate-site.mjs`).
- **Hermetic smoke** — the smoke test must pass without Supabase credentials or `/api` running (a fresh page load with no session shows the login screen).
- **Don't wire a failing check** — `npm run validate` must be confirmed green before it is added to CI; if it currently fails, surface that, don't paper over it.

---

## Components

### 1. `scripts/static-server.mjs` + `npm run dev`

Zero-dependency static file server (correct MIME types), serving the repo root. Doubles as the documented local dev server (fixes the recurring "localhost:3000 not working") and the server Playwright drives in CI.

```js
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(process.argv[2] || process.env.SERVE_ROOT || '.');
const port = Number(process.argv[3] || process.env.PORT || 3000);
const MIME = {
  '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8',
  '.js':'text/javascript; charset=utf-8', '.mjs':'text/javascript; charset=utf-8',
  '.json':'application/json; charset=utf-8', '.svg':'image/svg+xml',
  '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.webp':'image/webp',
  '.gif':'image/gif', '.ico':'image/x-icon', '.woff':'font/woff', '.woff2':'font/woff2',
  '.ttf':'font/ttf', '.map':'application/json'
};

http.createServer(async (req, res) => {
  let rel = decodeURIComponent((req.url || '/').split('?')[0]);
  if (rel === '/' || rel === '') rel = '/index.html';
  const fp = path.join(root, rel);
  if (!fp.startsWith(root)) { res.writeHead(403); res.end('Forbidden'); return; }
  try {
    const data = await readFile(fp);
    res.writeHead(200, { 'content-type': MIME[path.extname(fp).toLowerCase()] || 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain' }); res.end('Not found: ' + rel);
  }
}).listen(port, () => console.log(`Static server: http://localhost:${port} (root: ${root})`));
```

`package.json` script: `"dev": "node scripts/static-server.mjs"`.

### 2. `scripts/check-syntax.mjs` + `npm run check` — catches bug class #1

Runs `node --check` on every deployable JS file (root-level `*.js`, plus `js/` and `api/` one level deep), exits non-zero on any failure.

```js
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);
const root = process.cwd();
const dirs = ['.', 'js', 'api'];

async function jsFiles() {
  const out = [];
  for (const dir of dirs) {
    let entries;
    try { entries = await readdir(path.join(root, dir), { withFileTypes: true }); }
    catch { continue; }
    for (const e of entries) {
      if (e.isFile() && e.name.endsWith('.js')) out.push(path.join(dir, e.name));
    }
  }
  return out;
}

let failed = 0;
for (const f of await jsFiles()) {
  try { await run(process.execPath, ['--check', f]); console.log('ok   ' + f); }
  catch (err) { failed++; console.error('FAIL ' + f + '\n' + (err.stderr || err.message)); }
}
if (failed) { console.error(`\n${failed} file(s) failed node --check.`); process.exit(1); }
console.log('\nAll JS files passed node --check.');
```

`package.json` script: `"check": "node scripts/check-syntax.mjs"`.

### 3. Playwright smoke test — catches bug class #2

`playwright.config.mjs`:
```js
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  retries: process.env.CI ? 1 : 0,
  use: { baseURL: 'http://localhost:3000' },
  webServer: {
    command: 'npm run dev',
    port: 3000,
    reuseExistingServer: !process.env.CI,
    timeout: 30000
  }
});
```

`tests/smoke.spec.mjs`:
```js
import { test, expect } from '@playwright/test';

// Pages that must load with ZERO console errors and no uncaught exceptions.
const CLEAN_PAGES = ['/admin.html', '/index.html'];
// sign.html needs the /api functions + a token (not running under the static
// server), so it gets the lighter check: no UNCAUGHT exception (a handled
// /api fetch failure may log a console error, which is tolerated here).
const NO_THROW_PAGES = ['/sign.html'];

for (const route of CLEAN_PAGES) {
  test(`${route} loads with no console errors`, async ({ page }) => {
    const errors = [];
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', e => errors.push(String(e)));
    await page.goto(route, { waitUntil: 'load' });
    await page.waitForTimeout(1500); // let DOMContentLoaded init + getSession settle
    expect(errors, `errors on ${route}:\n${errors.join('\n')}`).toEqual([]);
  });
}

for (const route of NO_THROW_PAGES) {
  test(`${route} loads with no uncaught exceptions`, async ({ page }) => {
    const thrown = [];
    page.on('pageerror', e => thrown.push(String(e)));
    await page.goto(route, { waitUntil: 'load' });
    await page.waitForTimeout(1500);
    expect(thrown, `uncaught exceptions on ${route}:\n${thrown.join('\n')}`).toEqual([]);
  });
}

test('/admin.html renders the login screen', async ({ page }) => {
  await page.goto('/admin.html', { waitUntil: 'load' });
  await expect(page.locator('#login-btn')).toBeVisible();
  await expect(page.locator('#login-email')).toBeVisible();
});
```

`package.json` script: `"test:smoke": "playwright test"`. Dev dependency: `@playwright/test`.

**Flakiness note:** if a *confirmed-benign* third-party console error appears on a CLEAN_PAGES load during implementation (e.g. a CDN/library notice), add a narrow substring allowlist filter in the `console` handler — never a blanket "ignore errors."

### 4. CI — `.github/workflows/ci.yml`

```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run check
      - run: npm run validate
      - run: npx playwright install --with-deps chromium
      - run: npm run test:smoke
```

Requires a committed `package-lock.json` (for `npm ci` + npm cache). Generated by `npm install` when the dev dependency is added.

### 5. Docs — `README.md` section

Add (create `README.md` if absent):
- **Local dev:** `npm run dev` → http://localhost:3000/admin.html
- **Checks:** `npm run check` (JS parse), `npm run validate` (SEO), `npm run test:smoke` (headless load test)
- **No-bundler contract:** modules are plain global `<script>`s sharing one scope; bootstrap (`init()`) runs on `DOMContentLoaded`; never declare the same top-level name twice (`'use strict'` makes it a fatal parse error); a function used at startup must live in a module loaded before, or be called after `DOMContentLoaded`.
- **Make CI block deploys (one-time, user action):** GitHub → Settings → Branches → add a branch protection rule on `main` requiring the **CI / verify** check; *or* Vercel → Project → Settings → Git → enable "only deploy when checks pass" (or an Ignored Build Step that fails on red CI).

---

## package.json changes

- `scripts`: add `dev`, `check`, `test:smoke` (keep existing `build`, `validate`).
- `devDependencies`: add `@playwright/test`.
- Commit the resulting `package-lock.json`.

## .gitignore changes

Ensure ignored: `node_modules/`, `test-results/`, `playwright-report/`, `blob-report/`, `playwright/.cache/`.

## Error handling / edge cases

- `npm run validate` must already pass on the committed site; if it fails, that is a real finding to fix or surface — do not remove it from CI to make CI green.
- Smoke asserts on **console errors + uncaught exceptions only** (not warnings) to avoid flake.
- CDN `<script>`s (supabase, chart.js, flatpickr, jspdf, html2pdf) load during the smoke test; CI has network. If a CDN flake causes intermittent failure, the `retries: 1` in CI absorbs transient blips.

## Verification

- Local: `npm run check` passes; `npm run test:smoke` passes (Chromium installed locally); `npm run dev` serves admin.html.
- CI: the workflow runs green on a clean push, and **red** if a JS file is given a deliberate syntax error or a startup `ReferenceError` (sanity-checked once during implementation, then reverted).

## Out of scope

- Full end-to-end tests (real login, page navigation) — needs test credentials as CI secrets; deferred.
- App-wide unit-test framework — the parse + smoke net is the pragmatic 80/20.
- Security hardening and the architecture refactor — separate cycles.
- Changing Vercel/GitHub settings to gate deploys — documented for the user to action (no repo access to those settings).
