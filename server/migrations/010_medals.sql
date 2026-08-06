-- Medal tiers, distance options, and purchases
CREATE TABLE IF NOT EXISTS medal_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  benefits JSONB NOT NULL DEFAULT '[]',
  image_url TEXT,
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS medal_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_id UUID NOT NULL REFERENCES medal_tiers(id) ON DELETE CASCADE,
  distance_km INT NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  capacity INT,
  is_active BOOLEAN DEFAULT true,
  UNIQUE (tier_id, distance_km)
);

CREATE TABLE IF NOT EXISTS medal_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  medal_option_id UUID NOT NULL REFERENCES medal_options(id) ON DELETE RESTRICT,
  purchase_batch_id UUID,
  buyer_name VARCHAR(150),
  phone VARCHAR(20),
  email VARCHAR(150),
  payment_provider VARCHAR(20),
  payment_status VARCHAR(20) DEFAULT 'pending',
  mpesa_receipt VARCHAR(100),
  checkout_request_id VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_medal_tiers_active ON medal_tiers(is_active);
CREATE INDEX IF NOT EXISTS idx_medal_tiers_sort ON medal_tiers(sort_order);
CREATE INDEX IF NOT EXISTS idx_medal_options_tier ON medal_options(tier_id);
CREATE INDEX IF NOT EXISTS idx_medal_purchases_user ON medal_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_medal_purchases_option ON medal_purchases(medal_option_id);
CREATE INDEX IF NOT EXISTS idx_medal_purchases_batch ON medal_purchases(purchase_batch_id);
CREATE INDEX IF NOT EXISTS idx_medal_purchases_checkout ON medal_purchases(checkout_request_id);
CREATE INDEX IF NOT EXISTS idx_medal_purchases_email ON medal_purchases(email);

INSERT INTO medal_tiers (slug, name, description, benefits, sort_order)
VALUES
  (
    'bronze',
    'Bronze',
    'Start your TRFC challenge journey with the Bronze medal.',
    '["Official Bronze medal", "Finisher recognition", "Digital challenge badge"]'::jsonb,
    1
  ),
  (
    'silver',
    'Silver',
    'Step up with the Silver medal for dedicated distance runners.',
    '["Official Silver medal", "Finisher recognition", "Digital challenge badge", "Priority event updates"]'::jsonb,
    2
  ),
  (
    'gold',
    'Gold',
    'The Gold medal for runners chasing the longest challenge distances.',
    '["Official Gold medal", "Finisher recognition", "Digital challenge badge", "Priority event updates", "Club recognition"]'::jsonb,
    3
  )
ON CONFLICT (slug) DO NOTHING;

INSERT INTO medal_options (tier_id, distance_km, price, capacity)
SELECT t.id, v.distance_km, v.price, NULL
FROM medal_tiers t
JOIN (
  VALUES
    ('bronze', 10, 1500.00),
    ('bronze', 15, 2000.00),
    ('silver', 10, 2500.00),
    ('silver', 15, 3000.00),
    ('gold', 10, 4000.00),
    ('gold', 15, 5000.00)
) AS v(slug, distance_km, price) ON t.slug = v.slug
ON CONFLICT (tier_id, distance_km) DO NOTHING;
