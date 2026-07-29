const { Pool, types } = require("pg");
const config = require("./config");

// Keep PostgreSQL DATE values as YYYY-MM-DD strings instead of JS Date objects.
types.setTypeParser(1082, (value) => value);

// Set timezone via libpq startup options — do NOT query inside pool.on('connect'),
// that races with the first real query and triggers pg's deprecation warning.
const pool = new Pool({
  connectionString: config.DATABASE_URL,
  options: "-c timezone=UTC",
});

pool.on("error", (err) => {
  console.error("Unexpected PostgreSQL error", err);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
