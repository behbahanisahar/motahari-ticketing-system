const db = require("./db");

async function columnExists(tableName, columnName) {
  const result = await db.query(
    `SELECT 1
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = $1
       AND column_name = $2
     LIMIT 1`,
    [tableName, columnName]
  );
  return result.rows.length > 0;
}

async function indexExists(indexName) {
  const result = await db.query(
    `SELECT 1
     FROM pg_class c
     JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE c.relkind = 'i'
       AND n.nspname = 'public'
       AND c.relname = $1
     LIMIT 1`,
    [indexName]
  );
  return result.rows.length > 0;
}

async function ensureSchema() {
  // Never block server startup on migration privileges.
  try {
    const hasCategory = await columnExists("tickets", "category");
    if (!hasCategory) {
      try {
        await db.query(`ALTER TABLE tickets ADD COLUMN category VARCHAR(50)`);
        console.log("Added tickets.category column");
      } catch (err) {
        console.warn(
          "Could not add tickets.category automatically:",
          err.message,
          "\nIf the column is missing, run as table owner:\n" +
            "  ALTER TABLE tickets ADD COLUMN IF NOT EXISTS category VARCHAR(50);"
        );
      }
    }
  } catch (err) {
    console.warn("Schema check for tickets.category failed:", err.message);
  }

  try {
    const hasIndex = await indexExists("idx_tickets_category");
    if (!hasIndex) {
      try {
        await db.query(`CREATE INDEX IF NOT EXISTS idx_tickets_category ON tickets(category)`);
      } catch (err) {
        console.warn("Could not create idx_tickets_category:", err.message);
      }
    }
  } catch (err) {
    console.warn("Schema check for idx_tickets_category failed:", err.message);
  }
}

module.exports = { ensureSchema };
