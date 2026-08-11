-- Ticketing System Database Schema

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  username      VARCHAR(100) UNIQUE NOT NULL,
  display_name  VARCHAR(200) NOT NULL,
  department    VARCHAR(150),
  role          VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  password_hash VARCHAR(255) NOT NULL,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_by    INTEGER REFERENCES users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login    TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS teams (
  id    SERIAL PRIMARY KEY,
  name  VARCHAR(150) UNIQUE NOT NULL
);

CREATE SEQUENCE IF NOT EXISTS ticket_number_seq START 1000;

CREATE TABLE IF NOT EXISTS tickets (
  id             SERIAL PRIMARY KEY,
  ticket_number  VARCHAR(20) UNIQUE NOT NULL DEFAULT ('T-' || nextval('ticket_number_seq')),
  requester_id   INTEGER NOT NULL REFERENCES users(id),
  subject        VARCHAR(300) NOT NULL,
  description    TEXT NOT NULL,
  team           VARCHAR(150) NOT NULL,
  computer_name  VARCHAR(150) NOT NULL,
  requester_priority VARCHAR(20) NOT NULL DEFAULT 'medium',
  priority       VARCHAR(20) NOT NULL DEFAULT 'medium',
  category       VARCHAR(50),
  requester_status VARCHAR(20) NOT NULL DEFAULT 'queued',
  status         VARCHAR(20) NOT NULL DEFAULT 'queued',
  assigned_to    INTEGER REFERENCES users(id),
  closed_at      TIMESTAMPTZ,
  screenshot_filename VARCHAR(255),
  screenshot_original_name VARCHAR(255),
  screenshot_mime VARCHAR(100),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_requester_status ON tickets(requester_status);
CREATE INDEX IF NOT EXISTS idx_tickets_priority ON tickets(priority);
CREATE INDEX IF NOT EXISTS idx_tickets_requester_priority ON tickets(requester_priority);
CREATE INDEX IF NOT EXISTS idx_tickets_category ON tickets(category);
CREATE INDEX IF NOT EXISTS idx_tickets_requester ON tickets(requester_id);
CREATE INDEX IF NOT EXISTS idx_tickets_assigned ON tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tickets_created ON tickets(created_at);
CREATE INDEX IF NOT EXISTS idx_tickets_closed_at ON tickets(closed_at);

CREATE TABLE IF NOT EXISTS ticket_comments (
  id          SERIAL PRIMARY KEY,
  ticket_id   INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  author_id   INTEGER NOT NULL REFERENCES users(id),
  body        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ticket_read_status (
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ticket_id    INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, ticket_id)
);

CREATE INDEX IF NOT EXISTS idx_ticket_read_status_user ON ticket_read_status(user_id);

CREATE TABLE IF NOT EXISTS work_logs (
  id               SERIAL PRIMARY KEY,
  author_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assignee_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title            VARCHAR(300) NOT NULL,
  description      TEXT,
  category         VARCHAR(50) NOT NULL DEFAULT 'other',
  status           VARCHAR(30) NOT NULL DEFAULT 'queued',
  reject_reason    TEXT,
  work_date        DATE NOT NULL DEFAULT CURRENT_DATE,
  duration_minutes INTEGER,
  ticket_id        INTEGER REFERENCES tickets(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_work_logs_date ON work_logs(work_date DESC);
CREATE INDEX IF NOT EXISTS idx_work_logs_author ON work_logs(author_id);
CREATE INDEX IF NOT EXISTS idx_work_logs_assignee ON work_logs(assignee_id);
CREATE INDEX IF NOT EXISTS idx_work_logs_category ON work_logs(category);
CREATE INDEX IF NOT EXISTS idx_work_logs_status ON work_logs(status);

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_work_logs_updated_at ON work_logs;
CREATE TRIGGER trg_work_logs_updated_at
  BEFORE UPDATE ON work_logs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_tickets_updated_at ON tickets;
CREATE TRIGGER trg_tickets_updated_at
  BEFORE UPDATE ON tickets
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

UPDATE tickets SET status = 'queued' WHERE status = 'open';
UPDATE tickets SET status = 'done' WHERE status IN ('resolved', 'closed');
