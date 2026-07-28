const db = require("./db");

async function ensureSchema() {
  await db.query(`
    ALTER TABLE tickets
      ADD COLUMN IF NOT EXISTS category VARCHAR(50)
  `);
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_tickets_category ON tickets(category)
  `);
}

module.exports = { ensureSchema };
