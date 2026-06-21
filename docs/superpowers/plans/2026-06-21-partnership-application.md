# Partnership Application Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the existing contact form in `index.html` with a 6-step wizard-style Partnership Application experience that stores submissions in a new Supabase `applications` table.

**Architecture:** Single-file HTML/CSS/JS edit — no build step, no new files except the migration SQL. Three tasks in dependency order: DB first, then static HTML/CSS, then JavaScript behaviour + submission. The old contact form IIFE is replaced wholesale in Task 3.

**Tech Stack:** Vanilla JS, Supabase REST API (anon key, direct fetch), HubSpot Forms API v3, CSS custom properties.

## Global Constraints

- File: `index.html` at repo root — single file, all CSS/JS inline. No build tooling.
- Supabase project: `wdbsmcxzhmdkfjoftulm` (EU-West-1)
- Supabase anon key (already present in the file): `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndkYnNtY3h6aG1ka2Zqb2Z0dWxtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4MDEwMTQsImV4cCI6MjA5NzM3NzAxNH0.xo9x29q_QVmDl81soUI3OMDzJBKmqEme-I6v5IZmeN0`
- HubSpot portal: `148222168`, form ID: `985b8dbe-7881-4dc5-93fc-3ae30065bfef`
- All new CSS classes prefixed `app-` — no collision with existing styles
- Do NOT redesign any section outside `#contact` — nav, hero, services, pricing, work, footer untouched
- Do NOT change the section `id="contact"` or any `href="#contact"` anchor links
- `--rose` and `--border` CSS variables do NOT exist — use `rgba(255,255,255,.12)` for borders and `#c0614a` for errors
- RLS: `INSERT` allowed for `anon` role (unauthenticated website visitor); `auth_all` for `authenticated` role
- Migration filename: `migrations/013_applications.sql`
- Success message verbatim: "Thank you for applying to work with Oak & Pixel Studio. Every application is carefully reviewed to ensure mutual alignment before we begin a partnership journey. We will contact you regarding the next steps."
- Submit button text verbatim: "Apply For Partnership"

---

### Task 1: Supabase migration — `applications` table

**Files:**
- Create: `migrations/013_applications.sql`

**Interfaces:**
- Produces: Supabase table `applications` with columns: `id`, `company_name`, `industry`, `website`, `employee_count`, `full_name`, `job_title`, `email`, `phone`, `services_of_interest`, `business_challenges`, `start_date`, `investment_range`, `status` (default `'new'`), `created_at`. RLS enabled with `anon_insert` and `auth_all` policies.

- [ ] **Step 1: Apply the migration via Supabase MCP**

Use the Supabase MCP tool `execute_sql` with `project_id: "wdbsmcxzhmdkfjoftulm"` and this SQL:

```sql
CREATE TABLE IF NOT EXISTS applications (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name         text NOT NULL,
  industry             text NOT NULL,
  website              text,
  employee_count       text NOT NULL,
  full_name            text NOT NULL,
  job_title            text NOT NULL,
  email                text NOT NULL,
  phone                text NOT NULL,
  services_of_interest text,
  business_challenges  text,
  start_date           text,
  investment_range     text,
  status               text NOT NULL DEFAULT 'new',
  created_at           timestamptz DEFAULT now()
);

ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_insert" ON applications
  FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "auth_all" ON applications
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);
```

- [ ] **Step 2: Verify the table exists**

Use Supabase MCP `execute_sql` with:
```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'applications'
ORDER BY ordinal_position;
```

Expected: 15 rows, one per column. If `applications` doesn't exist, re-run Step 1.

- [ ] **Step 3: Create the migration file**

Create `migrations/013_applications.sql` with this content:

```sql
-- Partnership application submissions
-- Stores structured data from the public website's 6-step application form.
-- status = 'new' is the OPS lifecycle hook: future integration reads applications
-- WHERE status = 'new' to surface them as Lead-stage entries in the pipeline.

CREATE TABLE IF NOT EXISTS applications (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name         text NOT NULL,
  industry             text NOT NULL,
  website              text,
  employee_count       text NOT NULL,
  full_name            text NOT NULL,
  job_title            text NOT NULL,
  email                text NOT NULL,
  phone                text NOT NULL,
  services_of_interest text,
  business_challenges  text,
  start_date           text,
  investment_range     text,
  status               text NOT NULL DEFAULT 'new',
  created_at           timestamptz DEFAULT now()
);

ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_insert" ON applications
  FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "auth_all" ON applications
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);
```

- [ ] **Step 4: Commit**

```bash
git add migrations/013_applications.sql
git commit -m "feat(db): add applications table for partnership form submissions"
```

---

### Task 2: CSS + HTML — static wizard structure

**Files:**
- Modify: `index.html` (3 edits: CSS block, left column copy, right column HTML)

**Interfaces:**
- Consumes: nothing from Task 1 (CSS/HTML is static)
- Produces: `id="app-wizard"`, `id="app-success"`, `id="app-step-1"` through `id="app-step-6"`, `id="app-btn-next"`, `id="app-btn-back"`, `id="app-progress-fill"`, `id="app-step-label"` — all required by Task 3 JS

**Manual test:** Open `index.html` in a browser (or the live site after push). Scroll to `#contact`. The right column should show "STEP 1 OF 6", a thin progress bar, the Business Information fields (Company Name, Industry, Company Website, Number of Employees), and a "Next →" button. The "← Back" button should be invisible. No behaviour yet — buttons do nothing.

- [ ] **Step 1: Add `app-*` CSS before the footer CSS block**

In `index.html`, find the exact string:
```
/* ─── FOOTER ─────────────────────────────────────────── */
```

Insert the following block immediately before it:

```css
/* ─── PARTNERSHIP APPLICATION ────────────────────────────── */
.app-step-indicator{
  font-family:var(--font-mono);font-size:.6rem;letter-spacing:.15em;
  text-transform:uppercase;color:rgba(255,255,255,.35);margin-bottom:.75rem;
}
.app-progress-bar{
  height:2px;background:rgba(255,255,255,.08);border-radius:1px;
  margin-bottom:2rem;overflow:hidden;
}
.app-progress-fill{height:100%;background:var(--emerald-l);transition:width .4s cubic-bezier(.16,1,.3,1)}
.app-step{display:none}
.app-step.active{display:block}
.app-nav{
  display:flex;justify-content:space-between;align-items:center;
  margin-top:1.75rem;gap:1rem;
}
.app-btn-back{
  font-family:var(--font-mono);font-size:.68rem;letter-spacing:.12em;text-transform:uppercase;
  color:rgba(255,255,255,.3);background:none;border:none;cursor:pointer;
  transition:color .2s;padding:0;flex-shrink:0;
}
.app-btn-back:hover{color:rgba(255,255,255,.7)}
.app-btn-next{
  flex:1;
  background:var(--white);color:var(--black);
  padding:.9rem 1.5rem;border-radius:2px;
  font-size:.78rem;letter-spacing:.12em;text-transform:uppercase;font-weight:400;
  transition:background .25s,color .25s;cursor:pointer;border:none;
}
.app-btn-next:hover{background:var(--emerald);color:var(--white)}
.app-btn-next:disabled{opacity:.5;cursor:not-allowed}
.app-toggle-group-label{
  font-family:var(--font-mono);font-size:.58rem;letter-spacing:.15em;text-transform:uppercase;
  color:rgba(255,255,255,.25);margin:1.25rem 0 .6rem;
}
.app-toggle-cards{display:flex;flex-wrap:wrap;gap:.5rem;margin-bottom:.25rem}
.app-toggle-card{
  padding:.5rem 1rem;border:1px solid rgba(255,255,255,.12);border-radius:2px;
  font-family:var(--font-mono);font-size:.68rem;letter-spacing:.1em;
  color:rgba(255,255,255,.5);background:rgba(255,255,255,.03);
  cursor:pointer;transition:border-color .2s,background .2s,color .2s;
  user-select:none;
}
.app-toggle-card:hover{border-color:rgba(255,255,255,.3);color:rgba(255,255,255,.8)}
.app-toggle-card.selected{
  border-color:var(--emerald-l);background:rgba(45,122,82,.12);color:var(--white);
}
.app-radio-cards{display:flex;flex-direction:column;gap:.5rem}
.app-radio-card{
  padding:.85rem 1rem;border:1px solid rgba(255,255,255,.12);border-radius:2px;
  font-family:var(--font-mono);font-size:.72rem;letter-spacing:.1em;
  color:rgba(255,255,255,.5);background:rgba(255,255,255,.03);
  cursor:pointer;transition:border-color .2s,background .2s,color .2s;
  user-select:none;
}
.app-radio-card:hover{border-color:rgba(255,255,255,.3);color:rgba(255,255,255,.8)}
.app-radio-card.selected{
  border-color:var(--emerald-l);background:rgba(45,122,82,.12);color:var(--white);
}
.app-error{
  display:block;font-family:var(--font-mono);font-size:.6rem;
  letter-spacing:.08em;color:#c0614a;margin-top:.5rem;min-height:.9em;
}
.app-success{
  display:none;padding:3rem 0;text-align:center;
}
.app-success-rule{
  width:40px;height:1px;background:var(--emerald-l);margin:0 auto 2rem;
}
.app-success-title{
  font-family:var(--font-display);font-size:1.5rem;font-weight:300;
  color:var(--white);margin-bottom:1.25rem;letter-spacing:-.01em;
}
.app-success-body{
  font-family:var(--font-mono);font-size:.7rem;letter-spacing:.08em;
  color:rgba(255,255,255,.4);line-height:1.9;max-width:340px;margin:0 auto;
}

```

- [ ] **Step 2: Update left column headline and body copy**

In `index.html`, find:
```
        <h2 class="contact-headline">
          Let's build<br>
          something<br>
          <em>remarkable.</em>
        </h2>
        <p class="contact-body">
          We take on a select number of engagements each year. If you're working on something that demands the highest standard, we'd like to hear about it.
        </p>
```

Replace with:
```
        <h2 class="contact-headline">
          Let's Explore<br>
          A Partnership
        </h2>
        <p class="contact-body">
          We intentionally partner with a limited number of businesses to design and operate digital infrastructure that creates long-term value. Complete the application below and we'll determine if we're a good fit for one another.
        </p>
```

- [ ] **Step 3: Replace the right column with the wizard HTML**

In `index.html`, find the exact opening tag (it's unique in the file):
```
      <div class="contact-right reveal reveal-delay-2">
        <div class="form-group">
          <label class="form-label">Full Name</label>
```

…all the way through to the closing `</div>` of that `.contact-right` wrapper. The exact old_string to match is from `      <div class="contact-right reveal reveal-delay-2">` through to and including:
```
        <p class="form-note">All enquiries are reviewed within 48 hours. Confidentiality assured.</p>
      </div>
```

Replace the entire `.contact-right` div with:

```html
      <div class="contact-right reveal reveal-delay-2">

        <!-- Success state — hidden until submission succeeds -->
        <div class="app-success" id="app-success">
          <div class="app-success-rule"></div>
          <p class="app-success-title">Application Received</p>
          <p class="app-success-body">Thank you for applying to work with Oak &amp; Pixel Studio. Every application is carefully reviewed to ensure mutual alignment before we begin a partnership journey. We will contact you regarding the next steps.</p>
        </div>

        <!-- Wizard -->
        <div id="app-wizard">
          <div class="app-step-indicator" id="app-step-label">STEP 1 OF 6</div>
          <div class="app-progress-bar">
            <div class="app-progress-fill" id="app-progress-fill" style="width:16.67%"></div>
          </div>

          <!-- Step 1: Business Information -->
          <div class="app-step active" id="app-step-1">
            <div class="form-group">
              <label class="form-label">Company Name</label>
              <input type="text" class="form-input" id="app-company-name" placeholder="Your company name" autocomplete="organization">
              <span class="app-error" id="app-err-company-name"></span>
            </div>
            <div class="form-group">
              <label class="form-label">Industry</label>
              <input type="text" class="form-input" id="app-industry" placeholder="e.g. Legal, Real Estate, Healthcare">
              <span class="app-error" id="app-err-industry"></span>
            </div>
            <div class="form-group">
              <label class="form-label">Company Website <span style="opacity:.4;font-size:.75em;">(optional)</span></label>
              <input type="url" class="form-input" id="app-website" placeholder="https://yourcompany.co.za" autocomplete="url">
            </div>
            <div class="form-group">
              <label class="form-label">Number of Employees</label>
              <select class="form-select" id="app-employees">
                <option value="" disabled selected>Select a range</option>
                <option>1 – 5</option>
                <option>6 – 20</option>
                <option>21 – 50</option>
                <option>51 – 200</option>
                <option>200+</option>
              </select>
              <span class="app-error" id="app-err-employees"></span>
            </div>
          </div>

          <!-- Step 2: Primary Contact -->
          <div class="app-step" id="app-step-2">
            <div class="form-group">
              <label class="form-label">Full Name</label>
              <input type="text" class="form-input" id="app-full-name" placeholder="Your full name" autocomplete="name">
              <span class="app-error" id="app-err-full-name"></span>
            </div>
            <div class="form-group">
              <label class="form-label">Job Title</label>
              <input type="text" class="form-input" id="app-job-title" placeholder="e.g. Founder, Director, CEO">
              <span class="app-error" id="app-err-job-title"></span>
            </div>
            <div class="form-group">
              <label class="form-label">Email Address</label>
              <input type="email" class="form-input" id="app-email" placeholder="your@email.com" autocomplete="email">
              <span class="app-error" id="app-err-email"></span>
            </div>
            <div class="form-group">
              <label class="form-label">Phone Number</label>
              <input type="tel" class="form-input" id="app-phone" value="+27-" autocomplete="tel">
              <span class="app-error" id="app-err-phone"></span>
            </div>
          </div>

          <!-- Step 3: Services of Interest -->
          <div class="app-step" id="app-step-3">
            <p class="app-toggle-group-label">Strategic Partnership Plans</p>
            <div class="app-toggle-cards">
              <div class="app-toggle-card" data-value="Signature Plan">Signature Plan</div>
              <div class="app-toggle-card" data-value="Growth Plan">Growth Plan</div>
              <div class="app-toggle-card" data-value="Premium Plan">Premium Plan</div>
            </div>
            <p class="app-toggle-group-label">Standalone Services</p>
            <div class="app-toggle-cards">
              <div class="app-toggle-card" data-value="Premium Website">Premium Website</div>
              <div class="app-toggle-card" data-value="Online Booking Experience">Online Booking Experience</div>
              <div class="app-toggle-card" data-value="Lead Capture Experience">Lead Capture Experience</div>
              <div class="app-toggle-card" data-value="Client Onboarding Experience">Client Onboarding Experience</div>
              <div class="app-toggle-card" data-value="Client Operating System">Client Operating System</div>
              <div class="app-toggle-card" data-value="Digital Presence Management">Digital Presence Management</div>
            </div>
            <span class="app-error" id="app-err-services"></span>
          </div>

          <!-- Step 4: Business Challenges -->
          <div class="app-step" id="app-step-4">
            <div class="form-group">
              <label class="form-label">Business Challenges</label>
              <textarea class="form-textarea" id="app-challenges" placeholder="What operational, digital, or growth challenges are you currently experiencing?" style="height:160px;resize:none"></textarea>
              <span class="app-error" id="app-err-challenges"></span>
            </div>
          </div>

          <!-- Step 5: Desired Start Date -->
          <div class="app-step" id="app-step-5">
            <div class="form-group">
              <label class="form-label">When are you looking to start?</label>
              <select class="form-select" id="app-start-date">
                <option value="" disabled selected>Select a timeframe</option>
                <option>Immediately</option>
                <option>Within 30 Days</option>
                <option>Within 60 Days</option>
                <option>Within 90 Days</option>
                <option>Exploring Options</option>
              </select>
              <span class="app-error" id="app-err-start-date"></span>
            </div>
          </div>

          <!-- Step 6: Investment Readiness -->
          <div class="app-step" id="app-step-6">
            <div class="form-group">
              <label class="form-label">Which investment range best aligns with your expectations?</label>
              <div class="app-radio-cards" id="app-investment">
                <div class="app-radio-card" data-value="R10,000 – R25,000">R10,000 – R25,000</div>
                <div class="app-radio-card" data-value="R25,000 – R50,000">R25,000 – R50,000</div>
                <div class="app-radio-card" data-value="R50,000 – R100,000">R50,000 – R100,000</div>
                <div class="app-radio-card" data-value="R100,000+">R100,000+</div>
              </div>
              <span class="app-error" id="app-err-investment"></span>
            </div>
          </div>

          <div class="app-nav">
            <button class="app-btn-back" id="app-btn-back" style="visibility:hidden">← Back</button>
            <button class="app-btn-next" id="app-btn-next">Next →</button>
          </div>
        </div><!-- /#app-wizard -->

      </div><!-- /.contact-right -->
```

- [ ] **Step 4: Verify static structure**

Open `index.html` in a browser (or the live Vercel preview if already deployed). Scroll to `#contact`.

Expected:
- Left column: headline reads "Let's Explore A Partnership"
- Right column: "STEP 1 OF 6" label visible, thin progress bar ~1/6 filled, Company Name + Industry + Company Website (optional) + Number of Employees dropdown, "Next →" button, no "← Back"
- No console errors
- Buttons do nothing yet (no JS)

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "feat(web): partnership application — CSS + static wizard HTML"
```

---

### Task 3: Wizard JS — navigation, validation, cards, phone formatter, submission

**Files:**
- Modify: `index.html` (1 edit: replace old contact form IIFE with wizard IIFE)

**Interfaces:**
- Consumes from Task 2: element IDs `app-wizard`, `app-success`, `app-step-1`…`app-step-6`, `app-step-label`, `app-progress-fill`, `app-btn-back`, `app-btn-next`, `app-company-name`, `app-industry`, `app-website`, `app-employees`, `app-full-name`, `app-job-title`, `app-email`, `app-phone`, `app-challenges`, `app-start-date`, `app-investment`, `.app-toggle-card`, `.app-radio-card`, error span IDs `app-err-*`
- Consumes from Task 1: Supabase table `applications` — POST endpoint `/rest/v1/applications`

**Manual test after this task:**
1. Open the page, scroll to `#contact`
2. Step 1: Leave Company Name blank, click Next → error appears, cannot advance
3. Step 1: Fill all fields, click Next → advances to Step 2, progress bar grows, "← Back" appears
4. Step 2: Fill all fields with valid data (email with @, phone +27-xx-xxx-xxxx), click Next → advances
5. Step 3: Click several service cards — they highlight. Click Next without selecting → error. Select one, click Next → advances
6. Step 4: Type < 20 chars, click Next → error. Type 20+ chars, click Next → advances
7. Step 5: Leave dropdown empty, click Next → error. Select option, click Next → advances
8. Step 6: Click an investment card — it highlights (others deselect). Button reads "Apply For Partnership"
9. Click "Apply For Partnership" — button disables, shows "Submitting…", then success state appears (wizard hidden, success message shown)
10. Check Supabase `applications` table — new row present with all fields populated

- [ ] **Step 1: Replace the old contact form IIFE with the wizard IIFE**

In `index.html`, find the exact string (it is unique in the file):
```
// ── HUBSPOT CONTACT FORM ─────────────────────────────────
(function () {
  const btn    = document.getElementById('contact-submit-btn');
```

Locate the **end** of this IIFE — it's the `})();` immediately followed by a blank line and then `// ── NAV SCROLL STATE`. Replace everything from the opening comment through that closing `})();`.

The new_string to replace it with is the complete wizard IIFE below:

```javascript
// ── PARTNERSHIP APPLICATION ─────────────────────────────────
(function () {
  const TOTAL   = 6;
  let   current = 1;

  const stepLabel    = document.getElementById('app-step-label');
  const progressFill = document.getElementById('app-progress-fill');
  const btnBack      = document.getElementById('app-btn-back');
  const btnNext      = document.getElementById('app-btn-next');

  if (!btnNext) return; // guard if HTML not present

  // ── Step display ──────────────────────────────────────────
  function showStep(n) {
    document.querySelectorAll('.app-step').forEach(function (s) { s.classList.remove('active'); });
    document.getElementById('app-step-' + n).classList.add('active');
    stepLabel.textContent           = 'STEP ' + n + ' OF ' + TOTAL;
    progressFill.style.width        = ((n / TOTAL) * 100).toFixed(2) + '%';
    btnBack.style.visibility        = n === 1 ? 'hidden' : 'visible';
    btnNext.textContent             = n === TOTAL ? 'Apply For Partnership' : 'Next →';
    current = n;
  }

  // ── Error helpers ─────────────────────────────────────────
  function clearErr(id) { var el = document.getElementById(id); if (el) el.textContent = ''; }
  function showErr(id, msg) { var el = document.getElementById(id); if (el) el.textContent = msg; }
  function markInvalid(id) { var el = document.getElementById(id); if (el) el.classList.add('invalid'); }
  function markValid(id)   { var el = document.getElementById(id); if (el) el.classList.remove('invalid'); }

  // ── Per-step validation ───────────────────────────────────
  function validate(n) {
    if (n === 1) {
      var ok = true;
      var company   = document.getElementById('app-company-name').value.trim();
      var industry  = document.getElementById('app-industry').value.trim();
      var employees = document.getElementById('app-employees').value;
      ['app-err-company-name','app-err-industry','app-err-employees'].forEach(clearErr);
      ['app-company-name','app-industry','app-employees'].forEach(markValid);
      if (!company)   { showErr('app-err-company-name','Company name is required.'); markInvalid('app-company-name'); ok = false; }
      if (!industry)  { showErr('app-err-industry','Industry is required.'); markInvalid('app-industry'); ok = false; }
      if (!employees) { showErr('app-err-employees','Please select a range.'); markInvalid('app-employees'); ok = false; }
      return ok;
    }
    if (n === 2) {
      var ok    = true;
      var name  = document.getElementById('app-full-name').value.trim();
      var title = document.getElementById('app-job-title').value.trim();
      var email = document.getElementById('app-email').value.trim();
      var phone = document.getElementById('app-phone').value;
      ['app-err-full-name','app-err-job-title','app-err-email','app-err-phone'].forEach(clearErr);
      ['app-full-name','app-job-title','app-email','app-phone'].forEach(markValid);
      if (!name)  { showErr('app-err-full-name','Full name is required.'); markInvalid('app-full-name'); ok = false; }
      if (!title) { showErr('app-err-job-title','Job title is required.'); markInvalid('app-job-title'); ok = false; }
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
        showErr('app-err-email','A valid email address is required.'); markInvalid('app-email'); ok = false;
      }
      if (phone.replace(/\D/g,'').length !== 11) {
        showErr('app-err-phone','Please enter 9 digits after +27.'); markInvalid('app-phone'); ok = false;
      }
      return ok;
    }
    if (n === 3) {
      clearErr('app-err-services');
      if (!document.querySelector('#app-step-3 .app-toggle-card.selected')) {
        showErr('app-err-services','Please select at least one service or plan.'); return false;
      }
      return true;
    }
    if (n === 4) {
      var val = document.getElementById('app-challenges').value.trim();
      clearErr('app-err-challenges'); markValid('app-challenges');
      if (!val || val.length < 20) {
        showErr('app-err-challenges','Please describe your challenges (at least 20 characters).'); markInvalid('app-challenges'); return false;
      }
      return true;
    }
    if (n === 5) {
      clearErr('app-err-start-date'); markValid('app-start-date');
      if (!document.getElementById('app-start-date').value) {
        showErr('app-err-start-date','Please select a timeframe.'); markInvalid('app-start-date'); return false;
      }
      return true;
    }
    if (n === 6) {
      clearErr('app-err-investment');
      if (!document.querySelector('#app-investment .app-radio-card.selected')) {
        showErr('app-err-investment','Please select an investment range.'); return false;
      }
      return true;
    }
    return true;
  }

  // ── Navigation ────────────────────────────────────────────
  btnNext.addEventListener('click', function () {
    if (!validate(current)) return;
    if (current < TOTAL) { showStep(current + 1); return; }
    submitApplication();
  });

  btnBack.addEventListener('click', function () {
    if (current > 1) showStep(current - 1);
  });

  // ── Toggle cards (multi-select, Step 3) ───────────────────
  document.querySelectorAll('#app-step-3 .app-toggle-card').forEach(function (card) {
    card.addEventListener('click', function () {
      this.classList.toggle('selected');
      clearErr('app-err-services');
    });
  });

  // ── Radio cards (single-select, Step 6) ───────────────────
  document.querySelectorAll('#app-investment .app-radio-card').forEach(function (card) {
    card.addEventListener('click', function () {
      document.querySelectorAll('#app-investment .app-radio-card').forEach(function (c) { c.classList.remove('selected'); });
      this.classList.add('selected');
      clearErr('app-err-investment');
    });
  });

  // ── Phone formatter (Step 2) — same pattern as original form ─
  (function () {
    var PREFIX  = '+27-';
    var phoneEl = document.getElementById('app-phone');
    function applyFormat(raw) {
      var digits = raw.replace(/^\+27-?/,'').replace(/\D/g,'').slice(0,9);
      if (!digits.length)   return PREFIX;
      if (digits.length <= 2) return PREFIX + digits;
      if (digits.length <= 5) return PREFIX + digits.slice(0,2) + '-' + digits.slice(2);
      return                   PREFIX + digits.slice(0,2) + '-' + digits.slice(2,5) + '-' + digits.slice(5,9);
    }
    phoneEl.addEventListener('input', function () {
      this.value = applyFormat(this.value);
      this.selectionStart = this.selectionEnd = this.value.length;
    });
    phoneEl.addEventListener('keydown', function (e) {
      if ((e.key === 'Backspace' || e.key === 'Delete') && this.value.length <= PREFIX.length) {
        e.preventDefault();
      }
    });
  })();

  // ── Submission ────────────────────────────────────────────
  function submitApplication() {
    btnNext.disabled    = true;
    btnNext.textContent = 'Submitting…';

    var spaceIdx  = document.getElementById('app-full-name').value.trim().indexOf(' ');
    var fullName  = document.getElementById('app-full-name').value.trim();
    var firstname = spaceIdx > -1 ? fullName.slice(0, spaceIdx) : fullName;
    var lastname  = spaceIdx > -1 ? fullName.slice(spaceIdx + 1) : '';

    var selectedServices = [];
    document.querySelectorAll('#app-step-3 .app-toggle-card.selected').forEach(function (c) {
      selectedServices.push(c.dataset.value);
    });
    var selectedInvestment = document.querySelector('#app-investment .app-radio-card.selected');

    var payload = {
      company_name:         document.getElementById('app-company-name').value.trim(),
      industry:             document.getElementById('app-industry').value.trim(),
      website:              document.getElementById('app-website').value.trim() || null,
      employee_count:       document.getElementById('app-employees').value,
      full_name:            fullName,
      job_title:            document.getElementById('app-job-title').value.trim(),
      email:                document.getElementById('app-email').value.trim(),
      phone:                document.getElementById('app-phone').value,
      services_of_interest: selectedServices.join(', '),
      business_challenges:  document.getElementById('app-challenges').value.trim(),
      start_date:           document.getElementById('app-start-date').value,
      investment_range:     selectedInvestment ? selectedInvestment.dataset.value : '',
    };

    var ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndkYnNtY3h6aG1ka2Zqb2Z0dWxtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4MDEwMTQsImV4cCI6MjA5NzM3NzAxNH0.xo9x29q_QVmDl81soUI3OMDzJBKmqEme-I6v5IZmeN0';

    fetch('https://wdbsmcxzhmdkfjoftulm.supabase.co/rest/v1/applications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey':        ANON,
        'Authorization': 'Bearer ' + ANON,
        'Prefer':        'return=minimal',
      },
      body: JSON.stringify(payload),
    }).then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);

      // Fire-and-forget to HubSpot (contact basics only)
      var hsFields = [
        { objectTypeId: '0-1', name: 'firstname', value: firstname      },
        { objectTypeId: '0-1', name: 'email',     value: payload.email  },
        { objectTypeId: '0-1', name: 'company',   value: payload.company_name },
      ];
      if (lastname) hsFields.push({ objectTypeId: '0-1', name: 'lastname', value: lastname });
      if (payload.phone && payload.phone !== '+27-')
        hsFields.push({ objectTypeId: '0-1', name: 'phone', value: payload.phone });

      fetch('https://api.hsforms.com/submissions/v3/integration/submit/148222168/985b8dbe-7881-4dc5-93fc-3ae30065bfef', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields:  hsFields,
          context: { pageUri: window.location.href, pageName: document.title },
        }),
      }).catch(function () {});

      // Show success state
      document.getElementById('app-wizard').style.display  = 'none';
      document.getElementById('app-success').style.display = 'block';

    }).catch(function () {
      btnNext.disabled    = false;
      btnNext.textContent = 'Apply For Partnership';
      showErr('app-err-investment', 'Something went wrong. Please email us directly at info@oakandpixel.co.za');
    });
  }
})();
```

- [ ] **Step 2: Verify wizard behaviour**

Open `index.html` (or live preview). Scroll to `#contact`. Run through the manual test checklist:

1. Step 1 — leave Company Name blank, click "Next →" → red error appears under Company Name field, cannot advance
2. Step 1 — fill Company Name, Industry, select Employees, click Next → advances to Step 2; "← Back" now visible; progress bar wider
3. Step 2 — enter valid Name, Job Title, Email, phone (+27-XX-XXX-XXXX format), click Next → advances to Step 3
4. Step 3 — click "Next →" without selecting any card → error "Please select at least one service or plan." visible; click a card → it highlights (emerald border/tint); click Next → advances to Step 4
5. Step 4 — enter fewer than 20 characters, click Next → error. Enter 20+ characters, click Next → advances to Step 5
6. Step 5 — leave dropdown on placeholder, click Next → error. Choose "Within 30 Days", click Next → advances to Step 6
7. Step 6 — button text is "Apply For Partnership"; click an investment card → it highlights, others stay unhighlighted
8. Click "Apply For Partnership" → button disabled, text "Submitting…" → wizard replaces with success message "Thank you for applying to work with Oak & Pixel Studio…"
9. Verify in Supabase: open Supabase dashboard for project `wdbsmcxzhmdkfjoftulm`, table `applications` → new row with all fields populated

If step 9 shows an error row (e.g., HTTP 403), check RLS policies via Supabase MCP:
```sql
SELECT polname, cmd, roles FROM pg_policies WHERE tablename = 'applications';
```
Expected: two policies — `anon_insert` (INSERT) and `auth_all` (ALL).

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat(web): partnership application — wizard JS, validation, submission"
```
