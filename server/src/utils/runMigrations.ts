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
