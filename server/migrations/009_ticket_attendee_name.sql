-- Store buyer/attendee name on each ticket (guest and authenticated purchases)
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS attendee_name VARCHAR(150);
