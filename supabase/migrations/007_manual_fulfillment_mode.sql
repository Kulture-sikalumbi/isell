-- Manual vs direct API tool modes + payment fulfillment tracking

CREATE TYPE tool_fulfillment_mode AS ENUM ('manual', 'direct_api');

ALTER TABLE tools
  ADD COLUMN IF NOT EXISTS fulfillment_mode tool_fulfillment_mode NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS external_service_id TEXT,
  ADD COLUMN IF NOT EXISTS external_service_name TEXT;

ALTER TABLE tools
  ALTER COLUMN developer_api_url DROP NOT NULL,
  ALTER COLUMN activation_type_id DROP NOT NULL;

UPDATE tools
SET fulfillment_mode = 'direct_api'
WHERE developer_api_url IS NOT NULL
  AND developer_api_url <> ''
  AND fulfillment_mode = 'manual';

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS fulfillment_status TEXT
  CHECK (fulfillment_status IS NULL OR fulfillment_status IN ('awaiting', 'fulfilled'));

COMMENT ON COLUMN tools.fulfillment_mode IS 'manual = admin processes via khulnaunlockr; direct_api = auto-call developer API';
COMMENT ON COLUMN tools.external_service_id IS 'Matching service ID on khulnaunlockr or upstream platform';
COMMENT ON COLUMN tools.external_service_name IS 'Human-readable upstream service name for admin reference';
COMMENT ON COLUMN payments.fulfillment_status IS 'awaiting = paid, needs admin; fulfilled = activation delivered';
