# SEO, AEO, And GEO Notes

This site uses three layers of discoverability.

## SEO

Search engine basics:

- Unique `<title>` and meta description per page.
- Canonical URL per page.
- Open Graph and Twitter card metadata for social previews.
- `sitemap.xml` and `robots.txt`.
- JSON-LD on the homepage for business/entity clarity.

Google's own documentation frames structured data as explicit clues that help Search understand page meaning, and sitemaps/canonicals help crawlers discover and consolidate URLs.

## AEO

Answer engine optimization focuses on making concise, factual answers easy to extract.

Current assets:

- Clear service summaries in `site.config.json`.
- Contact, location, and service facts in `llms.txt`.
- Longer question-and-answer content in `llms-full.txt`.

When adding new services, add concise answer-ready copy:

- Who it is for.
- What it includes.
- What outcome it supports.
- How to start.

## GEO

Generative engine optimization is still an emerging discipline, so this repo treats it as a clarity and citation layer rather than a ranking trick.

Current assets:

- `llms.txt`: short AI-readable orientation.
- `llms-full.txt`: fuller context, service answers, and canonical links.
- Structured data and consistent entity facts.

Important limits:

- `llms.txt` is an emerging convention, not a guaranteed ranking factor.
- Never put secrets, unpublished client details, credentials, or private strategy in AI-facing files.
- Keep claims specific, verifiable, and aligned with visible site content.

## Update Checklist

When changing services, positioning, contact details, or pricing:

1. Update visible HTML.
2. Update `site.config.json`.
3. Update `llms.txt` and `llms-full.txt`.
4. Update structured data if the entity facts changed.
5. Run `npm run validate`.
