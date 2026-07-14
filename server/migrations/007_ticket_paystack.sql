-- Paystack ticket payments: guest email + payment provider
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS email VARCHAR(150);
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS payment_provider VARCHAR(20);
CREATE INDEX IF NOT EXISTS idx_tickets_email ON tickets(email);
