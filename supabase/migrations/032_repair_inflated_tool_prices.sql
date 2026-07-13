-- OPTIONAL: undo prices accidentally scaled by ~FX^2 when ZMW amounts were treated as USD
-- and re-saved after display conversion. Review a few rows before running in production.
--
-- Example: original K100 -> shown as $100 (international) -> shown as K1804 (ZMW) -> saved as 1804
--          -> K1804 * 18.04 again on next ZMW view. Dividing twice by the stored rate recovers ~K100.
--
-- To run: execute this migration only if your catalog prices look ~325x too high (rate^2).

DO $$
DECLARE
  fx NUMERIC;
BEGIN
  SELECT (setting_value->>'usd_to_zmw_rate')::numeric INTO fx
  FROM site_settings
  WHERE setting_key = 'currency'
  LIMIT 1;

  IF fx IS NULL OR fx <= 0 THEN
    fx := 18.04;
  END IF;

  UPDATE tools
  SET
    retail_price = ROUND((retail_price / fx / fx)::numeric, 2),
    wholesale_cost = ROUND((wholesale_cost / fx / fx)::numeric, 2),
    price_currency = 'ZMW'
  WHERE price_currency = 'ZMW'
    AND retail_price >= fx * fx;
END $$;
