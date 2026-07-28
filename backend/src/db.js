const { Pool, types } = require("pg");
const config = require("./config");

// Keep PostgreSQL DATE values as YYYY-MM-DD strings instead of JS Date objects.
types.setTypeParser(1082, (value) => value);

const pool = new Pool({
  connectionString: config.DATABASE_URL,
});

// Store/read timestamptz consistently as UTC so clients can convert to Asia/Tehran.
pool.on("connect", (client) => {
  client.query("SET timezone TO 'UTC'").catch((err) => {
    console.warn("Could not set DB session timezone to UTC:", err.message);
  });
});

pool.on("error", (err) => {
  console.error("Unexpected PostgreSQL error", err);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
