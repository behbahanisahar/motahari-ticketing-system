-- Separate requester-defined priority from IT triage priority
ALTER TABLE tickets
  ADD COLUMN IF NOT EXISTS requester_priority VARCHAR(20) NOT NULL DEFAULT 'medium';

UPDATE tickets SET requester_priority = priority;

CREATE INDEX IF NOT EXISTS idx_tickets_requester_priority ON tickets(requester_priority);
