-- Optional sender details to help admin match MoMo payments (txn ID remains primary)

ALTER TABLE wallet_deposits
  ADD COLUMN IF NOT EXISTS sender_phone TEXT,
  ADD COLUMN IF NOT EXISTS sender_name TEXT;

COMMENT ON COLUMN wallet_deposits.sender_phone IS 'Customer MoMo number used to send payment';
COMMENT ON COLUMN wallet_deposits.sender_name IS 'Name shown on customer MoMo account';
