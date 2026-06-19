-- Migration: Expand client records and add projects Kanban
-- Date: 2026-06-19
-- Apply in Supabase SQL Editor before using the new admin client onboarding and projects board.

ALTER TABLE clients ADD COLUMN IF NOT EXISTS industry TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS company_email TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS company_phone TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS position TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS selected_plan TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS project_start_date DATE;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS notes TEXT;

CREATE TABLE IF NOT EXISTS projects (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  title       TEXT        NOT NULL,
  description TEXT,
  client_id   UUID        REFERENCES clients(id) ON DELETE SET NULL,
  status      TEXT        NOT NULL DEFAULT 'backlog'
    CHECK (status IN ('backlog', 'todo', 'in_progress', 'review', 'done')),
  priority    TEXT        NOT NULL DEFAULT 'Medium'
    CHECK (priority IN ('Low', 'Medium', 'High', 'Urgent')),
  due_date    DATE,
  owner       TEXT,
  tags        TEXT[]      NOT NULL DEFAULT '{}',
  sort_order  INTEGER     NOT NULL DEFAULT 99,
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  CREATE POLICY "auth_all" ON projects FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

-- If this migration was already applied before Urgent priority existed,
-- run the following manually after checking the generated constraint name:
-- ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_priority_check;
-- ALTER TABLE projects ADD CONSTRAINT projects_priority_check CHECK (priority IN ('Low', 'Medium', 'High', 'Urgent'));
