-- Human-friendly order numbers + admin order rejection with wallet refund

CREATE SEQUENCE IF NOT EXISTS payment_order_number_seq START 1;

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS order_number TEXT,
  ADD COLUMN IF NOT EXISTS refund_note TEXT,
  ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_order_number ON payments (order_number);

CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
BEGIN
  RETURN 'ORD-' || to_char(now() AT TIME ZONE 'UTC', 'YYYYMMDD') || '-' ||
    lpad(nextval('payment_order_number_seq')::text, 5, '0');
END;
$$ LANGUAGE plpgsql;

-- Backfill existing orders
UPDATE payments
SET order_number = generate_order_number()
WHERE order_number IS NULL;

ALTER TABLE payments
  ALTER COLUMN order_number SET NOT NULL;

COMMENT ON COLUMN payments.order_number IS 'Human-friendly order ID shown to admin and customers';
COMMENT ON COLUMN payments.refund_note IS 'Admin reason when order is rejected and refunded';
COMMENT ON COLUMN payments.refunded_at IS 'When the order was rejected and refunded to wallet';

-- Assign order numbers on new wallet purchases
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
  ord_num TEXT;
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
  ord_num := generate_order_number();

  UPDATE user_wallets
  SET balance = balance - total_cost, updated_at = NOW()
  WHERE user_id = p_user_id
  RETURNING balance INTO new_balance;

  INSERT INTO payments (
    user_id, tool_id, hardware_id, amount, currency, provider, provider_reference,
    order_number, status, completed_at, platform_fee, fulfillment_status
  )
  VALUES (
    p_user_id, p_tool_id, p_hardware_id, p_tool_price, p_currency, 'wallet', ref,
    ord_num, 'completed', NOW(), p_platform_fee,
    CASE WHEN tool_row.fulfillment_mode = 'manual' THEN 'awaiting'::text ELSE NULL END
  )
  RETURNING id INTO pay_id;

  INSERT INTO wallet_transactions (user_id, type, amount, balance_after, currency, description, payment_id)
  VALUES (p_user_id, 'purchase', -p_tool_price, new_balance + p_platform_fee, p_currency,
    'Order ' || ord_num || ': ' || tool_row.name, pay_id);

  IF p_platform_fee > 0 THEN
    INSERT INTO wallet_transactions (user_id, type, amount, balance_after, currency, description, payment_id)
    VALUES (p_user_id, 'platform_fee', -p_platform_fee, new_balance, p_currency,
      'Platform fee (' || ord_num || ')', pay_id);
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'payment_id', pay_id,
    'reference', ref,
    'order_number', ord_num,
    'balance', new_balance,
    'fulfillment_mode', tool_row.fulfillment_mode
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Reject order and refund wallet (tool price + platform fee)
CREATE OR REPLACE FUNCTION refund_wallet_payment(
  p_payment_id UUID,
  p_admin_note TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  p payments;
  w user_wallets;
  refund_amount DECIMAL(10, 2);
  new_balance DECIMAL(10, 2);
  tool_name TEXT;
BEGIN
  SELECT * INTO p FROM payments WHERE id = p_payment_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Order not found');
  END IF;

  IF p.status = 'refunded' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Order already refunded');
  END IF;

  IF p.status <> 'completed' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Only completed orders can be rejected');
  END IF;

  IF p.provider IS DISTINCT FROM 'wallet' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Only wallet orders can be refunded automatically');
  END IF;

  IF p.user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'No customer linked to this order');
  END IF;

  refund_amount := p.amount + COALESCE(p.platform_fee, 0);

  PERFORM ensure_user_wallet(p.user_id);

  UPDATE user_wallets
  SET balance = balance + refund_amount, updated_at = NOW()
  WHERE user_id = p.user_id
  RETURNING balance INTO new_balance;

  DELETE FROM activations WHERE payment_id = p_payment_id;

  UPDATE payments
  SET status = 'refunded',
      fulfillment_status = NULL,
      refund_note = NULLIF(trim(p_admin_note), ''),
      refunded_at = NOW()
  WHERE id = p_payment_id;

  SELECT name INTO tool_name FROM tools WHERE id = p.tool_id;

  INSERT INTO wallet_transactions (user_id, type, amount, balance_after, currency, description, payment_id)
  VALUES (
    p.user_id, 'refund', refund_amount, new_balance, p.currency,
    'Refund for order ' || p.order_number || ': ' || COALESCE(tool_name, 'activation'),
    p_payment_id
  );

  RETURN jsonb_build_object(
    'ok', true,
    'balance', new_balance,
    'refund_amount', refund_amount,
    'order_number', p.order_number
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
