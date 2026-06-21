-- ============================================================
-- OAK & PIXEL STUDIO — COMPLETE SCHEMA MIGRATION
-- Run this in the Supabase SQL Editor.
-- Safe to run more than once (fully idempotent).
-- Covers everything the admin portal reads and writes.
-- ============================================================


-- ── CONTACTS ────────────────────────────────────────────────
-- Created by the public contact form. Admin manages status and
-- conversion to clients.

CREATE TABLE IF NOT EXISTS contacts (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name    TEXT        NOT NULL,
  company      TEXT,
  email        TEXT        NOT NULL,
  phone        TEXT,
  website      TEXT,
  project_type TEXT,
  budget       TEXT,
  brief        TEXT,
  status       TEXT        NOT NULL DEFAULT 'new',
  converted_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE contacts ADD COLUMN IF NOT EXISTS status       TEXT        NOT NULL DEFAULT 'new';
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS converted_at TIMESTAMPTZ;

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "anon_insert" ON contacts FOR INSERT TO anon WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "auth_all" ON contacts FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ── AVAILABLE SLOTS ─────────────────────────────────────────
-- Date/time slots that clients can book into.

CREATE TABLE IF NOT EXISTS available_slots (
  id         UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  date       DATE    NOT NULL,
  start_time TIME    NOT NULL,
  is_booked  BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE available_slots ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "anon_read"  ON available_slots FOR SELECT TO anon USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "auth_all"   ON available_slots FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ── SERVICES ────────────────────────────────────────────────
-- Bookable services. Extended with finance columns for quotes
-- and invoices.

CREATE TABLE IF NOT EXISTS services (
  id               UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  name             TEXT    NOT NULL,
  description      TEXT,
  price            INTEGER NOT NULL DEFAULT 0,
  active           BOOLEAN NOT NULL DEFAULT true,
  sort_order       INTEGER NOT NULL DEFAULT 99,
  category         TEXT    DEFAULT 'General',
  setup_fee        INTEGER NOT NULL DEFAULT 0,
  monthly_retainer INTEGER NOT NULL DEFAULT 0,
  status           TEXT    NOT NULL DEFAULT 'Active',
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE services ADD COLUMN IF NOT EXISTS price            INTEGER NOT NULL DEFAULT 0;
ALTER TABLE services ADD COLUMN IF NOT EXISTS category         TEXT             DEFAULT 'General';
ALTER TABLE services ADD COLUMN IF NOT EXISTS setup_fee        INTEGER NOT NULL DEFAULT 0;
ALTER TABLE services ADD COLUMN IF NOT EXISTS monthly_retainer INTEGER NOT NULL DEFAULT 0;
ALTER TABLE services ADD COLUMN IF NOT EXISTS status           TEXT    NOT NULL DEFAULT 'Active';
ALTER TABLE services ADD COLUMN IF NOT EXISTS notes            TEXT;

ALTER TABLE services ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "anon_read" ON services FOR SELECT TO anon USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "auth_all"  ON services FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ── BOOKINGS ─────────────────────────────────────────────────
-- Submitted by the public booking form. Admin can edit, confirm,
-- decline, and reassign slots.

CREATE TABLE IF NOT EXISTS bookings (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slot_id    UUID REFERENCES available_slots(id) ON DELETE SET NULL,
  service_id UUID REFERENCES services(id)        ON DELETE SET NULL,
  full_name  TEXT NOT NULL,
  company    TEXT,
  email      TEXT NOT NULL,
  phone      TEXT,
  status     TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS slot_id    UUID REFERENCES available_slots(id) ON DELETE SET NULL;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS service_id UUID REFERENCES services(id)        ON DELETE SET NULL;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS company    TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS phone      TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS status     TEXT NOT NULL DEFAULT 'pending';

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "anon_insert" ON bookings FOR INSERT TO anon WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "auth_all"    ON bookings FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ── CLIENTS ──────────────────────────────────────────────────
-- Converted from contacts or created directly in the portal.
-- Full business and contact profile.

CREATE TABLE IF NOT EXISTS clients (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name         TEXT NOT NULL,
  email             TEXT NOT NULL,
  company           TEXT,
  phone             TEXT,
  website           TEXT,
  project_type      TEXT,
  budget            TEXT,
  brief             TEXT,
  source_contact_id UUID REFERENCES contacts(id),
  industry          TEXT,
  company_email     TEXT,
  company_phone     TEXT,
  company_address   TEXT,
  address_line1     TEXT,
  address_line2     TEXT,
  address_suburb    TEXT,
  address_city      TEXT,
  address_province  TEXT,
  address_postal_code TEXT,
  address_country   TEXT,
  position          TEXT,
  selected_plan     TEXT,
  project_start_date DATE,
  notes             TEXT,
  logo_url          TEXT,
  client_status     TEXT NOT NULL DEFAULT 'Active',
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE clients ADD COLUMN IF NOT EXISTS source_contact_id  UUID REFERENCES contacts(id);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS industry           TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS company_email      TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS company_phone      TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS company_address    TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS address_line1      TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS address_line2      TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS address_suburb     TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS address_city       TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS address_province   TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS address_postal_code TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS address_country    TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS position           TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS selected_plan      TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS project_start_date DATE;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS notes              TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS logo_url           TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS client_status      TEXT NOT NULL DEFAULT 'Active';

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "anon_insert" ON clients FOR INSERT TO anon WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "auth_all"    ON clients FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ── PROJECTS ─────────────────────────────────────────────────
-- Kanban board tasks. Each task can be linked to a client.

CREATE TABLE IF NOT EXISTS projects (
  id          UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  title       TEXT    NOT NULL,
  description TEXT,
  client_id   UUID    REFERENCES clients(id) ON DELETE SET NULL,
  status      TEXT    NOT NULL DEFAULT 'backlog',
  priority    TEXT    NOT NULL DEFAULT 'Medium',
  due_date    DATE,
  owner       TEXT,
  tags        TEXT[]  NOT NULL DEFAULT '{}',
  sort_order  INTEGER NOT NULL DEFAULT 99,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "auth_all" ON projects FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ── QUOTES ───────────────────────────────────────────────────
-- Generated from a service for a specific client.

CREATE TABLE IF NOT EXISTS quotes (
  id                  UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_number        TEXT    NOT NULL UNIQUE,
  client_id           UUID    REFERENCES clients(id)  ON DELETE SET NULL,
  service_id          UUID    REFERENCES services(id) ON DELETE SET NULL,
  service_name        TEXT,
  service_description TEXT,
  quote_date          DATE    NOT NULL DEFAULT CURRENT_DATE,
  expiry_date         DATE,
  setup_fee           INTEGER NOT NULL DEFAULT 0,
  monthly_retainer    INTEGER NOT NULL DEFAULT 0,
  additional_items    JSONB   NOT NULL DEFAULT '[]'::jsonb,
  total_amount        INTEGER NOT NULL DEFAULT 0,
  status              TEXT    NOT NULL DEFAULT 'Draft',
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "auth_all" ON quotes FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ── INVOICES ─────────────────────────────────────────────────
-- Generated from a service for a specific client.

CREATE TABLE IF NOT EXISTS invoices (
  id                  UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_number      TEXT    NOT NULL UNIQUE,
  client_id           UUID    REFERENCES clients(id)  ON DELETE SET NULL,
  service_id          UUID    REFERENCES services(id) ON DELETE SET NULL,
  service_name        TEXT,
  service_description TEXT,
  invoice_date        DATE    NOT NULL DEFAULT CURRENT_DATE,
  due_date            DATE,
  setup_fee           INTEGER NOT NULL DEFAULT 0,
  monthly_retainer    INTEGER NOT NULL DEFAULT 0,
  additional_items    JSONB   NOT NULL DEFAULT '[]'::jsonb,
  total_amount        INTEGER NOT NULL DEFAULT 0,
  payment_status      TEXT    NOT NULL DEFAULT 'Draft',
  banking_details     TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS banking_details TEXT;

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "auth_all" ON invoices FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ── RETAINERS ────────────────────────────────────────────────
-- One retainer per client. Tracks monthly billing and status.

CREATE TABLE IF NOT EXISTS retainers (
  id                UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id         UUID    NOT NULL UNIQUE REFERENCES clients(id) ON DELETE CASCADE,
  assigned_plan     TEXT,
  monthly_retainer  INTEGER NOT NULL DEFAULT 0,
  billing_day       INTEGER NOT NULL DEFAULT 1,
  last_payment_date DATE,
  next_payment_date DATE,
  payment_status    TEXT    NOT NULL DEFAULT 'Pending',
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE retainers ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "auth_all" ON retainers FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ── RETAINER PAYMENTS ────────────────────────────────────────
-- Individual payment records under a retainer.

CREATE TABLE IF NOT EXISTS retainer_payments (
  id             UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  retainer_id    UUID    NOT NULL REFERENCES retainers(id) ON DELETE CASCADE,
  month          TEXT    NOT NULL,
  invoice_number TEXT,
  amount         INTEGER NOT NULL DEFAULT 0,
  payment_date   DATE,
  payment_status TEXT    NOT NULL DEFAULT 'Pending',
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE retainer_payments ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "auth_all" ON retainer_payments FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ── CLIENT LOGO STORAGE BUCKET ───────────────────────────────
-- Public bucket for client logo uploads via the admin portal.

INSERT INTO storage.buckets (id, name, public)
VALUES ('client-logos', 'client-logos', true)
ON CONFLICT (id) DO NOTHING;

DO $$ BEGIN
  CREATE POLICY "auth_read_client_logos"   ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'client-logos');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "auth_insert_client_logos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'client-logos');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "auth_update_client_logos" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'client-logos') WITH CHECK (bucket_id = 'client-logos');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "auth_delete_client_logos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'client-logos');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
