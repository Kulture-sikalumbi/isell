-- Tool icon_url already exists from initial schema; just add admin_note to payments
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS admin_note TEXT;

COMMENT ON COLUMN payments.admin_note IS 'Admin comments/notes visible to the customer on fulfilled orders';
