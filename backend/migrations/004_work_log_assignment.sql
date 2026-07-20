ALTER TABLE work_logs
  ADD COLUMN IF NOT EXISTS assignee_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS status VARCHAR(50) NOT NULL DEFAULT 'queued',
  ADD COLUMN IF NOT EXISTS reject_reason TEXT;

UPDATE work_logs
SET assignee_id = author_id
WHERE assignee_id IS NULL;

ALTER TABLE work_logs
  ALTER COLUMN assignee_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_work_logs_assignee ON work_logs(assignee_id);
CREATE INDEX IF NOT EXISTS idx_work_logs_status ON work_logs(status);
