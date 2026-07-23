-- Settlement currency: convert into wallet native currency when funds land.
-- Stores original (paid) amount forever + settled credit + FX snapshot used at confirm.
-- Rate changes later do NOT revalue past balances.

ALTER TABLE wallet_deposits
  ADD COLUMN IF NOT EXISTS settled_amount DECIMAL(12, 2),
  ADD COLUMN IF NOT EXISTS settled_currency TEXT,
  ADD COLUMN IF NOT EXISTS fx_usd_to_zmw DECIMAL(18, 8),
  ADD COLUMN IF NOT EXISTS fx_source TEXT,
  ADD COLUMN IF NOT EXISTS fx_locked_at TIMESTAMPTZ;

COMMENT ON COLUMN wallet_deposits.amount IS 'Original paid amount in rail currency (MoMo=ZMW, crypto=USD)';
COMMENT ON COLUMN wallet_deposits.currency IS 'Original paid currency';
COMMENT ON COLUMN wallet_deposits.settled_amount IS 'Amount credited to user wallet after FX at confirm time';
COMMENT ON COLUMN wallet_deposits.settled_currency IS 'Wallet native currency at confirm (balance units)';
COMMENT ON COLUMN wallet_deposits.fx_usd_to_zmw IS 'USD→ZMW rate locked at confirm; NULL if no conversion';
COMMENT ON COLUMN wallet_deposits.fx_source IS 'live | manual | none';
COMMENT ON COLUMN wallet_deposits.fx_locked_at IS 'When the FX rate was locked for this deposit';

ALTER TABLE wallet_transactions
  ADD COLUMN IF NOT EXISTS source_amount DECIMAL(12, 2),
  ADD COLUMN IF NOT EXISTS source_currency TEXT,
  ADD COLUMN IF NOT EXISTS fx_usd_to_zmw DECIMAL(18, 8);

COMMENT ON COLUMN wallet_transactions.source_amount IS 'Original paid amount before wallet settlement (deposits)';
COMMENT ON COLUMN wallet_transactions.source_currency IS 'Original paid currency before wallet settlement';
COMMENT ON COLUMN wallet_transactions.fx_usd_to_zmw IS 'FX rate used when this credit was settled';

-- Confirm deposit: credit wallet in settled (native) currency; keep rail amount on deposit + ledger.
CREATE OR REPLACE FUNCTION confirm_wallet_deposit(
  p_deposit_id UUID,
  p_admin_note TEXT DEFAULT NULL,
  p_settled_amount DECIMAL DEFAULT NULL,
  p_settled_currency TEXT DEFAULT NULL,
  p_fx_usd_to_zmw DECIMAL DEFAULT NULL,
  p_fx_source TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  d wallet_deposits;
  w user_wallets;
  new_balance DECIMAL(12, 2);
  credit_amount DECIMAL(12, 2);
  credit_currency TEXT;
  rate_used DECIMAL(18, 8);
  rate_source TEXT;
BEGIN
  SELECT * INTO d FROM wallet_deposits WHERE id = p_deposit_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Deposit not found');
  END IF;
  IF d.status != 'pending' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Deposit already processed');
  END IF;

  PERFORM ensure_user_wallet(d.user_id);
  SELECT * INTO w FROM user_wallets WHERE user_id = d.user_id FOR UPDATE;

  credit_currency := UPPER(COALESCE(NULLIF(TRIM(p_settled_currency), ''), w.currency, d.currency));
  credit_amount := COALESCE(p_settled_amount, d.amount);
  rate_used := p_fx_usd_to_zmw;
  rate_source := COALESCE(NULLIF(TRIM(p_fx_source), ''), CASE WHEN rate_used IS NULL THEN 'none' ELSE 'manual' END);

  IF credit_amount IS NULL OR credit_amount <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid settled amount');
  END IF;

  UPDATE user_wallets
  SET balance = balance + credit_amount, updated_at = NOW()
  WHERE user_id = d.user_id
  RETURNING * INTO w;

  new_balance := w.balance;

  UPDATE wallet_deposits
  SET
    status = 'confirmed',
    confirmed_at = NOW(),
    admin_note = p_admin_note,
    settled_amount = credit_amount,
    settled_currency = credit_currency,
    fx_usd_to_zmw = rate_used,
    fx_source = rate_source,
    fx_locked_at = CASE WHEN rate_used IS NOT NULL THEN NOW() ELSE NULL END
  WHERE id = p_deposit_id;

  INSERT INTO wallet_transactions (
    user_id, type, amount, balance_after, currency, description, deposit_id,
    source_amount, source_currency, fx_usd_to_zmw
  )
  VALUES (
    d.user_id,
    'deposit',
    credit_amount,
    new_balance,
    credit_currency,
    'Deposit confirmed (' || d.method || ' ' || COALESCE(d.transaction_id, d.reference) || ')',
    d.id,
    d.amount,
    d.currency,
    rate_used
  );

  -- Merchant ledger keeps the rail (what actually arrived), not the converted wallet credit
  INSERT INTO ledger_entries (entry_type, amount, currency, description, deposit_id)
  VALUES (
    'payment_in',
    d.amount,
    d.currency,
    'Wallet deposit ' || d.reference || ' via ' || d.method,
    d.id
  );

  RETURN jsonb_build_object(
    'ok', true,
    'balance', new_balance,
    'settled_amount', credit_amount,
    'settled_currency', credit_currency,
    'fx_usd_to_zmw', rate_used,
    'source_amount', d.amount,
    'source_currency', d.currency
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
