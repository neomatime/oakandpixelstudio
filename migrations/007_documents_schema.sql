-- ============================================================
-- OAK & PIXEL STUDIO — DOCUMENTS SCHEMA
-- Run in Supabase SQL Editor. Safe to run more than once.
-- ============================================================

-- ── PROPOSALS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS proposals (
  id                UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  proposal_number   TEXT        NOT NULL UNIQUE,
  client_id         UUID        REFERENCES clients(id) ON DELETE SET NULL,
  service_id        UUID        REFERENCES services(id) ON DELETE SET NULL,
  title             TEXT        NOT NULL,
  status            TEXT        NOT NULL DEFAULT 'Draft',
  proposal_date     DATE        NOT NULL DEFAULT CURRENT_DATE,
  expiry_date       DATE,
  executive_summary TEXT,
  challenges        TEXT,
  solution          TEXT,
  deliverables      TEXT,
  timeline          TEXT,
  investment        TEXT,
  next_steps        TEXT,
  setup_fee         INTEGER     NOT NULL DEFAULT 0,
  monthly_retainer  INTEGER     NOT NULL DEFAULT 0,
  total_amount      INTEGER     NOT NULL DEFAULT 0,
  archived          BOOLEAN     NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "auth_all" ON proposals FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── SCOPES (Scope of Work) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS scopes (
  id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  scope_number     TEXT        NOT NULL UNIQUE,
  proposal_id      UUID        REFERENCES proposals(id) ON DELETE SET NULL,
  client_id        UUID        REFERENCES clients(id) ON DELETE SET NULL,
  service_id       UUID        REFERENCES services(id) ON DELETE SET NULL,
  title            TEXT        NOT NULL,
  status           TEXT        NOT NULL DEFAULT 'Draft',
  scope_date       DATE        NOT NULL DEFAULT CURRENT_DATE,
  deliverables     TEXT,
  milestones       TEXT,
  timeline         TEXT,
  responsibilities TEXT,
  assumptions      TEXT,
  exclusions       TEXT,
  archived         BOOLEAN     NOT NULL DEFAULT false,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE scopes ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "auth_all" ON scopes FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── WELCOME LETTERS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS welcome_letters (
  id                UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  letter_number     TEXT        NOT NULL UNIQUE,
  client_id         UUID        REFERENCES clients(id) ON DELETE SET NULL,
  status            TEXT        NOT NULL DEFAULT 'Draft',
  assigned_services TEXT[]      NOT NULL DEFAULT '{}',
  welcome_message   TEXT,
  important_info    TEXT,
  sent_at           TIMESTAMPTZ,
  archived          BOOLEAN     NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE welcome_letters ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "auth_all" ON welcome_letters FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── ADD archived COLUMN TO EXISTING TABLES ───────────────────
ALTER TABLE quotes   ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT false;
