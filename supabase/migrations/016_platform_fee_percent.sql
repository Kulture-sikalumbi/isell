-- Per-tool activation service fee % (set by admin). NULL = no fee until admin sets it.

ALTER TABLE tools
  ADD COLUMN IF NOT EXISTS platform_fee_percent DECIMAL(5, 2);

COMMENT ON COLUMN tools.platform_fee_percent IS
  'Admin-set % of retail price charged on activation purchase only (not deposits). NULL = 0% fee.';
