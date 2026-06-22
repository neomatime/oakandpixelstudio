# OPS Command Center

Private admin tool for Oak & Pixel Studio. Static front-end (`admin.html` +
`admin.css` + `js/*.js`) backed by Supabase, with serverless functions in
`api/`. No bundler — see the architecture contract below before refactoring.

> The root `package.json` / `package-lock.json` are intentionally **git-ignored**
> (local tooling only) so Vercel deploys the repo as a pure static site + `api/`
> functions. Don't commit a root `package.json`. CI runs the committed scripts in
> `scripts/` directly.

## Local development

```bash
node scripts/static-server.mjs        # serves the repo on http://localhost:3000
```
Then open http://localhost:3000/admin.html. (If you keep the local
`package.json`, `npm run dev` is the same thing.)

## Checks (these run in CI on every push to main)

```bash
node scripts/check-syntax.mjs         # node --check on all JS (root, js/, api/)
node scripts/validate-site.mjs        # SEO/meta validation of public pages
npx playwright test                   # headless: pages load with no console errors
```

The first two need only Node. The smoke test needs Playwright:
```bash
npm install --no-save @playwright/test@1.49.1
npx playwright install chromium
npx playwright test
```

> **Heads-up on this folder's path:** Playwright cannot run locally from a path
> containing spaces or `&` — and this project lives under `…/Oak & Pixel Studio/…`,
> which breaks Playwright's process spawning on Windows. The parse-check and dev
> server work fine here; the **smoke test runs in CI** (clean Linux path) or from a
> checkout in a path without spaces/`&`. Moving the project to such a path would
> let you run the smoke test locally too.

## Front-end architecture contract (read before refactoring)

The admin app is a **no-bundler** app: plain global `<script>` tags share one
scope (no imports/exports). Two outages came from violating these rules; CI now
guards them:

- **Never declare the same top-level name twice.** Every module begins with
  `'use strict'`, so a duplicate top-level `function`/`const` is a *fatal parse
  error* for the whole file.
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
