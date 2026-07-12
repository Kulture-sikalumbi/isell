-- Windows/Mac download links per tool (category) + homepage featured tools

ALTER TABLE tool_categories
  ADD COLUMN IF NOT EXISTS download_url_mac TEXT,
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS featured_sort_order INT NOT NULL DEFAULT 0;

COMMENT ON COLUMN tool_categories.download_url IS 'Windows tool download URL';
COMMENT ON COLUMN tool_categories.download_url_mac IS 'Mac tool download URL';
COMMENT ON COLUMN tool_categories.is_featured IS 'Show on homepage Featured Tools section';
COMMENT ON COLUMN tool_categories.featured_sort_order IS 'Homepage featured order (lower first)';

CREATE INDEX IF NOT EXISTS idx_tool_categories_featured
  ON tool_categories (is_featured, featured_sort_order)
  WHERE is_featured = true;
