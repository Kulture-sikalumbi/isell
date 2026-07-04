-- Per-tool dynamic API mapping and user-facing identifier guidance

ALTER TABLE tools
  ADD COLUMN IF NOT EXISTS identifier_instructions TEXT,
  ADD COLUMN IF NOT EXISTS identifier_placeholder TEXT,
  ADD COLUMN IF NOT EXISTS developer_name TEXT,
  ADD COLUMN IF NOT EXISTS api_config JSONB NOT NULL DEFAULT '{
    "method": "POST",
    "auth_type": "bearer",
    "api_key": null,
    "auth_header_name": "X-API-Key",
    "hardware_id_field": "hardware_id",
    "product_id_field": "activation_type_id",
    "reference_field": "reference",
    "include_email": false,
    "email_field": "email",
    "response_code_path": "activation_code",
    "delivery_type": "activation_code",
    "success_message": "Your device has been registered and activated.",
    "on_api_failure": "fail_payment"
  }'::jsonb;

COMMENT ON COLUMN tools.identifier_instructions IS 'Plain-language steps for users to find their device ID before checkout';
COMMENT ON COLUMN tools.api_config IS 'Dynamic developer API mapping — no code changes needed per tool';
