-- Reset catalog prices so admin can re-enter them after FX repair mistakes.
-- Tools stay in the catalog (names, categories, downloads) — only prices are cleared.

UPDATE tools
SET
  retail_price = 0,
  wholesale_cost = 0,
  price_currency = 'ZMW',
  updated_at = NOW();
