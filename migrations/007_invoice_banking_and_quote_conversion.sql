-- Add invoice banking details and atomic quote-to-invoice conversion.

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS banking_details TEXT;

CREATE OR REPLACE FUNCTION convert_quote_to_invoice(
  p_quote_id UUID,
  p_invoice_number TEXT,
  p_due_date DATE DEFAULT (CURRENT_DATE + 7),
  p_banking_details TEXT DEFAULT NULL
)
RETURNS SETOF invoices
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  q quotes%ROWTYPE;
  created_invoice invoices%ROWTYPE;
BEGIN
  SELECT * INTO q
  FROM quotes
  WHERE id = p_quote_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Quote % not found', p_quote_id;
  END IF;

  INSERT INTO invoices (
    invoice_number,
    client_id,
    service_id,
    service_name,
    service_description,
    invoice_date,
    due_date,
    setup_fee,
    monthly_retainer,
    additional_items,
    total_amount,
    payment_status,
    banking_details
  )
  VALUES (
    p_invoice_number,
    q.client_id,
    q.service_id,
    q.service_name,
    q.service_description,
    CURRENT_DATE,
    p_due_date,
    q.setup_fee,
    q.monthly_retainer,
    q.additional_items,
    q.total_amount,
    'Draft',
    p_banking_details
  )
  RETURNING * INTO created_invoice;

  DELETE FROM quotes WHERE id = p_quote_id;

  RETURN NEXT created_invoice;
END;
$$;

GRANT EXECUTE ON FUNCTION convert_quote_to_invoice(UUID, TEXT, DATE, TEXT) TO authenticated;
