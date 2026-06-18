# Build A — Service Pricing & Lead-to-Client Conversion

**Date:** 2026-06-18
**Status:** Approved
**Scope:** Foundation layer for the OPS client lifecycle system (Build B: quoting; Build C: onboarding + payment tracking)

---

## Goal

Add a fixed price to each service/product (visible on both the admin and the public site), and allow a contact lead to be promoted to a client (stored in a dedicated `clients` table, surfaced in a new Clients admin page).

## Architecture

Static HTML site (`index.html`, `admin.html`) backed by Supabase (REST API via CDN). No build step. Changes touch: Supabase schema (3 SQL migrations), `admin.html` (services + contacts + new clients page), `index.html` (price injection via JS on page load).

**Tech stack:** Supabase JS CDN, vanilla JS, CSS custom properties (`--emerald-l`, `--gold`, `--bg`, etc.)

---

## Data Model

### 1. `services` — add `price` column

```sql
ALTER TABLE services ADD COLUMN price INTEGER NOT NULL DEFAULT 0;
```

- Stored as whole rands (e.g. `25000` = R 25,000)
- `0` means no price set — treated as "unpublished" price on the public site (not rendered)

### 2. `clients` — new table

```sql
CREATE TABLE IF NOT EXISTS clients (
  id                UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name         TEXT          NOT NULL,
  email             TEXT          NOT NULL,
  company           TEXT,
  phone             TEXT,
  website           TEXT,
  project_type      TEXT,
  budget            TEXT,
  brief             TEXT,
  source_contact_id UUID          REFERENCES contacts(id),
  created_at        TIMESTAMPTZ   DEFAULT now()
);
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_insert" ON clients FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "auth_all"    ON clients FOR ALL    TO authenticated USING (true);
```

- Mirrors the `contacts` field set exactly
- `source_contact_id` is a soft back-reference — deleting a contact does not cascade-delete the client record

### 3. `contacts` — add `converted_at` column

```sql
ALTER TABLE contacts ADD COLUMN converted_at TIMESTAMPTZ;
```

- `NULL` = active lead; non-null = converted, hidden from Contacts CRM list
- Stamped at the moment the "Convert to Client" action completes

---

## Admin UI (`admin.html`)

### Services page

- **Add Service form**: add a "Price (R)" `<input type="number" min="0" step="1">` field alongside the existing name and description inputs. Value is saved as an integer to `services.price`.
- **Service cards**: display `R ${price.toLocaleString('en-ZA')}` (e.g. "R 25,000") below the service name. Price is editable inline — click to reveal a number input, save on blur via `sb.from('services').update({ price })`.
- **`loadServices()` query**: add `price` to the select: `select('id,name,description,price,active,sort_order')`.
- If `price === 0`, render "— No price set —" in muted text instead of R 0.

### Contacts CRM page

- Each contact row gets a **"Make Client"** button (ghost style, right-aligned, only shown for contacts where `converted_at` is null).
- On click:
  1. `INSERT INTO clients` — copy `full_name, email, company, phone, website, project_type, budget, brief, source_contact_id = contact.id`
  2. `UPDATE contacts SET converted_at = now() WHERE id = contact.id`
  3. Remove the row from the rendered table
  4. Toast: "Lead converted to client"
  5. Re-run `loadContacts()` (which re-counts and updates the Contacts badge) and `loadClients()` (which re-counts and updates the Clients badge)
- **`loadContacts()` query**: add `.is('converted_at', null)` filter so converted contacts never appear in the list.

### Clients page (new)

- **Sidebar nav item**: "Clients" with a count badge (total client rows), between Contacts and Services in the nav order.
- **Page ID**: `page-clients`
- **Table columns**: Name | Company | Email | Project Type | Budget | Date Converted
- **`loadClients()`**: `sb.from('clients').select('*').order('created_at', { ascending: false })`
- No status column (status management is introduced in Build B).
- Empty state: "No clients yet. Convert a lead from the Contacts page."
- `PAGE_TITLES` entry: `clients: 'Clients'`

---

## Public Site (`index.html`)

### Price injection

On `DOMContentLoaded`, fetch active services with their prices:

```js
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndkYnNtY3h6aG1ka2Zqb2Z0dWxtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4MDEwMTQsImV4cCI6MjA5NzM3NzAxNH0.xo9x29q_QVmDl81soUI3OMDzJBKmqEme-I6v5IZmeN0';
const { data: svcs } = await fetch(
  'https://wdbsmcxzhmdkfjoftulm.supabase.co/rest/v1/services?select=name,price&active=eq.true',
  { headers: { apikey: SUPABASE_ANON } }
).then(r => r.json());

svcs?.forEach(({ name, price }) => {
  if (!price) return;
  const card = document.querySelector(`[data-service="${name}"]`);
  if (!card) return;
  const el = document.createElement('p');
  el.className = 'service-price';
  el.textContent = `R ${price.toLocaleString('en-ZA')}`;
  card.querySelector('.service-name').after(el);
});
```

### CSS

```css
.service-price {
  font-family: var(--font-body);
  font-size: 0.85rem;
  color: var(--emerald-l);
  letter-spacing: 0.04em;
  margin-bottom: 1rem;
}
```

### HTML — `data-service` attributes

Each `.service-card` in `index.html` gets `data-service="<exact name from Supabase>"`, e.g.:

```html
<div class="service-card reveal" data-service="Brand Identity">
```

The name values in `data-service` must match `services.name` in Supabase exactly (case-sensitive). This is set once at implementation time and is stable unless service names change.

---

## Out of Scope (Build B)

- Assigning a client to a service/product
- Quote generation
- Quote-to-active product promotion
- Payment tracking

## Out of Scope (Build C)

- Client onboarding journey / checklist
- Payment milestone dashboard
