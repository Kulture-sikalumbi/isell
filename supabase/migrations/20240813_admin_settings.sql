-- Admin settings table for auto-clear, rate limits, etc.
CREATE TABLE IF NOT EXISTS admin_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text,
  updated_at timestamptz DEFAULT now()
);

-- Settings we'll use:
-- key: "auto_clear_chat_days" -> value: "30" (or NULL to disable)
-- key: "auto_clear_images" -> value: "true" (delete images when messages are deleted)

-- Initial defaults
INSERT INTO admin_settings (key, value) VALUES
  ('auto_clear_chat_days', NULL),
  ('auto_clear_images', 'true')
ON CONFLICT (key) DO NOTHING;

-- Scheduled function to clean up old messages
-- Run daily via pg_cron (must be enabled in Supabase)
CREATE OR REPLACE FUNCTION cleanup_old_support_messages()
RETURNS void AS $$
DECLARE
  days_old INTEGER;
BEGIN
  -- Get the setting
  SELECT (value::INTEGER) INTO days_old
  FROM admin_settings
  WHERE key = 'auto_clear_chat_days' AND value IS NOT NULL;
  
  IF days_old IS NULL THEN
    RETURN; -- Auto-clear disabled
  END IF;
  
  -- Mark old messages as deleted_for_all
  UPDATE support_messages
  SET 
    deleted_for_all = true,
    body = NULL,
    image_url = NULL,
    tool_id = NULL,
    updated_at = now()
  WHERE created_at < now() - (days_old || ' days')::INTERVAL
    AND deleted_for_all = false;
END;
$$ LANGUAGE plpgsql;

-- Note: To schedule this, run in Supabase SQL Editor:
-- SELECT cron.schedule('cleanup-old-chats', '0 2 * * *', 'SELECT cleanup_old_support_messages()');
-- This runs daily at 2 AM UTC

-- For manual testing:
-- SELECT cleanup_old_support_messages();
