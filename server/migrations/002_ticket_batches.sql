-- Ticket batch payment support
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS purchase_batch_id UUID;
CREATE INDEX IF NOT EXISTS idx_tickets_batch ON tickets(purchase_batch_id);
