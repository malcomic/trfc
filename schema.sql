-- Users
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  phone VARCHAR(20) NOT NULL,
  password_hash TEXT NOT NULL,
  role VARCHAR(20) DEFAULT 'member',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Events
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL,
  description TEXT,
  location VARCHAR(200),
  event_date TIMESTAMP NOT NULL,
  price NUMERIC(10,2) DEFAULT 0,
  capacity INT,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tickets
CREATE TABLE IF NOT EXISTS tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  purchase_batch_id UUID,
  phone VARCHAR(20),
  email VARCHAR(150),
  attendee_name VARCHAR(150),
  payment_provider VARCHAR(20),
  payment_status VARCHAR(20) DEFAULT 'pending',
  mpesa_receipt VARCHAR(100),
  checkout_request_id VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Products
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL,
  stock INT DEFAULT 0,
  category VARCHAR(50),
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Orders
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  total_amount NUMERIC(10,2) NOT NULL,
  payment_status VARCHAR(20) DEFAULT 'pending',
  mpesa_receipt VARCHAR(100),
  checkout_request_id VARCHAR(100),
  phone VARCHAR(20),
  delivery_address TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Order Items
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id),
  product_id UUID REFERENCES products(id),
  quantity INT NOT NULL,
  unit_price NUMERIC(10,2) NOT NULL
);

-- Gallery
CREATE TABLE IF NOT EXISTS gallery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_url TEXT NOT NULL,
  media_type VARCHAR(10) DEFAULT 'image',
  caption TEXT,
  show_on_hero BOOLEAN DEFAULT false,
  hero_sort_order INT DEFAULT 0,
  uploaded_at TIMESTAMP DEFAULT NOW()
);

-- Testimonials
CREATE TABLE IF NOT EXISTS testimonials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_name VARCHAR(100),
  message TEXT NOT NULL,
  rating INT CHECK (rating BETWEEN 1 AND 5),
  is_approved BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Equipment Hire
CREATE TABLE IF NOT EXISTS equipment_hire (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  equipment_name VARCHAR(150),
  package_type VARCHAR(50),
  hire_date DATE NOT NULL,
  return_date DATE NOT NULL,
  total_cost NUMERIC(10,2),
  phone VARCHAR(20),
  payment_status VARCHAR(20) DEFAULT 'pending',
  mpesa_receipt VARCHAR(100),
  checkout_request_id VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Sponsorship Tiers
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

-- Partnerships
CREATE TABLE IF NOT EXISTS partnerships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name VARCHAR(200),
  contact_person VARCHAR(100),
  email VARCHAR(150),
  phone VARCHAR(20),
  tier VARCHAR(50),
  message TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Site Typography
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

-- Payment Callbacks
CREATE TABLE IF NOT EXISTS payment_callbacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checkout_request_id VARCHAR(100) UNIQUE NOT NULL,
  mpesa_receipt_number VARCHAR(100),
  merchant_request_id VARCHAR(100),
  response_body JSONB,
  payment_status VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create Indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(event_date);
CREATE INDEX IF NOT EXISTS idx_tickets_user ON tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_event ON tickets(event_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_checkout ON orders(checkout_request_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_gallery_type ON gallery(media_type);
CREATE INDEX IF NOT EXISTS idx_gallery_hero ON gallery(hero_sort_order) WHERE show_on_hero = true;
CREATE INDEX IF NOT EXISTS idx_tickets_checkout ON tickets(checkout_request_id);
CREATE INDEX IF NOT EXISTS idx_tickets_email ON tickets(email);
CREATE INDEX IF NOT EXISTS idx_equipment_user ON equipment_hire(user_id);
CREATE INDEX IF NOT EXISTS idx_equipment_checkout ON equipment_hire(checkout_request_id);
CREATE INDEX IF NOT EXISTS idx_tickets_batch ON tickets(purchase_batch_id);
CREATE INDEX IF NOT EXISTS idx_events_active ON events(is_active);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_testimonials_approved ON testimonials(is_approved);
CREATE INDEX IF NOT EXISTS idx_sponsorship_tiers_active ON sponsorship_tiers(is_active);
CREATE INDEX IF NOT EXISTS idx_sponsorship_tiers_sort ON sponsorship_tiers(sort_order);
