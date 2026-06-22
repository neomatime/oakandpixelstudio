# Website Repositioning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reposition the Oak & Pixel Studio public website from a web-agency to a premium digital infrastructure studio powered by OPS Command Center — copy and content changes only.

**Architecture:** All changes are confined to `index.html`. No layout, CSS, animation, or structural changes. No new files created. Each task edits a discrete section of the file and ends with a syntax check + commit.

**Tech Stack:** Static HTML, no build step. Verification: `node scripts/check-syntax.mjs` (JS parse check), `node scripts/validate-site.mjs` (page load check).

## Global Constraints

- Repo root: `C:\Users\Neo\OneDrive\Documents\Oak & Pixel Studio\OPS\oakandpixel`
- File being modified: `index.html` (this is the only file that changes)
- Do NOT commit a root `package.json` — Vercel static-site mode; adding one switches Vercel to Node build and breaks deploys
- Do NOT touch: any CSS, animations, layout classes, JS functions, or visual structure
- Prices, slot counts, and feature bullet lists in the pricing section are UNCHANGED
- `brochure.html` is OUT OF SCOPE — do not touch it
- After every task: run `node scripts/check-syntax.mjs` from repo root — must exit 0
- Branch: `feature/website-repositioning` — merge to main only after Task 6

---

### Task 1: Meta, SEO & Navigation

**Files:**
- Modify: `index.html` (lines ~6–18 for meta, lines ~1634 and ~1672 for nav CTAs)

- [ ] **Step 1: Create the feature branch**

```bash
cd "C:/Users/Neo/OneDrive/Documents/Oak & Pixel Studio/OPS/oakandpixel"
git checkout -b feature/website-repositioning
```

Expected: `Switched to a new branch 'feature/website-repositioning'`

- [ ] **Step 2: Update the page `<title>`**

Find and replace in `index.html`:

Old:
```
<title>Oak & Pixel — Digital Infrastructure, Designed with Distinction</title>
```

New:
```
<title>Oak & Pixel — Digital Infrastructure, Built to Grow With Your Business</title>
```

- [ ] **Step 3: Update the meta description**

Find and replace in `index.html`:

Old:
```
<meta name="description" content="Oak & Pixel Studio is a boutique premium digital studio in Randburg building refined websites, booking experiences, client portals, integrations, and ongoing digital presence management.">
```

New:
```
<meta name="description" content="Oak & Pixel Studio builds the digital infrastructure service-based businesses run on. From your website to bookings, customers and content — managed from one command center.">
```

- [ ] **Step 4: Update OG title**

Find and replace in `index.html`:

Old:
```
<meta property="og:title" content="Oak & Pixel - Digital Infrastructure, Designed with Distinction">
```

New:
```
<meta property="og:title" content="Oak & Pixel - Digital Infrastructure, Built to Grow With Your Business">
```

- [ ] **Step 5: Update OG description**

Find and replace in `index.html`:

Old (appears once as `og:description`):
```
<meta property="og:description" content="Oak & Pixel Studio is a boutique premium digital studio in Randburg building refined websites, booking experiences, client portals, integrations, and ongoing digital presence management.">
```

New:
```
<meta property="og:description" content="Oak & Pixel Studio builds the digital infrastructure service-based businesses run on. From your website to bookings, customers and content — managed from one command center.">
```

- [ ] **Step 6: Update Twitter title**

Find and replace in `index.html`:

Old:
```
<meta name="twitter:title" content="Oak & Pixel - Digital Infrastructure, Designed with Distinction">
```

New:
```
<meta name="twitter:title" content="Oak & Pixel - Digital Infrastructure, Built to Grow With Your Business">
```

- [ ] **Step 7: Update Twitter description**

Find and replace in `index.html`:

Old:
```
<meta name="twitter:description" content="Oak & Pixel Studio is a boutique premium digital studio in Randburg building refined websites, booking experiences, client portals, integrations, and ongoing digital presence management.">
```

New:
```
<meta name="twitter:description" content="Oak & Pixel Studio builds the digital infrastructure service-based businesses run on. From your website to bookings, customers and content — managed from one command center.">
```

- [ ] **Step 8: Update desktop nav CTA**

Find and replace in `index.html`:

Old:
```
<a href="#contact" class="nav-cta">Start a Project</a>
```

New:
```
<a href="#contact" class="nav-cta">Explore Plans</a>
```

- [ ] **Step 9: Update mobile drawer CTA**

Find and replace in `index.html`:

Old:
```
<a href="#contact" class="mob-drawer-cta">Start a Project</a>
```

New:
```
<a href="#contact" class="mob-drawer-cta">Explore Plans</a>
```

- [ ] **Step 10: Verify — old strings are gone**

```bash
grep -n "Designed with Distinction" index.html
grep -n "boutique premium digital studio" index.html
grep -n "Start a Project" index.html
```

Expected: all three return **no output** (zero matches).

- [ ] **Step 11: Verify — new strings are present**

```bash
grep -n "Built to Grow With Your Business" index.html
grep -n "managed from one command center" index.html
grep -n "Explore Plans" index.html
```

Expected: each returns **at least one match**.

- [ ] **Step 12: Run syntax check**

```bash
node scripts/check-syntax.mjs
```

Expected: `All JS files passed node --check.` and exit 0.

- [ ] **Step 13: Commit**

```bash
git add index.html
git commit -m "feat(copy): update meta, SEO tags and nav CTA for repositioning"
```

---

### Task 2: Hero Section

**Files:**
- Modify: `index.html` (hero section, approximately lines 1693–1725)

- [ ] **Step 1: Update the hero eyebrow**

Find and replace in `index.html`:

Old:
```html
      <div class="hero-eyebrow">Premium Digital Studio</div>
```

New:
```html
      <div class="hero-eyebrow">Powered by OPS Command Center</div>
```

- [ ] **Step 2: Update the hero headline**

Find and replace in `index.html`:

Old:
```html
      <h1 class="hero-headline">
        Digital infrastructure,<br>
        designed with<br>
        <em>distinction.</em>
      </h1>
```

New:
```html
      <h1 class="hero-headline">
        Digital infrastructure<br>
        built to grow with<br>
        <em>your business.</em>
      </h1>
```

- [ ] **Step 3: Update the hero subheadline**

Find and replace in `index.html`:

Old:
```html
      <p class="hero-sub">
        We build precision-crafted digital experiences for brands that refuse to compromise. Architecture-grade thinking. Editorial-grade aesthetics.
      </p>
```

New:
```html
      <p class="hero-sub">
        Oak &amp; Pixel Studio builds, manages and continuously evolves the systems behind your business. From your website to bookings, customers and content, everything is managed from a single command center.
      </p>
```

- [ ] **Step 4: Update the primary CTA text**

Find and replace in `index.html`:

Old:
```html
          Start Your Project
```

New:
```html
          Explore Plans
```

Note: This text sits inside the `.btn-primary` anchor in the hero. Confirm it's the correct instance by checking the surrounding context — it should be inside `.hero-actions`.

- [ ] **Step 5: Update the secondary CTA**

Find and replace in `index.html`:

Old:
```html
        <a href="" onclick="openBookingModal();return false;" class="btn-ghost">Book a Discovery Call</a>
```

New:
```html
        <a href="#ops-command-center" class="btn-ghost">See OPS Command Center</a>
```

- [ ] **Step 6: Verify — old strings are gone**

```bash
grep -n "Premium Digital Studio" index.html
grep -n "distinction." index.html
grep -n "precision-crafted digital experiences" index.html
grep -n "Book a Discovery Call" index.html
grep -n "openBookingModal" index.html
```

Expected: all return **no output**.

- [ ] **Step 7: Verify — new strings are present**

```bash
grep -n "Powered by OPS Command Center" index.html
grep -n "built to grow with" index.html
grep -n "single command center" index.html
grep -n "See OPS Command Center" index.html
grep -n "ops-command-center" index.html
```

Expected: each returns at least one match.

- [ ] **Step 8: Run syntax check**

```bash
node scripts/check-syntax.mjs
```

Expected: exit 0.

- [ ] **Step 9: Commit**

```bash
git add index.html
git commit -m "feat(copy): reposition hero — OPS badge, new headline, sub and CTAs"
```

---

### Task 3: About Section

**Files:**
- Modify: `index.html` (about section, approximately lines 1727–1773)

- [ ] **Step 1: Update the about body — second paragraph**

Find and replace in `index.html`:

Old (this is the last two sentences inside the second `.about-body` paragraph):
```
We don't produce websites. We construct digital presence.
```

New:
```
We don't build websites. We build the infrastructure your business runs on.
```

The full second `.about-body` paragraph after the edit should read:
```html
        <p class="about-body">
          We operate at the intersection of technology and taste. Every system we build, every surface we design, carries the weight of genuine craft. We don't build websites. We build the infrastructure your business runs on.
        </p>
```

- [ ] **Step 2: Verify — old string is gone**

```bash
grep -n "We don't produce websites" index.html
```

Expected: **no output**.

- [ ] **Step 3: Verify — new string is present**

```bash
grep -n "We build the infrastructure your business runs on" index.html
```

Expected: one match.

- [ ] **Step 4: Run syntax check**

```bash
node scripts/check-syntax.mjs
```

Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "feat(copy): update about section — infrastructure framing"
```

---

### Task 4: New OPS Command Center Section

**Files:**
- Modify: `index.html` — insert new `<section>` block between `#founder` and `#services`

- [ ] **Step 1: Locate the insertion point**

In `index.html`, find this exact comment line:
```html
<!-- ══════════════ SERVICES ══════════════ -->
```

The new section must be inserted **immediately before** this comment line.

- [ ] **Step 2: Insert the new section**

Insert the following block immediately before `<!-- ══════════════ SERVICES ══════════════ -->`:

```html
<!-- ══════════════ OPS COMMAND CENTER ══════════════ -->
<section id="ops-command-center" style="padding:10rem 0;background:var(--off-white);">
  <div class="container">
    <div class="label reveal">OPS Command Center</div>
    <h2 class="reveal reveal-delay-1" style="font-family:var(--font-display);font-size:clamp(2.4rem,4vw,3.8rem);font-weight:300;line-height:1.1;letter-spacing:-.01em;margin-bottom:1.5rem;">
      One place to manage your<br>entire business presence.
    </h2>
    <p class="reveal reveal-delay-2" style="color:var(--slate);font-size:.98rem;line-height:1.8;max-width:580px;margin-bottom:3.5rem;">
      OPS Command Center powers everything behind the scenes so you no longer depend on developers to keep your business up to date.
    </p>
    <div class="reveal reveal-delay-3" style="display:flex;flex-wrap:wrap;gap:.75rem;">
      <span style="font-family:var(--font-mono);font-size:.7rem;letter-spacing:.12em;text-transform:uppercase;padding:.55rem 1.1rem;border:1px solid var(--silk);color:var(--slate);background:var(--white);">Website Content</span>
      <span style="font-family:var(--font-mono);font-size:.7rem;letter-spacing:.12em;text-transform:uppercase;padding:.55rem 1.1rem;border:1px solid var(--silk);color:var(--slate);background:var(--white);">Services</span>
      <span style="font-family:var(--font-mono);font-size:.7rem;letter-spacing:.12em;text-transform:uppercase;padding:.55rem 1.1rem;border:1px solid var(--silk);color:var(--slate);background:var(--white);">Team Members</span>
      <span style="font-family:var(--font-mono);font-size:.7rem;letter-spacing:.12em;text-transform:uppercase;padding:.55rem 1.1rem;border:1px solid var(--silk);color:var(--slate);background:var(--white);">Blogs</span>
      <span style="font-family:var(--font-mono);font-size:.7rem;letter-spacing:.12em;text-transform:uppercase;padding:.55rem 1.1rem;border:1px solid var(--silk);color:var(--slate);background:var(--white);">Customers</span>
      <span style="font-family:var(--font-mono);font-size:.7rem;letter-spacing:.12em;text-transform:uppercase;padding:.55rem 1.1rem;border:1px solid var(--silk);color:var(--slate);background:var(--white);">Leads</span>
      <span style="font-family:var(--font-mono);font-size:.7rem;letter-spacing:.12em;text-transform:uppercase;padding:.55rem 1.1rem;border:1px solid var(--silk);color:var(--slate);background:var(--white);">Bookings</span>
      <span style="font-family:var(--font-mono);font-size:.7rem;letter-spacing:.12em;text-transform:uppercase;padding:.55rem 1.1rem;border:1px solid var(--silk);color:var(--slate);background:var(--white);">Quotes</span>
      <span style="font-family:var(--font-mono);font-size:.7rem;letter-spacing:.12em;text-transform:uppercase;padding:.55rem 1.1rem;border:1px solid var(--silk);color:var(--slate);background:var(--white);">Invoices</span>
      <span style="font-family:var(--font-mono);font-size:.7rem;letter-spacing:.12em;text-transform:uppercase;padding:.55rem 1.1rem;border:1px solid var(--silk);color:var(--slate);background:var(--white);">Insights</span>
    </div>
  </div>
</section>

```

- [ ] **Step 3: Verify the section was inserted**

```bash
grep -n "ops-command-center" index.html
grep -n "One place to manage your" index.html
grep -n "Website Content" index.html
```

Expected: each returns at least one match.

- [ ] **Step 4: Verify section order — OPS comes before Services**

```bash
grep -n 'id="ops-command-center"' index.html
grep -n 'id="services"' index.html
```

Expected: the `ops-command-center` line number is **lower** (earlier) than the `services` line number.

- [ ] **Step 5: Run syntax check**

```bash
node scripts/check-syntax.mjs
```

Expected: exit 0.

- [ ] **Step 6: Run page validation**

```bash
node scripts/validate-site.mjs
```

Expected: all pages pass (index.html, admin.html, sign.html).

- [ ] **Step 7: Commit**

```bash
git add index.html
git commit -m "feat(copy): add OPS Command Center section with capabilities grid"
```

---

### Task 5: Services Section — Rename Cards 01 and 05

**Files:**
- Modify: `index.html` (services section, approximately lines 1817–1921)

- [ ] **Step 1: Update card 01 — name and data-service attribute**

Find and replace in `index.html`:

Old:
```html
      <div class="service-card reveal" data-service="Premium Website">
```

New:
```html
      <div class="service-card reveal" data-service="Website Experience">
```

- [ ] **Step 2: Update card 01 — service name display text**

Find and replace in `index.html`:

Old:
```html
        <div class="service-name">Premium Website</div>
```

New:
```html
        <div class="service-name">Website Experience</div>
```

- [ ] **Step 3: Update card 01 — description**

Find and replace in `index.html`:

Old:
```html
        <p class="service-desc">Custom-built, mobile-responsive websites designed for distinction and engineered for performance. Built to make your business feel exactly as premium as it is.</p>
```

New:
```html
        <p class="service-desc">A precision-built website that works as a live representation of your business. Designed for distinction, engineered for performance, and connected to the systems that keep it current.</p>
```

- [ ] **Step 4: Update card 05 — name and data-service attribute**

Find and replace in `index.html`:

Old:
```html
      <div class="service-card reveal reveal-delay-2" data-service="CRM &amp; Payment Integration">
```

New:
```html
      <div class="service-card reveal reveal-delay-2" data-service="Business Systems Integration">
```

- [ ] **Step 5: Update card 05 — service name display text**

Find and replace in `index.html`:

Old:
```html
        <div class="service-name">CRM &amp; Payment Integration</div>
```

New:
```html
        <div class="service-name">Business Systems Integration</div>
```

- [ ] **Step 6: Update card 05 — description**

Find and replace in `index.html`:

Old:
```html
        <p class="service-desc">Your website connected to your business systems — HubSpot, Monday CRM, payment gateways — so your digital presence works in concert with your operations.</p>
```

New:
```html
        <p class="service-desc">Your command center connected to the tools your business already uses — payment gateways, calendars, and third-party platforms — so every system works in concert.</p>
```

- [ ] **Step 7: Verify — old strings are gone**

```bash
grep -n "Premium Website" index.html
grep -n "CRM" index.html
grep -n "Custom-built, mobile-responsive websites designed for distinction" index.html
grep -n "HubSpot, Monday CRM" index.html
```

Expected: all return **no output**.

- [ ] **Step 8: Verify — new strings are present**

```bash
grep -n "Website Experience" index.html
grep -n "Business Systems Integration" index.html
grep -n "live representation of your business" index.html
grep -n "every system works in concert" index.html
```

Expected: each returns at least one match.

- [ ] **Step 9: Run syntax check**

```bash
node scripts/check-syntax.mjs
```

Expected: exit 0.

- [ ] **Step 10: Commit**

```bash
git add index.html
git commit -m "feat(copy): rename and reframe service cards 01 and 05"
```

---

### Task 6: Pricing Section + Merge

**Files:**
- Modify: `index.html` (pricing section, approximately lines 1924–1993)

- [ ] **Step 1: Update Signature `.pricing-fit`**

Find and replace in `index.html`:

Old:
```html
        <p class="pricing-fit">Best for businesses establishing a premium digital presence.</p>
```

New:
```html
        <p class="pricing-fit"><strong>Establish your foundation.</strong> Build a professional digital presence with a website and business command center that you control yourself.</p>
```

- [ ] **Step 2: Update Growth `.pricing-fit`**

Find and replace in `index.html`:

Old:
```html
        <p class="pricing-fit">Best for growing businesses wanting a stronger customer journey.</p>
```

New:
```html
        <p class="pricing-fit"><strong>Operate from one place.</strong> Unify your website, customers, bookings and business operations into a single system.</p>
```

- [ ] **Step 3: Update Premium `.pricing-fit`**

Find and replace in `index.html`:

Old:
```html
        <p class="pricing-fit">Best for businesses seeking a highly tailored digital ecosystem.</p>
```

New:
```html
        <p class="pricing-fit"><strong>Tailored digital infrastructure.</strong> A fully customised environment designed around how your business operates.</p>
```

- [ ] **Step 4: Verify — old strings are gone**

```bash
grep -n "Best for businesses establishing" index.html
grep -n "Best for growing businesses" index.html
grep -n "Best for businesses seeking" index.html
```

Expected: all return **no output**.

- [ ] **Step 5: Verify — new strings are present**

```bash
grep -n "Establish your foundation" index.html
grep -n "Operate from one place" index.html
grep -n "Tailored digital infrastructure" index.html
```

Expected: each returns one match.

- [ ] **Step 6: Run syntax check**

```bash
node scripts/check-syntax.mjs
```

Expected: exit 0.

- [ ] **Step 7: Run page validation**

```bash
node scripts/validate-site.mjs
```

Expected: all pages pass.

- [ ] **Step 8: Commit**

```bash
git add index.html
git commit -m "feat(copy): reposition pricing cards — taglines and infrastructure descriptions"
```

- [ ] **Step 9: Merge to main and push**

```bash
git checkout main
git merge feature/website-repositioning --no-ff -m "feat: website repositioning — OPS Command Center positioning throughout"
git push origin main
```

- [ ] **Step 10: Delete feature branch**

```bash
git branch -d feature/website-repositioning
git push origin --delete feature/website-repositioning
```

Expected: branch deleted locally and remotely.
