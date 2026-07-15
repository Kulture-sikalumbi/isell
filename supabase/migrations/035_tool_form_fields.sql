-- Customizable customer checkout form fields per tool/device

ALTER TABLE tools
  ADD COLUMN IF NOT EXISTS form_fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS form_help_title TEXT;

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS checkout_fields JSONB;

COMMENT ON COLUMN tools.form_fields IS
  'Customer checkout inputs: [{id, label, placeholder, hint, required}]';
COMMENT ON COLUMN tools.form_help_title IS
  'Optional title above help instructions on the device page';
COMMENT ON COLUMN payments.checkout_fields IS
  'Submitted checkout values: [{id, label, value}]';

-- Backfill a single field from legacy identifier_* columns where form_fields is empty
UPDATE tools
SET form_fields = jsonb_build_array(
  jsonb_build_object(
    'id', 'primary',
    'label', COALESCE(NULLIF(trim(identifier_label), ''), 'IMEI'),
    'placeholder', COALESCE(
      NULLIF(trim(identifier_placeholder), ''),
      'Enter 15-digit IMEI (dial *#06# on the phone)'
    ),
    'hint', CASE
      WHEN lower(COALESCE(NULLIF(trim(identifier_label), ''), 'IMEI')) IN ('imei', 'ecid', 'device id')
        THEN 'Dial *#06# on the phone or check Settings → About → IMEI'
      ELSE COALESCE(NULLIF(trim(identifier_placeholder), ''), '')
    END,
    'required', true
  )
)
WHERE form_fields IS NULL
   OR form_fields = '[]'::jsonb
   OR jsonb_typeof(form_fields) <> 'array'
   OR jsonb_array_length(form_fields) = 0;
