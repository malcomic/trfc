-- Phone-based member accounts created by the landing page onboarding flow
ALTER TABLE users ALTER COLUMN email DROP NOT NULL;
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS whatsapp VARCHAR(20),
  ADD COLUMN IF NOT EXISTS source VARCHAR(20) DEFAULT 'website',
  ADD COLUMN IF NOT EXISTS access_tier VARCHAR(10) DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS plus_purchased_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS elite_expires_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS phone_normalized VARCHAR(15);

-- Backfill 2547XXXXXXXX / 2541XXXXXXXX from legacy free-form phone values
UPDATE users
SET phone_normalized = CASE
  WHEN regexp_replace(phone, '\D', '', 'g') ~ '^254[17][0-9]{8}$'
    THEN regexp_replace(phone, '\D', '', 'g')
  WHEN regexp_replace(phone, '\D', '', 'g') ~ '^0[17][0-9]{8}$'
    THEN '254' || substring(regexp_replace(phone, '\D', '', 'g') FROM 2)
  WHEN regexp_replace(phone, '\D', '', 'g') ~ '^[17][0-9]{8}$'
    THEN '254' || regexp_replace(phone, '\D', '', 'g')
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
