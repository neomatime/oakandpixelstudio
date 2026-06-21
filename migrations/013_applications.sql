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
