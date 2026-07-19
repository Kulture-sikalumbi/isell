-- Store MoMo SMS receipts from the merchant phone so customer TID submit can match instantly.
CREATE TABLE IF NOT EXISTS momo_sms_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id TEXT NOT NULL,
  proof_code TEXT,
  amount NUMERIC(12, 2) NOT NULL,
  method TEXT NOT NULL CHECK (method IN ('mtn', 'airtel')),
  sender TEXT,
  sender_phone TEXT,
  sender_name TEXT,
  raw_message TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  matched_deposit_id UUID REFERENCES wallet_deposits(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT momo_sms_receipts_txn_unique UNIQUE (transaction_id)
);

CREATE INDEX IF NOT EXISTS idx_momo_sms_receipts_unmatched
  ON momo_sms_receipts (method, amount, received_at DESC)
  WHERE matched_deposit_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_momo_sms_receipts_received
  ON momo_sms_receipts (received_at DESC);

CREATE INDEX IF NOT EXISTS idx_momo_sms_receipts_proof_unmatched
  ON momo_sms_receipts (method, proof_code, received_at DESC)
  WHERE matched_deposit_id IS NULL;

ALTER TABLE momo_sms_receipts ENABLE ROW LEVEL SECURITY;

-- Service role only (gateway + server). No public policies.
