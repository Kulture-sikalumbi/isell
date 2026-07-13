-- Store which currency admin entered for each tool price (display converts on read only).

ALTER TABLE tools
  ADD COLUMN IF NOT EXISTS price_currency TEXT NOT NULL DEFAULT 'ZMW'
    CHECK (price_currency IN ('ZMW', 'USD'));

COMMENT ON COLUMN tools.price_currency IS
  'Currency admin used when setting retail_price/wholesale_cost — never auto-updated on user display preference';
