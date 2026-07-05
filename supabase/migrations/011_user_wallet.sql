-- User prepaid wallet + manual deposit flow

CREATE TYPE deposit_status AS ENUM ('pending', 'confirmed', 'rejected');
CREATE TYPE deposit_method AS ENUM ('mtn', 'airtel', 'binance', 'other');
CREATE TYPE wallet_tx_type AS ENUM ('deposit', 'purchase', 'platform_fee', 'refund', 'adjustment');

CREATE TABLE user_wallets (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  balance DECIMAL(10, 2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
  currency TEXT NOT NULL DEFAULT 'USD',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE wallet_deposits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'USD',
  method deposit_method NOT NULL,
  transaction_id TEXT NOT NULL,
  reference TEXT NOT NULL UNIQUE,
  status deposit_status NOT NULL DEFAULT 'pending',
  admin_note TEXT,
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_wallet_deposits_status ON wallet_deposits (status, created_at DESC);
CREATE INDEX idx_wallet_deposits_user ON wallet_deposits (user_id, created_at DESC);

CREATE TABLE wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type wallet_tx_type NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  balance_after DECIMAL(10, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  description TEXT,
  deposit_id UUID REFERENCES wallet_deposits(id) ON DELETE SET NULL,
  payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_wallet_transactions_user ON wallet_transactions (user_id, created_at DESC);

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS platform_fee DECIMAL(10, 2) NOT NULL DEFAULT 0;

ALTER TABLE ledger_entries
  ADD COLUMN IF NOT EXISTS deposit_id UUID REFERENCES wallet_deposits(id) ON DELETE SET NULL;

ALTER TABLE user_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own wallet"
  ON user_wallets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users view own deposits"
  ON wallet_deposits FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users create own deposits"
  ON wallet_deposits FOR INSERT
  WITH CHECK (auth.uid() = user_id AND status = 'pending');

CREATE POLICY "Users view own wallet transactions"
  ON wallet_transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins manage wallets"
  ON user_wallets FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins manage deposits"
  ON wallet_deposits FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins manage wallet transactions"
  ON wallet_transactions FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Ensure wallet row exists
CREATE OR REPLACE FUNCTION ensure_user_wallet(p_user_id UUID)
RETURNS user_wallets AS $$
DECLARE
  w user_wallets;
BEGIN
  INSERT INTO user_wallets (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT * INTO w FROM user_wallets WHERE user_id = p_user_id;
  RETURN w;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Confirm deposit and credit wallet (called via service role)
CREATE OR REPLACE FUNCTION confirm_wallet_deposit(
  p_deposit_id UUID,
  p_admin_note TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  d wallet_deposits;
  w user_wallets;
  new_balance DECIMAL(10, 2);
BEGIN
  SELECT * INTO d FROM wallet_deposits WHERE id = p_deposit_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Deposit not found');
  END IF;
  IF d.status != 'pending' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Deposit already processed');
  END IF;

  PERFORM ensure_user_wallet(d.user_id);

  UPDATE user_wallets
  SET balance = balance + d.amount, updated_at = NOW()
  WHERE user_id = d.user_id
  RETURNING * INTO w;

  new_balance := w.balance;

  UPDATE wallet_deposits
  SET status = 'confirmed', confirmed_at = NOW(), admin_note = p_admin_note
  WHERE id = p_deposit_id;

  INSERT INTO wallet_transactions (user_id, type, amount, balance_after, currency, description, deposit_id)
  VALUES (d.user_id, 'deposit', d.amount, new_balance, d.currency,
    'Deposit confirmed (' || d.method || ' ' || d.transaction_id || ')', d.id);

  INSERT INTO ledger_entries (entry_type, amount, currency, description, deposit_id)
  VALUES ('payment_in', d.amount, d.currency,
    'Wallet deposit ' || d.reference || ' via ' || d.method, d.id);

  RETURN jsonb_build_object('ok', true, 'balance', new_balance);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Deduct wallet for tool purchase
CREATE OR REPLACE FUNCTION wallet_purchase(
  p_user_id UUID,
  p_tool_id UUID,
  p_hardware_id TEXT,
  p_tool_price DECIMAL,
  p_platform_fee DECIMAL,
  p_currency TEXT DEFAULT 'USD'
)
RETURNS JSONB AS $$
DECLARE
  w user_wallets;
  total_cost DECIMAL(10, 2);
  new_balance DECIMAL(10, 2);
  pay_id UUID;
  ref TEXT;
  tool_row tools;
BEGIN
  total_cost := p_tool_price + p_platform_fee;

  PERFORM ensure_user_wallet(p_user_id);

  SELECT * INTO w FROM user_wallets WHERE user_id = p_user_id FOR UPDATE;
  IF w.balance < total_cost THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Insufficient balance',
      'required', total_cost, 'balance', w.balance);
  END IF;

  SELECT * INTO tool_row FROM tools WHERE id = p_tool_id AND is_active = true;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Tool not found');
  END IF;

  ref := 'wal_' || extract(epoch from now())::bigint || '_' || substr(md5(random()::text), 1, 6);

  UPDATE user_wallets
  SET balance = balance - total_cost, updated_at = NOW()
  WHERE user_id = p_user_id
  RETURNING balance INTO new_balance;

  INSERT INTO payments (user_id, tool_id, hardware_id, amount, currency, provider, provider_reference, status, completed_at, platform_fee, fulfillment_status)
  VALUES (
    p_user_id, p_tool_id, p_hardware_id, p_tool_price, p_currency, 'wallet', ref,
    'completed', NOW(), p_platform_fee,
    CASE WHEN tool_row.fulfillment_mode = 'manual' THEN 'awaiting'::text ELSE NULL END
  )
  RETURNING id INTO pay_id;

  INSERT INTO wallet_transactions (user_id, type, amount, balance_after, currency, description, payment_id)
  VALUES (p_user_id, 'purchase', -p_tool_price, new_balance + p_platform_fee, p_currency,
    'Activation: ' || tool_row.name, pay_id);

  IF p_platform_fee > 0 THEN
    INSERT INTO wallet_transactions (user_id, type, amount, balance_after, currency, description, payment_id)
    VALUES (p_user_id, 'platform_fee', -p_platform_fee, new_balance, p_currency,
      'Platform fee', pay_id);
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'payment_id', pay_id,
    'reference', ref,
    'balance', new_balance,
    'fulfillment_mode', tool_row.fulfillment_mode
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE user_wallets IS 'Customer prepaid balance for tool purchases';
COMMENT ON TABLE wallet_deposits IS 'Manual MTN/Airtel deposit requests awaiting admin confirmation';
COMMENT ON TABLE wallet_transactions IS 'Wallet credit/debit audit log';
