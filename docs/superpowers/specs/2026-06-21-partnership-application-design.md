# Partnership Application Design

**Date:** 2026-06-21
**Status:** Approved
**File:** `index.html` (single-page website — one file, no build step)

---

## Goal

Replace the existing contact form in `index.html` with a premium multi-step Partnership Application experience. The one-page architecture, all existing `href="#contact"` anchors, and the overall site branding remain unchanged. The result should feel like applying to partner with a premium digital studio, not filling out a contact form.

---

## Context

The current `#contact` section is a two-column layout:
- Left: headline copy, body text, contact details, "Book a Discovery Call" button
- Right: a single-page contact form (Full Name, Company, Email, Phone, Website, Service dropdown, Budget dropdown, Project Description textarea)

The form currently submits to HubSpot via their submissions API, with a fire-and-forget mirror to the Supabase `contacts` table using the anon key directly from the browser.

---

## Scope

**In scope:**
- Replace the right column form with a 6-step wizard
- Update the left column headline and subheading copy
- New `applications` Supabase table with RLS
- Submit handler: Supabase write (primary) + HubSpot notification (secondary)
- Success state replacing the wizard on submission
- Step validation before advancing
- Service selection toggle cards (multi-select, premium styled)
- Investment range selection cards (single-select)
- CSS additions for wizard chrome, toggle cards, step indicator

**Out of scope:**
- New page or route
- Any change to nav, hero, services, pricing, work, footer, or any other section
- OPS Command Center integration (future — `status` column is the hook)
- Backend API endpoint (Supabase anon key direct call, same pattern as existing contacts mirror)
- Email notifications (HubSpot handles this)

---

## Layout

The `#contact` section retains its two-column structure.

### Left Column (updated copy)

```
Label:    Begin Here
Headline: Let's Explore A Partnership
Body:     We intentionally partner with a limited number of businesses to
          design and operate digital infrastructure that creates long-term
          value. Complete the application below and we'll determine if
          we're a good fit for one another.
Contact:  info@oakandpixel.co.za  /  +27 (75) 089 0614  /  Randburg · Gauteng · South Africa
Button:   Book a Discovery Call (keep — shortcut for those who prefer a call first)
```

### Right Column — Multi-Step Wizard

**Step indicator** sits at the top of the right column:
```
STEP 2 OF 6
[████████░░░░░░░░░░░░░░░░] (thin progress bar)
```

**Navigation:**
- Step 1: "Next →" only
- Steps 2–5: "← Back" and "Next →"
- Step 6: "← Back" and "Apply For Partnership"

Transition between steps: current step fades out, next step fades in (CSS opacity + translateY, matching existing `.reveal` animation style).

**Success state:** on successful submission, the entire wizard (step indicator + form content + nav buttons) is replaced by the success message. No page reload.

---

## Steps

### Step 1 — Business Information

| Field | Type | Required | Notes |
|---|---|---|---|
| Company Name | text input | yes | |
| Industry | text input | yes | |
| Company Website | url input | no | Label: "Company Website (optional)" |
| Number of Employees | select | yes | Options: 1–5 · 6–20 · 21–50 · 51–200 · 200+ |

### Step 2 — Primary Contact

| Field | Type | Required | Notes |
|---|---|---|---|
| Full Name | text input | yes | |
| Job Title | text input | yes | |
| Email Address | email input | yes | Validated with regex |
| Phone Number | tel input | yes | +27- prefix format, existing phone formatter reused |

### Step 3 — Services of Interest

Multi-select toggle cards. At least one card must be selected to advance.

Two labelled groups:

**Strategic Partnership Plans**
- Signature Plan
- Growth Plan
- Premium Plan

**Standalone Services**
- Premium Website
- Online Booking Experience
- Lead Capture Experience
- Client Onboarding Experience
- Client Operating System
- Digital Presence Management

Card design: `border:1px solid var(--border)`, dark background. On selected: `border-color:var(--emerald)`, subtle emerald background tint, checkmark indicator. Follows existing service card aesthetic.

### Step 4 — Business Challenges

| Field | Type | Required | Notes |
|---|---|---|---|
| Business challenges | textarea | yes | Placeholder: "What operational, digital, or growth challenges are you currently experiencing?" Min 20 chars. No maxlength enforced — this is their voice. |

### Step 5 — Desired Start Date

Single select dropdown.

Options:
- Immediately
- Within 30 Days
- Within 60 Days
- Within 90 Days
- Exploring Options

Required before advancing.

### Step 6 — Investment Readiness

Single-select radio cards (one must be chosen before submitting).

Options:
- R10,000 – R25,000
- R25,000 – R50,000
- R50,000 – R100,000
- R100,000+

Card design: same style as service toggle cards, but single-select (selecting one deselects others).

---

## Validation

| Step | Validated Fields | Block advance if |
|---|---|---|
| 1 | Company Name, Industry, Employee Count | any required field empty |
| 2 | Full Name, Job Title, Email (regex), Phone | any required field invalid |
| 3 | Services of interest | no card selected |
| 4 | Business challenges | field empty or < 20 chars |
| 5 | Start date | no option selected |
| 6 | Investment range | no card selected |

On error: field/card highlighted in existing `invalid` style (`border-color:var(--rose)`). Error message appears below field using existing `.form-error` class.

---

## Success State

On successful Supabase write:

```
[Oak & Pixel mark or section divider]

Thank you for applying to work with Oak & Pixel Studio. Every application
is carefully reviewed to ensure mutual alignment before we begin a
partnership journey. We will contact you regarding the next steps.
```

Displayed with calm, centred typography matching the existing site tone. No redirect. No confetti.

---

## Data Model

### New Supabase table: `applications`

```sql
CREATE TABLE IF NOT EXISTS applications (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name        text NOT NULL,
  industry            text NOT NULL,
  website             text,
  employee_count      text NOT NULL,
  full_name           text NOT NULL,
  job_title           text NOT NULL,
  email               text NOT NULL,
  phone               text NOT NULL,
  services_of_interest text,           -- comma-separated selected services
  business_challenges text,
  start_date          text,
  investment_range    text,
  status              text NOT NULL DEFAULT 'new',  -- OPS lifecycle hook
  created_at          timestamptz DEFAULT now()
);

ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_insert" ON applications
  FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "auth_all" ON applications
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);
```

**RLS note:** `INSERT` is allowed for the anon role (the website visitor is unauthenticated). `SELECT/UPDATE/DELETE` is restricted to authenticated (OPS Command Center). This matches the existing `contacts` table pattern used by the current form.

### OPS Integration Hook

The `status` column defaults to `'new'`. Future work: the Command Center reads `applications WHERE status = 'new'` and surfaces them in the lifecycle pipeline as Lead-stage entries. No code for this is built now — only the column is reserved.

---

## Submission Flow

1. User clicks "Apply For Partnership" on step 6
2. Button disabled, text → "Submitting…"
3. Build payload object from all 6 steps' collected values
4. `await fetch` → Supabase REST API `POST /rest/v1/applications` (anon key, same pattern as existing contacts mirror)
5. If success:
   - Fire-and-forget: HubSpot submission with `full_name`, `email`, `company_name`, `phone` only (existing HubSpot endpoint, same form ID)
   - Replace wizard with success state
6. If error:
   - Re-enable button, text → "Apply For Partnership"
   - Show inline error: "Something went wrong. Please email us directly at info@oakandpixel.co.za"

---

## CSS Additions

New classes to add to the existing `<style>` block in `index.html`:

- `.app-step` — wrapper for each step's content (position:absolute within a relative container for fade transitions)
- `.app-step.active` — visible state
- `.app-step-indicator` — "STEP N OF 6" label
- `.app-progress-bar` — thin bar container
- `.app-progress-fill` — filled portion (width set via JS as inline style)
- `.app-nav` — flex row containing Back + Next buttons
- `.app-toggle-group` — label above a group of toggle cards
- `.app-toggle-card` — individual service card (multi-select)
- `.app-toggle-card.selected` — selected state (emerald border + tint)
- `.app-radio-card` — investment range card (single-select)
- `.app-radio-card.selected` — selected state
- `.app-success` — success state wrapper

All new classes prefixed `app-` to avoid collision with existing styles.

---

## Conventions

- Supabase anon key: already present in `index.html` as `ANON` constant — reuse it
- HubSpot form ID: `985b8dbe-7881-4dc5-93fc-3ae30065bfef` — reuse existing endpoint
- HubSpot portal ID: `148222168` — reuse existing
- Phone formatter: existing `applyFormat()` / `PREFIX` pattern — reuse for Step 2 phone field (attach to new phone input element ID)
- CSS variables: `--emerald:#1A5C3A`, `--border`, `--rose`, `--white`, `--mist`, `--font-mono` — use existing tokens throughout
- No new JS files, no new dependencies, no build tooling
