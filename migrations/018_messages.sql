-- Client messaging / email module (Backlog #3)
-- Lightweight, tracked client communication — not a full inbox.
-- Each row is one message composed in the OPS messaging hub and sent to a
-- client via the /api/send-message endpoint (Resend). status records the
-- delivery outcome so the hub and notification bell can surface sent/failed.

CREATE TABLE IF NOT EXISTS messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  recipient_email text NOT NULL,
  subject         text NOT NULL,
  body            text NOT NULL,
  status          text NOT NULL DEFAULT 'sent',  -- 'sent' | 'failed' | 'draft'
  error           text,
  created_at      timestamptz DEFAULT now()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_all" ON messages
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE INDEX messages_client_id_idx  ON messages (client_id);
CREATE INDEX messages_created_at_idx ON messages (created_at DESC);
