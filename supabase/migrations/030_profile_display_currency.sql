-- User-chosen display currency (ZMW for Zambia, USD for international)

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS display_currency TEXT
    CHECK (display_currency IS NULL OR display_currency IN ('ZMW', 'USD'));

COMMENT ON COLUMN profiles.display_currency IS 'Customer wallet/pricing currency — set on first login, changeable from menu';
