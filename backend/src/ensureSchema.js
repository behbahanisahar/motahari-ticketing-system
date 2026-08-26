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

async function tryAddColumn(tableName, columnName, sqlType, backfillSql) {
  try {
    const exists = await columnExists(tableName, columnName);
    if (exists) return;
    try {
      await db.query(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${sqlType}`);
      console.log(`Added ${tableName}.${columnName} column`);
      if (backfillSql) {
        await db.query(backfillSql);
      }
    } catch (err) {
      console.warn(
        `Could not add ${tableName}.${columnName} automatically:`,
        err.message,
        `\nIf missing, run as table owner:\n  ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS ${columnName} ${sqlType};`
      );
    }
  } catch (err) {
    console.warn(`Schema check for ${tableName}.${columnName} failed:`, err.message);
  }
}

async function ensureSchema() {
  // Never block server startup on migration privileges.
  await tryAddColumn("tickets", "category", "VARCHAR(50)");

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

  await tryAddColumn(
    "tickets",
    "closed_at",
    "TIMESTAMPTZ",
    `UPDATE tickets SET closed_at = updated_at
     WHERE status IN ('done', 'rejected') AND closed_at IS NULL`
  );
  await tryAddColumn("tickets", "screenshot_filename", "VARCHAR(255)");
  await tryAddColumn("tickets", "screenshot_original_name", "VARCHAR(255)");
  await tryAddColumn("tickets", "screenshot_mime", "VARCHAR(100)");
  await tryAddColumn("tickets", "is_blocked", "BOOLEAN NOT NULL DEFAULT false");

  try {
    const hasClosedIndex = await indexExists("idx_tickets_closed_at");
    if (!hasClosedIndex) {
      try {
        await db.query(`CREATE INDEX IF NOT EXISTS idx_tickets_closed_at ON tickets(closed_at)`);
      } catch (err) {
        console.warn("Could not create idx_tickets_closed_at:", err.message);
      }
    }
  } catch (err) {
    console.warn("Schema check for idx_tickets_closed_at failed:", err.message);
  }
}

module.exports = { ensureSchema };
