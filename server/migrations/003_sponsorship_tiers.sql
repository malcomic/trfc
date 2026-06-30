-- Sponsorship tier definitions (safe to run on existing databases)
CREATE TABLE IF NOT EXISTS sponsorship_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(200) NOT NULL,
  price_display VARCHAR(50) NOT NULL,
  benefits JSONB NOT NULL DEFAULT '[]',
  icon VARCHAR(50) DEFAULT 'Handshake',
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sponsorship_tiers_active ON sponsorship_tiers(is_active);
CREATE INDEX IF NOT EXISTS idx_sponsorship_tiers_sort ON sponsorship_tiers(sort_order);

INSERT INTO sponsorship_tiers (slug, name, price_display, benefits, icon, sort_order)
VALUES
  (
    'community',
    'Community Partner',
    'KES 50,000',
    '["Logo on event banners", "Social media shout-out", "2 complimentary event entries"]'::jsonb,
    'Building2',
    1
  ),
  (
    'title',
    'Title Sponsor',
    'KES 150,000',
    '["Title naming on one flagship event", "Logo on TRFC merch", "Booth at 3 events", "Newsletter feature"]'::jsonb,
    'Megaphone',
    2
  ),
  (
    'premier',
    'Premier Partner',
    'KES 300,000',
    '["Season-long brand presence", "Exclusive category naming rights", "Coach-led brand activation", "Priority vendor onboarding"]'::jsonb,
    'Crown',
    3
  )
ON CONFLICT (slug) DO NOTHING;
