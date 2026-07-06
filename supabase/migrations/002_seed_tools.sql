-- Optional seed data for initial testing
-- Run AFTER 001_initial_schema.sql
-- Safe to re-run: uses ON CONFLICT DO NOTHING
-- Delete tools anytime from Admin → Tools or Supabase Table Editor

INSERT INTO tools (slug, name, description, download_url, retail_price, wholesale_cost, developer_api_url, activation_type_id, identifier_label, is_active)
VALUES
  (
    'phantom-unlock',
    'Phantom Unlock Pro',
    'Professional device unlock suite with instant IMEI-based activation. Supports 200+ chipset models.',
    '#',
    29.99,
    12.50,
    'https://api.phantom.dev/v1/activate',
    'phantom_pro_v3',
    'IMEI',
    true
  ),
  (
    'nexus-bypass',
    'Nexus Bypass Toolkit',
    'Advanced FRP and account bypass utility. Hardware-bound serial activation with cloud sync.',
    '#',
    19.99,
    8.00,
    'https://api.nexustools.io/activate',
    'nexus_bp_2024',
    'Serial Number',
    true
  ),
  (
    'volt-flash',
    'Volt Flash Utility',
    'Fast firmware flashing and repair tool. Device ID activation with lifetime license support.',
    '#',
    39.99,
    18.00,
    'https://api.voltflash.com/v2/license',
    'volt_flash_lifetime',
    'Device ID',
    true
  ),
  (
    'cipher-diag',
    'Cipher Diagnostic Suite',
    'Full diagnostic and repair workstation. ECID-based activation for Apple and Android devices.',
    '#',
    49.99,
    22.00,
    'https://api.cipherdiag.net/activate',
    'cipher_diag_pro',
    'IMEI',
    true
  )
ON CONFLICT (slug) DO NOTHING;

INSERT INTO reseller_credits (developer_name, balance, last_synced_at)
VALUES
  ('Phantom Dev', 1240.50, NOW()),
  ('Nexus Tools', 890.00, NOW()),
  ('Volt Flash', 2100.75, NOW())
ON CONFLICT (developer_name) DO NOTHING;
