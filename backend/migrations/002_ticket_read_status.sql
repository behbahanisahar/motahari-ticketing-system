-- Track last read time per user per ticket for chat notifications
CREATE TABLE IF NOT EXISTS ticket_read_status (
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ticket_id    INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, ticket_id)
);

CREATE INDEX IF NOT EXISTS idx_ticket_read_status_user ON ticket_read_status(user_id);
