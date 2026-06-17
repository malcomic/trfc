CREATE TABLE IF NOT EXISTS site_typography (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  display_font VARCHAR(100) NOT NULL DEFAULT 'Bebas Neue',
  body_font VARCHAR(100) NOT NULL DEFAULT 'Barlow',
  condensed_font VARCHAR(100) NOT NULL DEFAULT 'Barlow Condensed',
  sans_font VARCHAR(100) NOT NULL DEFAULT 'Inter',
  updated_at TIMESTAMP DEFAULT NOW(),
  updated_by UUID REFERENCES users(id)
);

INSERT INTO site_typography (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
