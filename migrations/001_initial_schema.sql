-- Migration: Add services.price, clients table, contacts.converted_at
-- Date: 2026-06-18
-- Status: Applied via Supabase SQL Editor (project: wdbsmcxzhmdkfjoftulm)

-- Step 1: Add price column to services table
ALTER TABLE services ADD COLUMN price INTEGER NOT NULL DEFAULT 0;

-- Step 2: Create clients table with RLS policies
CREATE TABLE IF NOT EXISTS clients (
  id                UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name         TEXT        NOT NULL,
  email             TEXT        NOT NULL,
  company           TEXT,
  phone             TEXT,
  website           TEXT,
  project_type      TEXT,
  budget            TEXT,
  brief             TEXT,
  source_contact_id UUID        REFERENCES contacts(id),
  created_at        TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_insert" ON clients FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "auth_all"    ON clients FOR ALL    TO authenticated USING (true);

-- Step 3: Add converted_at column to contacts table
ALTER TABLE contacts ADD COLUMN converted_at TIMESTAMPTZ;
