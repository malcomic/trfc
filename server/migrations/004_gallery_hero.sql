ALTER TABLE gallery
  ADD COLUMN IF NOT EXISTS show_on_hero BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS hero_sort_order INT DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_gallery_hero
  ON gallery (hero_sort_order)
  WHERE show_on_hero = true;
