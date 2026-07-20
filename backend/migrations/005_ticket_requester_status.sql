-- Separate requester-defined status from IT follow-up status
ALTER TABLE tickets
  ADD COLUMN IF NOT EXISTS requester_status VARCHAR(20) NOT NULL DEFAULT 'queued';

UPDATE tickets SET requester_status = status;

CREATE INDEX IF NOT EXISTS idx_tickets_requester_status ON tickets(requester_status);
