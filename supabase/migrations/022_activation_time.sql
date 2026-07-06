-- Per-device expected activation duration (shown to customers at checkout)

ALTER TABLE tools
  ADD COLUMN IF NOT EXISTS activation_time_value INT,
  ADD COLUMN IF NOT EXISTS activation_time_unit TEXT
    CHECK (activation_time_unit IS NULL OR activation_time_unit IN ('minutes', 'hours', 'days'));

COMMENT ON COLUMN tools.activation_time_value IS 'Expected activation time amount — e.g. 5 with unit days';
COMMENT ON COLUMN tools.activation_time_unit IS 'minutes, hours, or days — null with null value means instant';
