-- Oak & Pixel Studio booking-to-client conversion tracking.
-- Apply in Supabase SQL Editor to let OPS Command Center remember which
-- booking created or was linked to a client.

ALTER TABLE clients
ADD COLUMN IF NOT EXISTS source_booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL;

ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS converted_to_client_id UUID REFERENCES clients(id) ON DELETE SET NULL;

ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS converted_at TIMESTAMPTZ;
