-- Tool categories (parent) + tools as device variations (child)

CREATE TABLE IF NOT EXISTS tool_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  download_url TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE tools
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES tool_categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sort_order INT NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_tools_category ON tools(category_id);
CREATE INDEX IF NOT EXISTS idx_tool_categories_sort ON tool_categories(sort_order, name);

-- Backfill existing tools into a default category
INSERT INTO tool_categories (slug, name, description, sort_order)
VALUES ('general', 'General', 'Tools awaiting category assignment', 9999)
ON CONFLICT (slug) DO NOTHING;

UPDATE tools
SET category_id = (SELECT id FROM tool_categories WHERE slug = 'general' LIMIT 1)
WHERE category_id IS NULL;

ALTER TABLE tool_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active tool categories"
  ON tool_categories FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins manage tool categories"
  ON tool_categories FOR ALL
  USING (public.is_admin());

COMMENT ON TABLE tool_categories IS 'Parent grouping — e.g. SMD Bypass iCloud [iPhone - iPad]';
COMMENT ON COLUMN tools.category_id IS 'Variation belongs to this category; each tool row is one device/price variant';
