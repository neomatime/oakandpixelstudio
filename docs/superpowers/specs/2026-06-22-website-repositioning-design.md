# Website Repositioning — Design Spec

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Reposition the Oak & Pixel Studio public website from a web-agency to a premium digital infrastructure studio powered by OPS Command Center. Copy and content changes only — no layout, CSS, animation, or structural changes.

**Scope:** `index.html` only. `brochure.html` is out of scope.

**Constraint:** Prices, slot counts, and feature bullet lists in the pricing section are unchanged.

---

## Global Vocabulary Rules

Avoid:
- "web design agency", "website agency", "website development", "CRM", "digital solutions", "software company"

Use:
- "digital infrastructure", "Business Command Center", "Website Experience", "Customer Management", "Business Insights", "Growth Infrastructure"

Brand voice: Premium, minimal, confident, strategic, human. Never salesy or corporate.

---

## Section 1 — Meta & SEO

**`<title>`**
```
Oak & Pixel — Digital Infrastructure, Built to Grow With Your Business
```

**`<meta name="description">`**
```
Oak & Pixel Studio builds the digital infrastructure service-based businesses run on. From your website to bookings, customers and content — managed from one command center.
```

**OG / Twitter tags** — update `og:title`, `og:description`, `twitter:title`, `twitter:description` to match the meta description content above. Leave all URLs and image paths unchanged.

---

## Section 2 — Navigation

Nav links (Studio, Services, Pricing, Work, Standards, Brochure) — **no change**.

**Nav CTA** (`<a href="#contact" class="nav-cta">`):
```
Explore Plans
```

**Mobile drawer CTA** (`<a href="#contact" class="mob-drawer-cta">`):
```
Explore Plans
```

---

## Section 3 — Hero Section

**Eyebrow** (`.hero-eyebrow`):
```
Powered by OPS Command Center
```

**Headline** (`.hero-headline`):
```
Digital infrastructure
built to grow with
your business.
```
Keep the `<em>` tag on the last line or word for the italic green styling. Apply `<em>` to "your business." to preserve the existing italic-green pattern.

**Subheadline** (`.hero-sub`):
```
Oak & Pixel Studio builds, manages and continuously evolves the systems behind your business. From your website to bookings, customers and content, everything is managed from a single command center.
```

**Primary CTA** (`.btn-primary`):
```
Explore Plans
```
Keep existing arrow SVG and `href="#contact"`.

**Secondary CTA** (`.btn-ghost`):
```
See OPS Command Center
```
Change `onclick="openBookingModal();return false;"` to `href="#ops-command-center"` (anchor to new section). Remove the `onclick` handler entirely.

---

## Section 4 — About (Philosophy)

Two targeted edits only; all other body copy and the panel quote are unchanged.

In the second `.about-body` paragraph, the last sentence currently reads:
```
We don't produce websites. We construct digital presence.
```
Replace that sentence (in place, within the same paragraph element) with:
```
We don't build websites. We build the infrastructure your business runs on.
```

---

## Section 5 — NEW: OPS Command Center Section

Insert this new section **between** the `#founder` section and the `#services` section. Add `id="ops-command-center"` so the hero secondary CTA can anchor to it.

The section uses the existing visual language: white background, `.container`, `.label`, `.reveal`, and existing typography classes. No new CSS classes are required — the capability chips use inline styles consistent with existing patterns, or a simple `display:flex; flex-wrap:wrap; gap:.75rem` approach already used elsewhere.

**Full HTML to insert:**

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

---

## Section 6 — Services Section

Headline, sub-label, and section structure are unchanged. Only card names and descriptions change.

### Card 01 — Website Experience
**Name:** `Website Experience`  
**Description:**
```
A precision-built website that works as a live representation of your business. Designed for distinction, engineered for performance, and connected to the systems that keep it current.
```

### Card 02 — Online Booking Experience
Name and description — **unchanged**.

### Card 03 — Lead Capture Experience
Name and description — **unchanged**.

### Card 04 — Client Onboarding Experience
Name and description — **unchanged**.

### Card 05 — Business Systems Integration
**Name:** `Business Systems Integration`  
**Description:**
```
Your command center connected to the tools your business already uses — payment gateways, calendars, and third-party platforms — so every system works in concert.
```

### Card 06 — Digital Presence Management
Name and description — **unchanged**.

---

## Section 7 — Pricing Section

Prices, slot counts, feature bullet lists, and CTA buttons — **all unchanged**.

### Signature
**Replace** the existing `.pricing-fit` paragraph text:
```
Establish your foundation.
```
Add a second line (new `<p>` or `<span>` in the same element):
```
Build a professional digital presence with a website and business command center that you control yourself.
```

### Growth
**Replace** the existing `.pricing-fit` paragraph text:
```
Operate from one place.
```
Second line:
```
Unify your website, customers, bookings and business operations into a single system.
```

### Premium
**Replace** the existing `.pricing-fit` paragraph text:
```
Tailored digital infrastructure.
```
Second line:
```
A fully customised environment designed around how your business operates.
```

**Implementation note:** The `.pricing-fit` element currently holds one sentence. Replace the full inner text with the tagline + description. The tagline should be in a `<strong>` or rendered as a first sentence followed by the description sentence. Keep within the existing `<p class="pricing-fit">` element — do not add new elements or change the class.

Concrete replacement pattern for each card:
```html
<p class="pricing-fit"><strong>Establish your foundation.</strong> Build a professional digital presence with a website and business command center that you control yourself.</p>
```

---

## Sections Unchanged

The following sections require no edits:
- `#pixel-dimension` — purely aesthetic, no product language
- `#founder` — personal, already aligned with infrastructure positioning
- `#work` — portfolio section, no positioning language
- `#standards` — "why us" cards reinforce infrastructure narrative without conflicting
- `#scroll-zoom` — timeless brand language, no website-agency references
- `#contact` — form and contact details, no repositioning needed
- `footer` — logo and links only
