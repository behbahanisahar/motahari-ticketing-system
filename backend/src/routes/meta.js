const express = require("express");
const db = require("../db");
const { hashPassword } = require("../lib/password");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

router.get("/teams", requireAuth, async (req, res) => {
  const result = await db.query("SELECT id, name FROM teams ORDER BY name ASC");
  res.json(result.rows);
});

router.post("/teams", requireAuth, requireRole("admin"), async (req, res) => {
  const { name } = req.body || {};
  if (!name?.trim()) {
    return res.status(400).json({ error: "نام واحد سازمانی الزامی است." });
  }
  const existing = await db.query("SELECT id FROM teams WHERE name = $1", [name.trim()]);
  if (existing.rows.length > 0) {
    return res.status(409).json({ error: "این واحد قبلاً ثبت شده است." });
  }
  const result = await db.query(
    "INSERT INTO teams (name) VALUES ($1) RETURNING id, name",
    [name.trim()]
  );
  res.status(201).json(result.rows[0]);
});

router.patch("/teams/:id", requireAuth, requireRole("admin"), async (req, res) => {
  const { name } = req.body || {};
  if (!name?.trim()) {
    return res.status(400).json({ error: "نام واحد سازمانی الزامی است." });
  }

  const trimmed = name.trim();
  const teamRes = await db.query("SELECT id, name FROM teams WHERE id = $1", [req.params.id]);
  if (teamRes.rows.length === 0) {
    return res.status(404).json({ error: "واحد یافت نشد." });
  }

  const oldName = teamRes.rows[0].name;
  if (trimmed === oldName) {
    return res.json({ id: teamRes.rows[0].id, name: oldName });
  }

  const duplicate = await db.query("SELECT id FROM teams WHERE name = $1 AND id <> $2", [
    trimmed,
    req.params.id,
  ]);
  if (duplicate.rows.length > 0) {
    return res.status(409).json({ error: "این نام قبلاً برای واحد دیگری ثبت شده است." });
  }

  const client = await db.pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("UPDATE teams SET name = $1 WHERE id = $2", [trimmed, req.params.id]);
    await client.query("UPDATE users SET department = $1 WHERE department = $2", [trimmed, oldName]);
    await client.query("UPDATE tickets SET team = $1 WHERE team = $2", [trimmed, oldName]);
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  res.json({ id: Number(req.params.id), name: trimmed });
});

router.delete("/teams/:id", requireAuth, requireRole("admin"), async (req, res) => {
  const teamRes = await db.query("SELECT name FROM teams WHERE id = $1", [req.params.id]);
  if (teamRes.rows.length === 0) {
    return res.status(404).json({ error: "واحد یافت نشد." });
  }
  const name = teamRes.rows[0].name;

  const [userUse, ticketUse] = await Promise.all([
    db.query("SELECT 1 FROM users WHERE department = $1 LIMIT 1", [name]),
    db.query("SELECT 1 FROM tickets WHERE team = $1 LIMIT 1", [name]),
  ]);
  if (userUse.rows.length > 0 || ticketUse.rows.length > 0) {
    return res.status(400).json({ error: "این واحد در حال استفاده است و قابل حذف نیست." });
  }

  await db.query("DELETE FROM teams WHERE id = $1", [req.params.id]);
  res.json({ ok: true });
});

router.get("/users", requireAuth, requireRole("admin"), async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(5, parseInt(req.query.limit, 10) || 10));
  const offset = (page - 1) * limit;
  const q = req.query.q?.trim();

  let where = "WHERE role = 'user'";
  const params = [];

  if (q) {
    params.push(`%${q}%`);
    where += ` AND (display_name ILIKE $${params.length} OR username ILIKE $${params.length} OR department ILIKE $${params.length})`;
  }

  const countResult = await db.query(`SELECT COUNT(*)::int AS total FROM users ${where}`, params);
  const total = countResult.rows[0].total;

  const listParams = [...params, limit, offset];
  const result = await db.query(
    `SELECT id, username, display_name, department, role, is_active, created_at, last_login
     FROM users
     ${where}
     ORDER BY display_name ASC
     LIMIT $${listParams.length - 1} OFFSET $${listParams.length}`,
    listParams
  );

  res.json({
    items: result.rows,
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  });
});

router.post("/users", requireAuth, requireRole("admin"), async (req, res) => {
  const { username, password, displayName, department } = req.body || {};

  if (!username?.trim() || !password || !displayName?.trim() || !department?.trim()) {
    return res.status(400).json({
      error: "نام کامل، نام کاربری، رمز عبور و واحد سازمانی الزامی است.",
    });
  }

  if (password.length < 4) {
    return res.status(400).json({ error: "رمز عبور باید حداقل ۴ کاراکتر باشد." });
  }

  const existing = await db.query("SELECT id FROM users WHERE LOWER(username) = LOWER($1)", [
    username.trim(),
  ]);
  if (existing.rows.length > 0) {
    return res.status(409).json({ error: "این نام کاربری قبلاً ثبت شده است." });
  }

  const passwordHash = await hashPassword(password);
  const result = await db.query(
    `INSERT INTO users (username, display_name, department, role, password_hash, created_by)
     VALUES ($1, $2, $3, 'user', $4, $5)
     RETURNING id, username, display_name, department, role, is_active, created_at`,
    [username.trim(), displayName.trim(), department.trim(), passwordHash, req.user.id]
  );
  res.status(201).json(result.rows[0]);
});

router.patch("/users/:id", requireAuth, requireRole("admin"), async (req, res) => {
  const { displayName, department, password, isActive } = req.body || {};
  const fields = [];
  const params = [];

  if (displayName !== undefined) {
    if (!displayName.trim()) return res.status(400).json({ error: "نام کامل نمی‌تواند خالی باشد." });
    params.push(displayName.trim());
    fields.push(`display_name = $${params.length}`);
  }
  if (department !== undefined) {
    if (!department.trim()) return res.status(400).json({ error: "واحد سازمانی نمی‌تواند خالی باشد." });
    params.push(department.trim());
    fields.push(`department = $${params.length}`);
  }
  if (password !== undefined) {
    if (password.length < 4) return res.status(400).json({ error: "رمز عبور باید حداقل ۴ کاراکتر باشد." });
    params.push(await hashPassword(password));
    fields.push(`password_hash = $${params.length}`);
  }
  if (isActive !== undefined) {
    params.push(Boolean(isActive));
    fields.push(`is_active = $${params.length}`);
  }

  if (fields.length === 0) {
    return res.status(400).json({ error: "هیچ تغییری ارسال نشده است." });
  }

  params.push(req.params.id);
  const result = await db.query(
    `UPDATE users SET ${fields.join(", ")}
     WHERE id = $${params.length} AND role = 'user'
     RETURNING id, username, display_name, department, role, is_active`,
    params
  );
  if (result.rows.length === 0) {
    return res.status(404).json({ error: "کاربر یافت نشد یا قابل ویرایش نیست." });
  }
  res.json(result.rows[0]);
});

// Admins for ticket assignment
router.get("/admins", requireAuth, requireRole("admin"), async (req, res) => {
  const result = await db.query(
    "SELECT id, username, display_name FROM users WHERE role = 'admin' AND is_active = true ORDER BY display_name ASC"
  );
  res.json(result.rows);
});

module.exports = router;
