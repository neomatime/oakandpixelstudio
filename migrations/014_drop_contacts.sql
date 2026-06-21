-- Drop contacts table and its FK reference from clients
ALTER TABLE clients DROP COLUMN IF EXISTS source_contact_id;
DROP TABLE IF EXISTS contacts;
