-- closed_at: when ticket was finished (done/rejected)
-- screenshot_*: optional single image attached at creation

ALTER TABLE tickets ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS screenshot_filename VARCHAR(255);
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS screenshot_original_name VARCHAR(255);
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS screenshot_mime VARCHAR(100);

UPDATE tickets
SET closed_at = updated_at
WHERE status IN ('done', 'rejected')
  AND closed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_tickets_closed_at ON tickets(closed_at);
