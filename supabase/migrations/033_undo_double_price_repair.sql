-- Undo ONE extra division from accidentally running 032_repair_inflated_tool_prices.sql twice.
--
-- Important: if your prices already look correct (e.g. K50–K500), the second 032 run
-- probably did NOTHING (032 only touches rows where retail_price >= rate^2 ~325).
-- Do NOT run this undo in that case — it would inflate good prices.
--
-- ===== STEP 1: PREVIEW (run in Supabase SQL editor) =====
--
-- WITH fx AS (
--   SELECT COALESCE(
--     (SELECT (setting_value->>'usd_to_zmw_rate')::numeric FROM site_settings WHERE setting_key = 'currency' LIMIT 1),
--     18.04
--   ) AS rate
-- )
-- SELECT t.id, t.name, t.retail_price AS current_price,
--        ROUND((t.retail_price * fx.rate * fx.rate)::numeric, 2) AS if_multiply_once
-- FROM tools t, fx
-- WHERE t.price_currency = 'ZMW'
-- ORDER BY t.name;
--
-- Check tools you know by heart. Only run STEP 2 if current_price is clearly too LOW
-- (e.g. K0.31 or K5 when it should be K100) and if_multiply_once looks right.
--
-- ===== STEP 2: UNDO (multiply by rate^2 once) =====

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
    retail_price = ROUND((retail_price * fx * fx)::numeric, 2),
    wholesale_cost = ROUND((wholesale_cost * fx * fx)::numeric, 2)
  WHERE price_currency = 'ZMW'
    AND retail_price > 0
    AND retail_price < fx;
END $$;
