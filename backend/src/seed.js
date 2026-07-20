const db = require("./db");
const { hashPassword } = require("./lib/password");

const ADMINS = [
  { username: "ITMAN1", displayName: "مدیر فناوری ۱", password: "ITMAN1" },
  { username: "ITMAN2", displayName: "مدیر فناوری ۲", password: "ITMAN2" },
];

async function seedAdmins() {
  await db.query(
    "INSERT INTO teams (name) VALUES ('فناوری اطلاعات') ON CONFLICT (name) DO NOTHING"
  );

  for (const admin of ADMINS) {
    const existing = await db.query("SELECT id FROM users WHERE username = $1", [admin.username]);
    if (existing.rows.length > 0) continue;

    const passwordHash = await hashPassword(admin.password);
    await db.query(
      `INSERT INTO users (username, display_name, department, role, password_hash)
       VALUES ($1, $2, $3, 'admin', $4)`,
      [admin.username, admin.displayName, "فناوری اطلاعات", passwordHash]
    );
    console.log(`Seeded admin user: ${admin.username}`);
  }
}

module.exports = { seedAdmins };
