CREATE TABLE IF NOT EXISTS work_logs (
  id               SERIAL PRIMARY KEY,
  author_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title            VARCHAR(300) NOT NULL,
  description      TEXT,
  category         VARCHAR(50) NOT NULL DEFAULT 'other',
  work_date        DATE NOT NULL DEFAULT CURRENT_DATE,
  duration_minutes INTEGER,
  ticket_id        INTEGER REFERENCES tickets(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_work_logs_date ON work_logs(work_date DESC);
CREATE INDEX IF NOT EXISTS idx_work_logs_author ON work_logs(author_id);
CREATE INDEX IF NOT EXISTS idx_work_logs_category ON work_logs(category);

DROP TRIGGER IF EXISTS trg_work_logs_updated_at ON work_logs;
CREATE TRIGGER trg_work_logs_updated_at
  BEFORE UPDATE ON work_logs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
