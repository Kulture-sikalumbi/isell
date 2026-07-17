-- Safety migration for environments that missed icon_url rollout
ALTER TABLE tool_categories
  ADD COLUMN IF NOT EXISTS icon_url TEXT;

COMMENT ON COLUMN tool_categories.icon_url IS 'Optional image URL for category card logo';
