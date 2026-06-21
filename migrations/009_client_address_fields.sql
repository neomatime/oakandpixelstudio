-- Structured client address capture for OPS Command Center.
-- Keeps the existing company_address field as the composed display address.

ALTER TABLE clients ADD COLUMN IF NOT EXISTS address_line1 TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS address_line2 TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS address_suburb TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS address_city TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS address_province TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS address_postal_code TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS address_country TEXT;

