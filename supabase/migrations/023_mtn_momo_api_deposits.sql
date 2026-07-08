-- MTN MoMo API-backed wallet deposits metadata

ALTER TABLE wallet_deposits
  ADD COLUMN IF NOT EXISTS provider TEXT,
  ADD COLUMN IF NOT EXISTS provider_reference TEXT,
  ADD COLUMN IF NOT EXISTS provider_status TEXT,
  ADD COLUMN IF NOT EXISTS provider_payload JSONB;

CREATE INDEX IF NOT EXISTS idx_wallet_deposits_provider_ref
  ON wallet_deposits (provider, provider_reference);

COMMENT ON COLUMN wallet_deposits.provider IS 'External payment provider, e.g. mtn_momo';
COMMENT ON COLUMN wallet_deposits.provider_reference IS 'Provider-side transaction/request reference';
COMMENT ON COLUMN wallet_deposits.provider_status IS 'Latest provider transaction state';
COMMENT ON COLUMN wallet_deposits.provider_payload IS 'Raw provider payload for debugging/audit';
