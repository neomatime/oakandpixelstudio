-- Client messaging / email module (Backlog #3) — powers the Messages page.
-- Outlook-style folders: outbound rows = Sent (sent via /api/send-message via
-- Resend), inbound rows = Inbox (populated once a real mail feed is connected).
-- recipient_email is the counterparty (client) address in both directions.

CREATE TABLE IF NOT EXISTS messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       uuid REFERENCES clients(id) ON DELETE SET NULL,
  direction       text NOT NULL DEFAULT 'outbound',  -- 'outbound' (Sent) | 'inbound' (Inbox)
  recipient_email text NOT NULL,                      -- counterparty address
  subject         text NOT NULL,
  body            text NOT NULL,
  status          text NOT NULL DEFAULT 'sent',       -- 'sent' | 'failed' | 'draft'
  is_read         boolean NOT NULL DEFAULT true,      -- inbound mail starts unread
  error           text,
  created_at      timestamptz DEFAULT now()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_all" ON messages
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE INDEX messages_client_id_idx  ON messages (client_id);
CREATE INDEX messages_direction_idx  ON messages (direction);
CREATE INDEX messages_created_at_idx ON messages (created_at DESC);
