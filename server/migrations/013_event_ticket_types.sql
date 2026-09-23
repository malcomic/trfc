-- Multiple ticket types per event (each with its own price/capacity)
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

-- Backfill: one "General Admission" type per event from legacy events.price / capacity
INSERT INTO event_ticket_types (event_id, name, price, capacity, sort_order, is_active)
SELECT e.id, 'General Admission', COALESCE(e.price, 0), e.capacity, 0, true
FROM events e
WHERE NOT EXISTS (
  SELECT 1 FROM event_ticket_types t WHERE t.event_id = e.id
);

-- Attach existing tickets to the backfilled type and snapshot unit_price
UPDATE tickets t
SET
  ticket_type_id = ett.id,
  unit_price = COALESCE(t.unit_price, ett.price)
FROM event_ticket_types ett
WHERE t.event_id = ett.event_id
  AND ett.name = 'General Admission'
  AND t.ticket_type_id IS NULL;
