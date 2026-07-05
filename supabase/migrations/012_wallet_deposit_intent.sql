-- Allow deposit intent before transaction ID is entered (two-step deposit flow)

ALTER TABLE wallet_deposits
  ALTER COLUMN transaction_id DROP NOT NULL;

COMMENT ON COLUMN wallet_deposits.transaction_id IS 'Null until customer submits MTN/Airtel confirmation ID';
