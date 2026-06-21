CREATE TABLE IF NOT EXISTS mandates (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  retainer_id        uuid NOT NULL REFERENCES retainers(id) ON DELETE CASCADE,
  client_id          uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  status             text NOT NULL DEFAULT 'pending',
  provider           text,
  mandate_reference  text,
  mandate_type       text,
  notes              text,
  created_at         timestamptz DEFAULT now(),
  activated_at       timestamptz,
  cancelled_at       timestamptz,
  cancel_reason      text
);

ALTER TABLE mandates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_all" ON mandates
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE INDEX mandates_retainer_id_idx ON mandates (retainer_id);
CREATE INDEX mandates_client_id_idx ON mandates (client_id);
