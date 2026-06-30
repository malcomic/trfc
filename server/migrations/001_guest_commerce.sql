-- Guest commerce columns (safe to run on existing databases)
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS checkout_request_id VARCHAR(100);
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS purchase_batch_id UUID;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS checkout_request_id VARCHAR(100);
ALTER TABLE equipment_hire ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
ALTER TABLE equipment_hire ADD COLUMN IF NOT EXISTS mpesa_receipt VARCHAR(100);
ALTER TABLE equipment_hire ADD COLUMN IF NOT EXISTS checkout_request_id VARCHAR(100);
CREATE INDEX IF NOT EXISTS idx_tickets_batch ON tickets(purchase_batch_id);
