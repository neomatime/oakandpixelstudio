# Oak & Pixel Studio website

Static marketing site for Oak & Pixel Studio, a web design agency in Randburg,
South Africa. Plain HTML, CSS and JavaScript with no bundler. Deployed on
Vercel from `main`.

> The root `package.json` / `package-lock.json` are intentionally **git-ignored**
> (local tooling only) so Vercel deploys the repo as a pure static site. Don't
> commit a root `package.json`. CI runs the committed scripts in `scripts/`.

## Pages

- `index.html` — homepage (plans, process, booking, application form)
- `brochure.html`, `privacy.html`, `terms.html`
- `site.config.json` — source of truth for business facts (contact, plans, URLs)
- `llms.txt`, `llms-full.txt`, `answer-engine.json` — search and AI discovery files
- `documents/` — brochure (`.docx` and `.pdf`), built by `scripts/generate-brochure.cjs`

## Data

The homepage reads the service plans and available booking slots from Supabase
(`services`, `available_slots`) and writes bookings and applications
(`bookings`, `applications`). The database schema history is in `migrations/`.
There is currently no admin interface for this data; use the Supabase dashboard.

## Local development

```bash
node scripts/static-server.mjs        # serves the repo on http://localhost:3000
```

## Checks (run in CI on every push to main)

```bash
node scripts/check-syntax.mjs         # node --check on any JS files
node scripts/validate-site.mjs        # SEO/meta validation of public pages
npx playwright test                   # headless: pages load with no console errors
```

The first two need only Node. The smoke test needs Playwright:
```bash
npm install --no-save @playwright/test@1.49.1
npx playwright install chromium
```

> Playwright cannot run locally from a path containing spaces or `&`, which
> includes this folder on Windows. The smoke test runs in CI, or from a checkout
> in a clean path.

See `docs/MAINTENANCE.md` and `docs/SEO-AEO-GEO.md` for editing rules.
