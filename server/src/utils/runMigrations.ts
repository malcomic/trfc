import { query } from '../config/db.js'

const MIGRATIONS: { name: string; sql: string }[] = [
  {
    name: '001_guest_commerce',
    sql: `
      ALTER TABLE tickets ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
      ALTER TABLE tickets ADD COLUMN IF NOT EXISTS checkout_request_id VARCHAR(100);
      ALTER TABLE tickets ADD COLUMN IF NOT EXISTS purchase_batch_id UUID;
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS checkout_request_id VARCHAR(100);
      ALTER TABLE equipment_hire ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
      ALTER TABLE equipment_hire ADD COLUMN IF NOT EXISTS mpesa_receipt VARCHAR(100);
      ALTER TABLE equipment_hire ADD COLUMN IF NOT EXISTS checkout_request_id VARCHAR(100);
      CREATE INDEX IF NOT EXISTS idx_tickets_batch ON tickets(purchase_batch_id);
    `,
  },
  {
    name: '002_ticket_batches',
    sql: `
      ALTER TABLE tickets ADD COLUMN IF NOT EXISTS purchase_batch_id UUID;
      CREATE INDEX IF NOT EXISTS idx_tickets_batch ON tickets(purchase_batch_id);
    `,
  },
  {
    name: '003_sponsorship_tiers',
    sql: `
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
        ('community', 'Community Partner', 'KES 50,000', '["Logo on event banners", "Social media shout-out", "2 complimentary event entries"]'::jsonb, 'Building2', 1),
        ('title', 'Title Sponsor', 'KES 150,000', '["Title naming on one flagship event", "Logo on TRFC merch", "Booth at 3 events", "Newsletter feature"]'::jsonb, 'Megaphone', 2),
        ('premier', 'Premier Partner', 'KES 300,000', '["Season-long brand presence", "Exclusive category naming rights", "Coach-led brand activation", "Priority vendor onboarding"]'::jsonb, 'Crown', 3)
      ON CONFLICT (slug) DO NOTHING;
    `,
  },
  {
    name: '004_payment_callbacks',
    sql: `
      CREATE TABLE IF NOT EXISTS payment_callbacks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        checkout_request_id VARCHAR(100) UNIQUE NOT NULL,
        mpesa_receipt_number VARCHAR(100),
        merchant_request_id VARCHAR(100),
        response_body JSONB,
        payment_status VARCHAR(20),
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_tickets_checkout ON tickets(checkout_request_id);
    `,
  },
  {
    name: '005_gallery_hero',
    sql: `
      ALTER TABLE gallery
        ADD COLUMN IF NOT EXISTS show_on_hero BOOLEAN DEFAULT false,
        ADD COLUMN IF NOT EXISTS hero_sort_order INT DEFAULT 0;
      CREATE INDEX IF NOT EXISTS idx_gallery_hero
        ON gallery (hero_sort_order)
        WHERE show_on_hero = true;
    `,
  },
  {
    name: '006_site_typography',
    sql: `
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
    `,
  },
  {
    name: '007_ticket_paystack',
    sql: `
      ALTER TABLE tickets ADD COLUMN IF NOT EXISTS email VARCHAR(150);
      ALTER TABLE tickets ADD COLUMN IF NOT EXISTS payment_provider VARCHAR(20);
      CREATE INDEX IF NOT EXISTS idx_tickets_email ON tickets(email);
    `,
  },
  {
    name: '008_fail_pending_paystack_tickets',
    sql: `
      UPDATE tickets
      SET payment_status = 'failed'
      WHERE payment_provider = 'paystack'
        AND payment_status = 'pending';
    `,
  },
  {
    name: '009_ticket_attendee_name',
    sql: `
      ALTER TABLE tickets ADD COLUMN IF NOT EXISTS attendee_name VARCHAR(150);
    `,
  },
  {
    name: '010_medals',
    sql: `
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
        ('bronze', 'Bronze', 'Start your TRFC challenge journey with the Bronze medal.', '["Official Bronze medal", "Finisher recognition", "Digital challenge badge"]'::jsonb, 1),
        ('silver', 'Silver', 'Step up with the Silver medal for dedicated distance runners.', '["Official Silver medal", "Finisher recognition", "Digital challenge badge", "Priority event updates"]'::jsonb, 2),
        ('gold', 'Gold', 'The Gold medal for runners chasing the longest challenge distances.', '["Official Gold medal", "Finisher recognition", "Digital challenge badge", "Priority event updates", "Club recognition"]'::jsonb, 3)
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
    `,
  },
  {
    name: '011_scan_checkin',
    sql: `
      ALTER TABLE tickets
        ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS checked_in_by UUID REFERENCES users(id);
      ALTER TABLE medal_purchases
        ADD COLUMN IF NOT EXISTS redeemed_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS redeemed_by UUID REFERENCES users(id);
      CREATE INDEX IF NOT EXISTS idx_tickets_checked_in ON tickets(checked_in_at);
      CREATE INDEX IF NOT EXISTS idx_medal_purchases_redeemed ON medal_purchases(redeemed_at);
    `,
  },
  {
    name: '012_analytics_indexes',
    sql: `
      CREATE INDEX IF NOT EXISTS idx_orders_payment_created ON orders(payment_status, created_at);
      CREATE INDEX IF NOT EXISTS idx_tickets_payment_created ON tickets(payment_status, created_at);
      CREATE INDEX IF NOT EXISTS idx_equipment_hire_payment_created ON equipment_hire(payment_status, created_at);
      CREATE INDEX IF NOT EXISTS idx_medal_purchases_payment_created ON medal_purchases(payment_status, created_at);
      CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
    `,
  },
]

export async function runMigrations() {
  for (const migration of MIGRATIONS) {
    try {
      await query(migration.sql)
      console.log(`✓ Migration applied: ${migration.name}`)
    } catch (error) {
      console.error(`✗ Migration failed: ${migration.name}`, error)
      throw error
    }
  }
}
