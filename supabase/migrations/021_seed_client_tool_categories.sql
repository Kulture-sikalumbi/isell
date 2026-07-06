-- Client tool catalog (parent groups / "tools" in admin UI)
-- Safe to re-run: ON CONFLICT (slug) DO NOTHING
-- Run AFTER 020_tool_categories.sql

INSERT INTO tool_categories (slug, name, sort_order, is_active)
VALUES
  ('check-smd-a12', 'Check SMD A12', 1, true),
  ('hfz-a12', 'HFZ A12', 2, true),
  ('mega-unlocker-mdm', 'Mega Unlocker MDM', 3, true),
  ('samsung-remotely', 'Samsung Remotely', 4, true),
  ('bypass-offers', 'Bypass Offers', 5, true),
  ('hfz-iwatch-off-service', 'HFZ iWatch Off Service', 6, true),
  ('iactivator-open-menu', 'iActivator Open Menu', 7, true),
  ('removal-pro', 'Removal Pro', 8, true)
ON CONFLICT (slug) DO NOTHING;
