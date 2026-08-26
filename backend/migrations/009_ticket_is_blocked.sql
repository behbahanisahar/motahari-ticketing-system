-- is_blocked: exclude ticket from average resolution time (admin flag, separate from status)

ALTER TABLE tickets
  ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN NOT NULL DEFAULT false;
