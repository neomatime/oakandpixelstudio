# Reliability Safety Net Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add CI that, on every push, parse-checks all JS and headlessly smoke-loads the pages — catching both the parse-time and runtime-load-order bug classes that took down login.

**Architecture:** A committed zero-dep Node static server (`npm run dev`) serves the site locally and drives a Playwright smoke test; a `node --check` script catches syntax/strict-mode errors; a GitHub Actions workflow runs check + validate + smoke on every push/PR to `main`. No runtime dependencies added.

**Tech Stack:** Node ≥ 20, npm, `@playwright/test` (dev-only), GitHub Actions. Spec: `docs/superpowers/specs/2026-06-22-reliability-safety-net-design.md`.

## Global Constraints

- **No runtime dependencies** — `@playwright/test` goes in `devDependencies` only.
- **Cross-platform** — tooling runs on Windows (dev) and Linux (CI); use Node APIs, no shell globbing.
- **ESM** — `package.json` has `"type": "module"`; all new scripts/config are `.mjs`.
- **Hermetic smoke** — the smoke test must pass with no Supabase credentials and no `/api` running (a fresh page load with no session shows the login screen).
- **Don't wire a failing check** — confirm `npm run validate` is green before adding it to CI; if it fails, surface it, don't remove it.
- **Verification reality** — local verification is `npm run <script>` output; installing `@playwright/test` and its Chromium binary requires network (fine in CI; locally may need a sandbox bypass). If browsers can't be installed in the implementer's environment, the smoke test's authoritative run is the first CI run.

---

## File Structure

- **Create** `scripts/static-server.mjs` — zero-dep static file server (MIME-correct), serves repo root.
- **Create** `scripts/check-syntax.mjs` — runs `node --check` on all deployable JS.
- **Create** `playwright.config.mjs` — Playwright config; `webServer` = `npm run dev`.
- **Create** `tests/smoke.spec.mjs` — headless load smoke test.
- **Create** `.github/workflows/ci.yml` — CI pipeline.
- **Create** `README.md` — dev/checks/contract/gating docs.
- **Modify** `package.json` — add `dev`/`check`/`test:smoke` scripts + `@playwright/test` devDependency.
- **Create/commit** `package-lock.json` — for `npm ci` in CI.
- **Modify/create** `.gitignore` — ignore `node_modules/` + Playwright artifacts.

---

### Task 1: Static dev server + `npm run dev` + .gitignore

**Files:**
- Create: `scripts/static-server.mjs`
- Modify: `package.json` (add `dev` script)
- Modify/create: `.gitignore`

**Interfaces:**
- Produces: a static server started by `node scripts/static-server.mjs [root] [port]` (defaults: cwd, 3000), serving the repo root with correct MIME types. Consumed by Task 3's Playwright `webServer` via `npm run dev`.

- [ ] **Step 1: Create `scripts/static-server.mjs`**

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

- [ ] **Step 2: Add the `dev` script to `package.json`**

In `"scripts"`, add `"dev": "node scripts/static-server.mjs"` (keep `build`, `validate`).

- [ ] **Step 3: Ensure `.gitignore` ignores deps + Playwright artifacts**

Create `.gitignore` if absent; ensure it contains:
```
node_modules/
test-results/
playwright-report/
blob-report/
playwright/.cache/
```

- [ ] **Step 4: Verify the server serves with correct MIME types**

Start it in the background, then probe (run from repo root):
```bash
node scripts/static-server.mjs . 3000 &
SRV=$!
sleep 1
curl -sS -o /dev/null -w "admin.html %{http_code} %{content_type}\n" http://localhost:3000/admin.html
curl -sS -o /dev/null -w "admin.css  %{http_code} %{content_type}\n" http://localhost:3000/admin.css
curl -sS -o /dev/null -w "profile.js %{http_code} %{content_type}\n" http://localhost:3000/js/profile.js
kill $SRV
```
Expected: `admin.html 200 text/html; charset=utf-8`, `admin.css 200 text/css; charset=utf-8`, `profile.js 200 text/javascript; charset=utf-8`.

- [ ] **Step 5: Commit**

```bash
git add scripts/static-server.mjs package.json .gitignore
git commit -m "feat(ci): static dev server + npm run dev"
```

---

### Task 2: Parse-check script + `npm run check`

**Files:**
- Create: `scripts/check-syntax.mjs`
- Modify: `package.json` (add `check` script)

**Interfaces:**
- Produces: `npm run check` → runs `node --check` on every `.js` in repo root, `js/`, and `api/`; exits 0 if all pass, 1 if any fail. Consumed by Task 4 (CI).

- [ ] **Step 1: Create `scripts/check-syntax.mjs`**

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

- [ ] **Step 2: Add the `check` script to `package.json`**

In `"scripts"`, add `"check": "node scripts/check-syntax.mjs"`.

- [ ] **Step 3: Verify it passes on the current code**

```bash
npm run check
```
Expected: a list of `ok <file>` lines (including `js/core.js`, `js/nav.js`, `sow-blueprints.js`, …) ending with `All JS files passed node --check.` and exit code 0.

- [ ] **Step 4: Verify it FAILS on a deliberate syntax error (then revert)**

```bash
printf '\nfunction (){' >> js/profile.js     # break it
npm run check; echo "exit=$?"                 # expect FAIL js/profile.js, exit=1
git checkout -- js/profile.js                 # revert
npm run check                                 # expect all ok again
```
Expected: the broken run prints `FAIL js/profile.js` and `exit=1`; after revert, all `ok`.

- [ ] **Step 5: Commit**

```bash
git add scripts/check-syntax.mjs package.json
git commit -m "feat(ci): node --check parse-check script + npm run check"
```

---

### Task 3: Playwright headless smoke test

**Files:**
- Create: `playwright.config.mjs`
- Create: `tests/smoke.spec.mjs`
- Modify: `package.json` (add `test:smoke` script + `@playwright/test` devDependency)
- Create/commit: `package-lock.json`

**Interfaces:**
- Consumes: `npm run dev` static server (Task 1) via `webServer`.
- Produces: `npm run test:smoke` → runs the Playwright suite. Consumed by Task 4 (CI).

- [ ] **Step 1: Add `@playwright/test` as a dev dependency (generates the lockfile)**

```bash
npm install --save-dev @playwright/test
```
This adds `@playwright/test` to `devDependencies` and creates/updates `package-lock.json`.

- [ ] **Step 2: Install the Chromium browser locally**

```bash
npx playwright install chromium
```
(Network required. In CI this is done with `--with-deps`; see Task 4.)

- [ ] **Step 3: Create `playwright.config.mjs`**

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

- [ ] **Step 4: Create `tests/smoke.spec.mjs`**

```js
import { test, expect } from '@playwright/test';

// Pages that must load with ZERO console errors and no uncaught exceptions.
const CLEAN_PAGES = ['/admin.html', '/index.html'];
// sign.html needs /api + a token (not present under the static server), so it
// gets the lighter check: no UNCAUGHT exception (a handled /api fetch failure
// may log a console error, which is tolerated here).
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

- [ ] **Step 5: Add the `test:smoke` script to `package.json`**

In `"scripts"`, add `"test:smoke": "playwright test"`.

- [ ] **Step 6: Run the smoke suite**

```bash
npm run test:smoke
```
Expected: all tests pass (admin.html + index.html no console errors; sign.html no uncaught exception; admin.html login renders). If a CLEAN page surfaces a *confirmed-benign* third-party console error, add a narrow substring filter in its `console` handler (e.g. `if (m.type()==='error' && !m.text().includes('<benign substring>')) errors.push(...)`) — never a blanket ignore — and note it in the report.

- [ ] **Step 7: Commit**

```bash
git add playwright.config.mjs tests/smoke.spec.mjs package.json package-lock.json
git commit -m "test(ci): headless smoke test (Playwright) for page loads"
```

---

### Task 4: CI workflow

**Files:**
- Create: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: `npm run check` (Task 2), `npm run validate` (existing), `npm run test:smoke` (Task 3), `package-lock.json` (Task 3).

- [ ] **Step 1: Confirm `npm run validate` currently passes (don't wire a failing check)**

```bash
npm run validate
```
Expected: `Site validation passed for N pages.` and exit 0. If it FAILS, stop and report the failures — they are a real finding to resolve before wiring validate into CI (do not drop validate to make CI green).

- [ ] **Step 2: Create `.github/workflows/ci.yml`**

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

- [ ] **Step 3: Verify the CI command sequence passes locally**

Run the same commands the workflow runs (browser already installed in Task 3):
```bash
npm run check && npm run validate && npm run test:smoke && echo "CI sequence OK"
```
Expected: ends with `CI sequence OK`. (The authoritative run is the first push; this local pass is the pre-check.)

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: run parse-check, validate, and smoke on push/PR to main"
```

---

### Task 5: README docs

**Files:**
- Create/modify: `README.md`

**Interfaces:**
- None (documentation).

- [ ] **Step 1: Create/append `README.md` with the operational docs**

If `README.md` exists, append these sections; otherwise create it with them:
```markdown
## Local development

```bash
npm install
npm run dev          # serves the site at http://localhost:3000
```
Open http://localhost:3000/admin.html for the admin app.

## Checks (run by CI on every push)

```bash
npm run check        # node --check on all JS (catches syntax / strict-mode errors)
npm run validate     # SEO/meta validation of public pages
npm run test:smoke   # headless Chromium: pages load with no console errors
```

## Front-end architecture contract (read before refactoring)

The admin app is a **no-bundler** app: plain global `<script>` tags share one
scope (no imports/exports). To avoid the two classes of outage CI now guards:

- **Never declare the same top-level name twice.** Every module starts with
  `'use strict'`, so a duplicate top-level `function`/`const` is a *fatal parse
  error* across the whole file.
- **Bootstrap on `DOMContentLoaded`.** `init()` (in `js/nav.js`) runs on
  `DOMContentLoaded`, after every `<script>` has executed. A function used at
  startup must be defined in a module loaded *before* it, or only called after
  `DOMContentLoaded` — otherwise it is `undefined` when the calling module runs.

## Making CI block deploys (one-time setup)

CI produces a pass/fail check but does not, by itself, stop a deploy. To gate:
- **GitHub branch protection:** Settings → Branches → add a rule on `main` →
  require the **CI / verify** status check to pass before merging.
- **or Vercel:** Project → Settings → Git → enable "only deploy when checks
  pass" (or add an Ignored Build Step that exits non-zero when CI is red).
```

- [ ] **Step 2: Verify the doc commands are accurate**

Confirm every command referenced (`npm run dev`, `npm run check`, `npm run validate`, `npm run test:smoke`) exists in `package.json` `"scripts"`.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: dev server, checks, no-bundler contract, deploy gating"
```

---

## Notes for the implementer

- `npm install` / `npx playwright install` need network. In a sandboxed local shell this may require a bypass; CI (ubuntu-latest) has network.
- If `@playwright/test` cannot be installed locally, implement Tasks 3–4 as written, commit, and treat the **first CI run** as the authoritative smoke verification (note this in the report).
- After all tasks, the real proof is a green **CI / verify** check on the push. If the user enables branch protection / Vercel gating (Task 5 docs), the net actually blocks bad deploys.
