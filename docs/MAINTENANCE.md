# Oak & Pixel Site Maintenance

This repository is a static website: four HTML pages, images, favicons, a brochure PDF, and lightweight search/discovery files.

## Source Of Truth

Use `site.config.json` as the first place to check business facts:

- Contact email and phone
- WhatsApp URL
- Social links
- Canonical page URLs
- Core service names and summaries
- Required deploy files

The HTML is still hand-authored, so when business details change, update both the visible HTML and `site.config.json`, then run validation.

## Validation

Run this before every commit:

```bash
npm run validate
```

The validator checks required files, canonical URLs, metadata, JSON-LD parseability, sitemap coverage, unsafe blank-target links, and stale patterns such as Cloudflare email-protection markup.

## Deployment

Deploy from the `main` branch of:

```text
https://github.com/neomatime/oakandpixel.git
```

Current static hosting assumptions:

- `index.html` is the homepage.
- `robots.txt`, `sitemap.xml`, `llms.txt`, and `llms-full.txt` live at the web root.
- The contact form posts directly to HubSpot.
- The Cal.com embed lazy-loads only when the Digital Advisory option is selected.
- `/api/chat` may be absent on static hosting; the homepage includes a browser-side fallback response.

## Editing Rules

- Keep contact, service, and social facts consistent with `site.config.json`.
- Do not reintroduce `/cdn-cgi/` email-protection markup.
- Do not use `href="#"` for live footer/social links.
- Use `rel="noopener noreferrer"` on external links that open in a new tab.
- Keep public AI/search files factual and free of private client information.

## Future Maintainability Upgrade

The next structural step is to split repeated navigation, footer, metadata, CSS, and JavaScript into a small static build pipeline. Good options:

- Eleventy for simple static generation.
- Astro if component structure and islands become useful.
- Vite with plain HTML modules if the site remains mostly custom.

Do that as a separate refactor with visual regression checks.
