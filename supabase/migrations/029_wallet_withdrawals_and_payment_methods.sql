-- Saved customer payout methods + wallet withdrawal requests

CREATE TYPE user_payment_method_type AS ENUM ('mtn', 'airtel', 'binance', 'usdt_trc20');
CREATE TYPE withdrawal_status AS ENUM ('pending', 'completed', 'rejected');

ALTER TYPE wallet_tx_type ADD VALUE IF NOT EXISTS 'withdrawal';

CREATE TABLE user_payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  method user_payment_method_type NOT NULL,
  label TEXT,
  account_identifier TEXT NOT NULL,
  account_name TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT user_payment_methods_identifier_nonempty CHECK (char_length(trim(account_identifier)) > 0)
);

CREATE INDEX idx_user_payment_methods_user ON user_payment_methods (user_id, created_at DESC);

CREATE TABLE wallet_withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'USD',
  payment_method_id UUID NOT NULL REFERENCES user_payment_methods(id) ON DELETE RESTRICT,
  payment_method_snapshot JSONB NOT NULL,
  reference TEXT NOT NULL UNIQUE,
  status withdrawal_status NOT NULL DEFAULT 'pending',
  policy_accepted_at TIMESTAMPTZ NOT NULL,
  admin_note TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_wallet_withdrawals_status ON wallet_withdrawals (status, created_at DESC);
CREATE INDEX idx_wallet_withdrawals_user ON wallet_withdrawals (user_id, created_at DESC);

ALTER TABLE wallet_transactions
  ADD COLUMN IF NOT EXISTS withdrawal_id UUID REFERENCES wallet_withdrawals(id) ON DELETE SET NULL;

ALTER TABLE user_payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_withdrawals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own payment methods"
  ON user_payment_methods FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users manage own payment methods"
  ON user_payment_methods FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own payment methods"
  ON user_payment_methods FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own payment methods"
  ON user_payment_methods FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users view own withdrawals"
  ON wallet_withdrawals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users create own withdrawals"
  ON wallet_withdrawals FOR INSERT
  WITH CHECK (auth.uid() = user_id AND status = 'pending');

CREATE POLICY "Admins manage payment methods"
  ON user_payment_methods FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins manage withdrawals"
  ON wallet_withdrawals FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Complete withdrawal: debit wallet and record transaction
CREATE OR REPLACE FUNCTION process_wallet_withdrawal(
  p_withdrawal_id UUID,
  p_admin_note TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  wdr wallet_withdrawals;
  w user_wallets;
  new_balance DECIMAL(10, 2);
BEGIN
  SELECT * INTO wdr FROM wallet_withdrawals WHERE id = p_withdrawal_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Withdrawal not found');
  END IF;
  IF wdr.status != 'pending' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Withdrawal already processed');
  END IF;

  PERFORM ensure_user_wallet(wdr.user_id);

  SELECT * INTO w FROM user_wallets WHERE user_id = wdr.user_id FOR UPDATE;
  IF w.balance < wdr.amount THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Insufficient balance',
      'balance', w.balance, 'required', wdr.amount);
  END IF;

  UPDATE user_wallets
  SET balance = balance - wdr.amount, updated_at = NOW()
  WHERE user_id = wdr.user_id
  RETURNING balance INTO new_balance;

  UPDATE wallet_withdrawals
  SET status = 'completed', processed_at = NOW(), admin_note = p_admin_note
  WHERE id = p_withdrawal_id;

  INSERT INTO wallet_transactions (
    user_id, type, amount, balance_after, currency, description, withdrawal_id
  )
  VALUES (
    wdr.user_id,
    'withdrawal',
    -wdr.amount,
    new_balance,
    wdr.currency,
    'Withdrawal ' || wdr.reference,
    wdr.id
  );

  INSERT INTO ledger_entries (entry_type, amount, currency, description)
  VALUES (
    'payout',
    wdr.amount,
    wdr.currency,
    'Customer withdrawal ' || wdr.reference
  );

  RETURN jsonb_build_object('ok', true, 'balance', new_balance);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE user_payment_methods IS 'Customer payout accounts for withdrawals and deposit sender details';
COMMENT ON TABLE wallet_withdrawals IS 'Customer wallet cash-out requests processed manually by admin';
