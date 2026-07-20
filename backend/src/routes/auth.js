const express = require("express");
const jwt = require("jsonwebtoken");
const db = require("../db");
const config = require("../config");
const { verifyPassword } = require("../lib/password");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: "lax",
  secure: config.COOKIE_SECURE,
  maxAge: 12 * 60 * 60 * 1000,
};

function publicUser(u) {
  return {
    id: u.id,
    username: u.username,
    displayName: u.display_name,
    department: u.department,
    role: u.role,
  };
}

router.post("/login", async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: "نام کاربری و رمز عبور الزامی است." });
  }

  const result = await db.query(
    "SELECT * FROM users WHERE LOWER(username) = LOWER($1) AND is_active = true",
    [username.trim()]
  );
  if (result.rows.length === 0) {
    return res.status(401).json({ error: "نام کاربری یا رمز عبور اشتباه است." });
  }

  const user = result.rows[0];
  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ error: "نام کاربری یا رمز عبور اشتباه است." });
  }

  await db.query("UPDATE users SET last_login = now() WHERE id = $1", [user.id]);

  const token = jwt.sign(
    { id: user.id, username: user.username, displayName: user.display_name, role: user.role },
    config.JWT_SECRET,
    { expiresIn: config.JWT_EXPIRES_IN }
  );

  res.cookie("session", token, COOKIE_OPTS);
  res.json(publicUser(user));
});

router.post("/logout", (req, res) => {
  res.clearCookie("session", COOKIE_OPTS);
  res.json({ ok: true });
});

router.get("/me", requireAuth, async (req, res) => {
  const result = await db.query("SELECT * FROM users WHERE id = $1", [req.user.id]);
  if (result.rows.length === 0) return res.status(404).json({ error: "کاربر یافت نشد." });
  res.json(publicUser(result.rows[0]));
});

router.patch("/profile", requireAuth, async (req, res) => {
  const { displayName } = req.body || {};
  if (!displayName || !displayName.trim()) {
    return res.status(400).json({ error: "نام نمایشی الزامی است." });
  }

  const result = await db.query(
    "UPDATE users SET display_name = $1 WHERE id = $2 RETURNING *",
    [displayName.trim(), req.user.id]
  );
  if (result.rows.length === 0) return res.status(404).json({ error: "کاربر یافت نشد." });

  const user = result.rows[0];
  const token = jwt.sign(
    { id: user.id, username: user.username, displayName: user.display_name, role: user.role },
    config.JWT_SECRET,
    { expiresIn: config.JWT_EXPIRES_IN }
  );
  res.cookie("session", token, COOKIE_OPTS);
  res.json(publicUser(user));
});

module.exports = router;
