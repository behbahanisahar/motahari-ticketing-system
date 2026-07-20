const db = require("./db");
const { hashPassword } = require("./lib/password");

const ADMINS = [
  { username: "ITMAN1", displayName: "مدیر فناوری ۱", password: "ITMAN1" },
  { username: "ITMAN2", displayName: "مدیر فناوری ۲", password: "ITMAN2" },
];

async function resetData() {
  console.log("Resetting ticketing system data...");

  await db.query("DELETE FROM ticket_comments");
  await db.query("DELETE FROM tickets");
  await db.query("ALTER SEQUENCE ticket_number_seq RESTART WITH 1000");

  await db.query("UPDATE users SET created_by = NULL");
  await db.query("DELETE FROM users WHERE username NOT IN ('ITMAN1', 'ITMAN2')");

  await db.query("DELETE FROM teams");

  for (const admin of ADMINS) {
    const passwordHash = await hashPassword(admin.password);
    const existing = await db.query("SELECT id FROM users WHERE username = $1", [admin.username]);

    if (existing.rows.length > 0) {
      await db.query(
        `UPDATE users
         SET display_name = $1, department = $2, role = 'admin', password_hash = $3,
             is_active = true, created_by = NULL
         WHERE username = $4`,
        [admin.displayName, "فناوری اطلاعات", passwordHash, admin.username]
      );
      console.log(`Reset admin: ${admin.username}`);
    } else {
      await db.query(
        `INSERT INTO users (username, display_name, department, role, password_hash)
         VALUES ($1, $2, $3, 'admin', $4)`,
        [admin.username, admin.displayName, "فناوری اطلاعات", passwordHash]
      );
      console.log(`Created admin: ${admin.username}`);
    }
  }

  console.log("Done. Only ITMAN1 / ITMAN2 remain with default passwords.");
}

resetData()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
