ALTER TABLE tickets
  ADD COLUMN IF NOT EXISTS category VARCHAR(50);

CREATE INDEX IF NOT EXISTS idx_tickets_category ON tickets(category);
