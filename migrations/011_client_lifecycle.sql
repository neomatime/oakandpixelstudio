-- Add lifecycle_stage and stage_entered_at to clients table
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS lifecycle_stage TEXT NOT NULL DEFAULT 'Lead',
  ADD COLUMN IF NOT EXISTS stage_entered_at TIMESTAMPTZ DEFAULT now();
