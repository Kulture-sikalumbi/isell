-- Optional logo shown on storefront category cards
ALTER TABLE tool_categories
  ADD COLUMN IF NOT EXISTS icon_url TEXT;

COMMENT ON COLUMN tool_categories.icon_url IS 'Optional image URL for category card logo';
