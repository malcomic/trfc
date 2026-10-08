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
  {
    name: '013_event_ticket_types',
    sql: `
      CREATE TABLE IF NOT EXISTS event_ticket_types (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        price NUMERIC(10,2) NOT NULL,
        capacity INT,
        sort_order INT DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE (event_id, name)
      );

      CREATE INDEX IF NOT EXISTS idx_event_ticket_types_event ON event_ticket_types(event_id);
      CREATE INDEX IF NOT EXISTS idx_event_ticket_types_active ON event_ticket_types(is_active);

      ALTER TABLE tickets
        ADD COLUMN IF NOT EXISTS ticket_type_id UUID REFERENCES event_ticket_types(id) ON DELETE RESTRICT,
        ADD COLUMN IF NOT EXISTS unit_price NUMERIC(10,2);

      CREATE INDEX IF NOT EXISTS idx_tickets_ticket_type ON tickets(ticket_type_id);

      INSERT INTO event_ticket_types (event_id, name, price, capacity, sort_order, is_active)
      SELECT e.id, 'General Admission', COALESCE(e.price, 0), e.capacity, 0, true
      FROM events e
      WHERE NOT EXISTS (
        SELECT 1 FROM event_ticket_types t WHERE t.event_id = e.id
      );

      UPDATE tickets t
      SET
        ticket_type_id = ett.id,
        unit_price = COALESCE(t.unit_price, ett.price)
      FROM event_ticket_types ett
      WHERE t.event_id = ett.event_id
        AND ett.name = 'General Admission'
        AND t.ticket_type_id IS NULL;
    `,
  },
  {
    name: '014_onboarding_signups',
    sql: `
      ALTER TABLE users ALTER COLUMN email DROP NOT NULL;
      ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS whatsapp VARCHAR(20),
        ADD COLUMN IF NOT EXISTS source VARCHAR(20) DEFAULT 'website',
        ADD COLUMN IF NOT EXISTS access_tier VARCHAR(10) DEFAULT 'free',
        ADD COLUMN IF NOT EXISTS plus_purchased_at TIMESTAMP,
        ADD COLUMN IF NOT EXISTS elite_expires_at TIMESTAMP,
        ADD COLUMN IF NOT EXISTS phone_normalized VARCHAR(15);

      UPDATE users
      SET phone_normalized = CASE
        WHEN regexp_replace(phone, '\\D', '', 'g') ~ '^254[17][0-9]{8}$'
          THEN regexp_replace(phone, '\\D', '', 'g')
        WHEN regexp_replace(phone, '\\D', '', 'g') ~ '^0[17][0-9]{8}$'
          THEN '254' || substring(regexp_replace(phone, '\\D', '', 'g') FROM 2)
        WHEN regexp_replace(phone, '\\D', '', 'g') ~ '^[17][0-9]{8}$'
          THEN '254' || regexp_replace(phone, '\\D', '', 'g')
        ELSE NULL
      END
      WHERE phone_normalized IS NULL AND phone IS NOT NULL;

      CREATE INDEX IF NOT EXISTS idx_users_phone_normalized ON users(phone_normalized);

      CREATE TABLE IF NOT EXISTS signups (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        program VARCHAR(20) NOT NULL,
        tier VARCHAR(10) NOT NULL,
        is_returning BOOLEAN DEFAULT false,
        amount INT NOT NULL DEFAULT 0,
        payment_status VARCHAR(20) NOT NULL DEFAULT 'n/a',
        checkout_request_id VARCHAR(100),
        mpesa_receipt VARCHAR(100),
        whatsapp_sent_at TIMESTAMP,
        quiz_answers JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_signups_user ON signups(user_id);
      CREATE INDEX IF NOT EXISTS idx_signups_checkout ON signups(checkout_request_id);
      CREATE INDEX IF NOT EXISTS idx_signups_created ON signups(created_at);
      CREATE INDEX IF NOT EXISTS idx_signups_program_tier ON signups(program, tier);
    `,
  },
  {
    name: '015_product_categories',
    sql: `
      CREATE TABLE IF NOT EXISTS product_categories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        slug VARCHAR(80) UNIQUE NOT NULL,
        name VARCHAR(50) NOT NULL,
        description TEXT,
        image_url TEXT,
        sort_order INT DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_product_categories_active
        ON product_categories(is_active, sort_order);

      ALTER TABLE products
        ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES product_categories(id) ON DELETE SET NULL;
      CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);

      INSERT INTO product_categories (slug, name)
      SELECT DISTINCT ON (s.slug) s.slug, s.name
      FROM (
        SELECT
          trim(both '-' from lower(regexp_replace(trim(category), '[^a-zA-Z0-9]+', '-', 'g'))) AS slug,
          initcap(trim(category)) AS name
        FROM products
        WHERE category IS NOT NULL AND trim(category) <> ''
      ) s
      WHERE s.slug <> ''
      ORDER BY s.slug, s.name
      ON CONFLICT (slug) DO NOTHING;

      UPDATE products p
      SET category_id = c.id
      FROM product_categories c
      WHERE p.category_id IS NULL
        AND p.category IS NOT NULL
        AND c.slug = trim(both '-' from lower(regexp_replace(trim(p.category), '[^a-zA-Z0-9]+', '-', 'g')));
    `,
  },
  {
    name: '016_flash_sales',
    sql: `
      ALTER TABLE tickets ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;
      ALTER TABLE tickets ALTER COLUMN paid_at TYPE TIMESTAMPTZ;
      UPDATE tickets SET paid_at = created_at WHERE payment_status = 'paid' AND paid_at IS NULL;

      CREATE OR REPLACE FUNCTION set_ticket_paid_at() RETURNS trigger AS $fn$
      BEGIN
        IF NEW.payment_status = 'paid'
           AND OLD.payment_status IS DISTINCT FROM 'paid'
           AND NEW.paid_at IS NULL THEN
          NEW.paid_at := NOW();
        END IF;
        RETURN NEW;
      END;
      $fn$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS trg_ticket_paid_at ON tickets;
      CREATE TRIGGER trg_ticket_paid_at BEFORE UPDATE ON tickets
        FOR EACH ROW EXECUTE FUNCTION set_ticket_paid_at();
      CREATE INDEX IF NOT EXISTS idx_tickets_paid_at ON tickets(paid_at);

      CREATE TABLE IF NOT EXISTS flash_sales (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        sale_price NUMERIC(10,2) NOT NULL CHECK (sale_price >= 0),
        quantity_limit INT CHECK (quantity_limit IS NULL OR quantity_limit > 0),
        starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        ends_at TIMESTAMPTZ,
        sort_order INT DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      ALTER TABLE flash_sales
        ALTER COLUMN starts_at TYPE TIMESTAMPTZ,
        ALTER COLUMN ends_at TYPE TIMESTAMPTZ;
      CREATE INDEX IF NOT EXISTS idx_flash_sales_live ON flash_sales(is_active, starts_at, ends_at);

      ALTER TABLE order_items
        ADD COLUMN IF NOT EXISTS flash_sale_id UUID REFERENCES flash_sales(id) ON DELETE SET NULL;
      CREATE INDEX IF NOT EXISTS idx_order_items_flash_sale ON order_items(flash_sale_id);
    `,
  },
  {
    name: '017_order_email',
    sql: `
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS email VARCHAR(150);
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS confirmation_email_sent_at TIMESTAMPTZ;
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS stock_decremented_at TIMESTAMPTZ;
      UPDATE orders SET stock_decremented_at = created_at
        WHERE payment_status = 'paid' AND stock_decremented_at IS NULL;
    `,
  },
  {
    name: '018_product_variants',
    sql: `
      CREATE TABLE IF NOT EXISTS product_variants (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        size VARCHAR(20) NOT NULL,
        stock INT NOT NULL DEFAULT 0 CHECK (stock >= 0),
        sort_order INT NOT NULL DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE (product_id, size)
      );
      CREATE INDEX IF NOT EXISTS idx_product_variants_product ON product_variants(product_id, is_active);

      ALTER TABLE products ADD COLUMN IF NOT EXISTS distance_options JSONB NOT NULL DEFAULT '[]';

      ALTER TABLE order_items
        ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS size VARCHAR(20),
        ADD COLUMN IF NOT EXISTS distance VARCHAR(20);
      CREATE INDEX IF NOT EXISTS idx_order_items_variant ON order_items(variant_id);
    `,
  },
  {
    name: '019_flash_reminder_emails',
    sql: `
      CREATE TABLE IF NOT EXISTS flash_reminder_emails (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(150) NOT NULL,
        ticket_id UUID REFERENCES tickets(id) ON DELETE SET NULL,
        stage SMALLINT NOT NULL CHECK (stage BETWEEN 1 AND 3),
        status VARCHAR(20) NOT NULL DEFAULT 'sending',
        error TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        sent_at TIMESTAMPTZ
      );
    `,
  },
  {
    name: '020_flash_reminder_per_ticket',
    sql: `
      DROP INDEX IF EXISTS uq_flash_reminder_email_stage;
      CREATE UNIQUE INDEX IF NOT EXISTS uq_flash_reminder_ticket_stage
        ON flash_reminder_emails (ticket_id, stage);
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
