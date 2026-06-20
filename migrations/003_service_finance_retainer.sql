-- Oak & Pixel Studio admin service delivery, quote, invoice, and retainer schema.

ALTER TABLE services ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'General';
ALTER TABLE services ADD COLUMN IF NOT EXISTS setup_fee INTEGER NOT NULL DEFAULT 0;
ALTER TABLE services ADD COLUMN IF NOT EXISTS monthly_retainer INTEGER NOT NULL DEFAULT 0;
ALTER TABLE services ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'Active';
ALTER TABLE services ADD COLUMN IF NOT EXISTS notes TEXT;

CREATE TABLE IF NOT EXISTS quotes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_number TEXT NOT NULL UNIQUE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  service_id UUID REFERENCES services(id) ON DELETE SET NULL,
  service_name TEXT,
  service_description TEXT,
  quote_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expiry_date DATE,
  setup_fee INTEGER NOT NULL DEFAULT 0,
  monthly_retainer INTEGER NOT NULL DEFAULT 0,
  additional_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_amount INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Draft',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_number TEXT NOT NULL UNIQUE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  service_id UUID REFERENCES services(id) ON DELETE SET NULL,
  service_name TEXT,
  service_description TEXT,
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  setup_fee INTEGER NOT NULL DEFAULT 0,
  monthly_retainer INTEGER NOT NULL DEFAULT 0,
  additional_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_amount INTEGER NOT NULL DEFAULT 0,
  payment_status TEXT NOT NULL DEFAULT 'Draft',
  banking_details TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS banking_details TEXT;

CREATE TABLE IF NOT EXISTS retainers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL UNIQUE REFERENCES clients(id) ON DELETE CASCADE,
  assigned_plan TEXT,
  monthly_retainer INTEGER NOT NULL DEFAULT 0,
  billing_day INTEGER NOT NULL DEFAULT 1,
  last_payment_date DATE,
  next_payment_date DATE,
  payment_status TEXT NOT NULL DEFAULT 'Pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS retainer_payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  retainer_id UUID NOT NULL REFERENCES retainers(id) ON DELETE CASCADE,
  month TEXT NOT NULL,
  invoice_number TEXT,
  amount INTEGER NOT NULL DEFAULT 0,
  payment_date DATE,
  payment_status TEXT NOT NULL DEFAULT 'Pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE retainers ENABLE ROW LEVEL SECURITY;
ALTER TABLE retainer_payments ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "auth_all" ON quotes FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "auth_all" ON invoices FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "auth_all" ON retainers FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "auth_all" ON retainer_payments FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
