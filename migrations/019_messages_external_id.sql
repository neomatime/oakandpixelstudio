-- Inbox sync (Backlog #3 cont.) — dedup key for inbound mail.
-- external_id stores the email Message-ID so the IMAP sync (/api/sync-inbox)
-- can skip messages it has already imported.

ALTER TABLE messages ADD COLUMN IF NOT EXISTS external_id text;
CREATE INDEX IF NOT EXISTS messages_external_id_idx ON messages (external_id);
