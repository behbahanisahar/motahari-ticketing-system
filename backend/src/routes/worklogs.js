const express = require("express");
const db = require("../db");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

const { ACTIVE_CATEGORIES, isAllowedTicketCategory } = require("../lib/constants");
const ACTIVE_CATEGORY_SET = new Set(ACTIVE_CATEGORIES);

const VALID_STATUSES = new Set(["queued", "in_progress", "done", "rejected"]);

const WORK_LOG_JOIN = `
  FROM work_logs wl
  JOIN users u ON u.id = wl.author_id
  JOIN users a ON a.id = wl.assignee_id
  LEFT JOIN tickets t ON t.id = wl.ticket_id
`;

function normalizeWorkDate(value) {
  if (value == null || value === "") return null;
  if (typeof value === "string") {
    const match = value.trim().match(/^(\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : null;
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, "0");
    const d = String(value.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  return null;
}

function mapRow(row) {
  const workDate = normalizeWorkDate(row.work_date);
  return {
    id: row.id,
    authorId: row.author_id,
    authorName: row.author_name,
    assigneeId: row.assignee_id,
    assigneeName: row.assignee_name,
    title: row.title,
    description: row.description,
    category: row.category,
    status: row.status,
    rejectReason: row.reject_reason,
    workDate,
    durationMinutes: row.duration_minutes,
    ticketId: row.ticket_id,
    ticketNumber: row.ticket_number,
    ticketSubject: row.ticket_subject || null,
    ticketStatus: row.ticket_status || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    isAssigned: Number(row.author_id) !== Number(row.assignee_id),
  };
}

function enrichPermissions(row, userId) {
  const isAuthor = Number(row.author_id) === Number(userId);
  const isAssignee = Number(row.assignee_id) === Number(userId);
  const isAssigned = Number(row.author_id) !== Number(row.assignee_id);
  const isSelfTask = isAuthor && isAssignee;
  const isClosed = row.status === "done" || row.status === "rejected";

  // Worklog is admin-only; open items are manageable by any admin.
  return {
    canEdit: !isClosed,
    canDelete: !isClosed,
    canUpdateStatus: !isClosed,
    canReject: isAssigned && row.status !== "rejected" && row.status !== "done",
    canRevert: row.status === "rejected",
    isSelfTask,
    isAssigned,
    isDelegatedByMe: isAuthor && isAssigned,
    isReceivedByMe: isAssignee && isAssigned,
  };
}

async function fetchWorkLog(id) {
  const result = await db.query(
    `SELECT wl.*, u.display_name AS author_name, a.display_name AS assignee_name,
            t.ticket_number, t.subject AS ticket_subject, t.status AS ticket_status
     ${WORK_LOG_JOIN}
     WHERE wl.id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

async function assertAdminUser(userId) {
  const result = await db.query(
    "SELECT id FROM users WHERE id = $1 AND role = 'admin' AND is_active = true",
    [userId]
  );
  return result.rows.length > 0;
}

router.use(requireAuth, requireRole("admin"));

router.get("/", async (req, res) => {
  const { date, authorId, assigneeId, category, status, q, page, limit } = req.query;
  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const safeLimit = Math.min(50, Math.max(1, parseInt(limit, 10) || 15));
  const offset = (safePage - 1) * safeLimit;
  const showAllDates = !date || date === "all";
  const workDate = showAllDates ? null : date;

  const conditions = [];
  const params = [];
  let idx = 1;

  if (!showAllDates) {
    conditions.push(`wl.work_date = $${idx++}::date`);
    params.push(workDate);
  }
  if (authorId) {
    conditions.push(`wl.author_id = $${idx++}`);
    params.push(Number(authorId));
  }
  if (assigneeId) {
    conditions.push(`wl.assignee_id = $${idx++}`);
    params.push(Number(assigneeId));
  }
  if (category) {
    conditions.push(`wl.category = $${idx++}`);
    params.push(category);
  }
  if (status) {
    conditions.push(`wl.status = $${idx++}`);
    params.push(status);
  }
  if (q?.trim()) {
    conditions.push(`(
      wl.title ILIKE $${idx}
      OR wl.description ILIKE $${idx}
      OR u.display_name ILIKE $${idx}
      OR a.display_name ILIKE $${idx}
    )`);
    params.push(`%${q.trim()}%`);
    idx++;
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const [countResult, itemsResult, summaryResult, minutesResult] = await Promise.all([
    db.query(`SELECT COUNT(*)::int AS total ${WORK_LOG_JOIN} ${where}`, params),
    db.query(
      `SELECT wl.*, u.display_name AS author_name, a.display_name AS assignee_name,
              t.ticket_number, t.subject AS ticket_subject, t.status AS ticket_status
       ${WORK_LOG_JOIN}
       ${where}
       ORDER BY wl.work_date DESC, wl.created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, safeLimit, offset]
    ),
    db.query(
      `SELECT wl.assignee_id, a.display_name AS assignee_name,
              COUNT(*)::int AS count,
              COALESCE(SUM(wl.duration_minutes), 0)::int AS total_minutes
       ${WORK_LOG_JOIN}
       ${where}
       GROUP BY wl.assignee_id, a.display_name
       ORDER BY a.display_name ASC`,
      params
    ),
    db.query(
      `SELECT COALESCE(SUM(wl.duration_minutes), 0)::int AS total_minutes
       ${WORK_LOG_JOIN}
       ${where}`,
      params
    ),
  ]);

  const total = countResult.rows[0]?.total ?? 0;

  res.json({
    date: workDate,
    allDates: showAllDates,
    items: itemsResult.rows.map((row) => ({
      ...mapRow(row),
      ...enrichPermissions(row, req.user.id),
    })),
    summary: summaryResult.rows.map((r) => ({
      assigneeId: r.assignee_id,
      assigneeName: r.assignee_name,
      count: r.count,
      totalMinutes: r.total_minutes,
    })),
    total,
    totalMinutes: minutesResult.rows[0]?.total_minutes ?? 0,
    page: safePage,
    limit: safeLimit,
    totalPages: Math.max(1, Math.ceil(total / safeLimit)),
  });
});

router.post("/", async (req, res) => {
  const { title, description, category, workDate, durationMinutes, ticketId, assigneeId, status } =
    req.body || {};

  if (!title?.trim()) {
    return res.status(400).json({ error: "عنوان کار الزامی است." });
  }

  const cat = category || "hardware";
  if (!ACTIVE_CATEGORY_SET.has(cat)) {
    return res.status(400).json({ error: "دسته‌بندی نامعتبر است." });
  }

  const nextStatus = status || "queued";
  if (!VALID_STATUSES.has(nextStatus)) {
    return res.status(400).json({ error: "وضعیت نامعتبر است." });
  }

  const assignee = assigneeId ? Number(assigneeId) : req.user.id;
  if (assignee !== req.user.id) {
    const ok = await assertAdminUser(assignee);
    if (!ok) return res.status(400).json({ error: "همکار انتخاب‌شده معتبر نیست." });
  }

  if (assignee !== req.user.id && nextStatus !== "queued") {
    return res.status(400).json({ error: "کار واگذارشده باید با وضعیت «در صف» شروع شود." });
  }

  const date = workDate || new Date().toISOString().slice(0, 10);

  if (durationMinutes != null && (Number(durationMinutes) < 0 || Number(durationMinutes) > 1440)) {
    return res.status(400).json({ error: "مدت زمان باید بین ۰ تا ۱۴۴۰ دقیقه باشد." });
  }

  const result = await db.query(
    `INSERT INTO work_logs (
       author_id, assignee_id, title, description, category, status,
       work_date, duration_minutes, ticket_id
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7::date, $8, $9)
     RETURNING id`,
    [
      req.user.id,
      assignee,
      title.trim(),
      description?.trim() || null,
      cat,
      nextStatus,
      date,
      durationMinutes != null && durationMinutes !== "" ? Number(durationMinutes) : null,
      ticketId || null,
    ]
  );

  const row = await fetchWorkLog(result.rows[0].id);
  res.status(201).json({
    ...mapRow(row),
    ...enrichPermissions(row, req.user.id),
  });
});

router.patch("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const existing = await db.query("SELECT * FROM work_logs WHERE id = $1", [id]);
  if (existing.rows.length === 0) {
    return res.status(404).json({ error: "مورد کار یافت نشد." });
  }

  const row = existing.rows[0];
  const perms = enrichPermissions(row, req.user.id);
  const {
    title,
    description,
    category,
    workDate,
    durationMinutes,
    ticketId,
    assigneeId,
    status,
    rejectReason,
  } = req.body || {};

  const fields = [];
  const params = [];
  let idx = 1;

  const wantsContent =
    title !== undefined ||
    description !== undefined ||
    category !== undefined ||
    workDate !== undefined ||
    durationMinutes !== undefined ||
    ticketId !== undefined ||
    assigneeId !== undefined;

  const wantsStatus = status !== undefined || rejectReason !== undefined;
  const isRevert = status === "queued" && row.status === "rejected";

  if (wantsContent && !perms.canEdit) {
    return res.status(403).json({ error: "اجازه ویرایش این کار را ندارید." });
  }

  if (wantsStatus && !isRevert && !perms.canUpdateStatus) {
    return res.status(403).json({ error: "فقط مسئول انجام کار می‌تواند وضعیت را تغییر دهد." });
  }

  if (isRevert && !perms.canRevert) {
    return res.status(403).json({ error: "فقط ثبت‌کننده می‌تواند رد را بازگرداند." });
  }

  if (title !== undefined) {
    if (!title?.trim()) return res.status(400).json({ error: "عنوان کار الزامی است." });
    fields.push(`title = $${idx++}`);
    params.push(title.trim());
  }
  if (description !== undefined) {
    fields.push(`description = $${idx++}`);
    params.push(description?.trim() || null);
  }
  if (category !== undefined) {
    if (!isAllowedTicketCategory(category, row.category)) {
      return res.status(400).json({ error: "دسته‌بندی نامعتبر است." });
    }
    fields.push(`category = $${idx++}`);
    params.push(category);
  }
  if (workDate !== undefined) {
    fields.push(`work_date = $${idx++}::date`);
    params.push(workDate);
  }
  if (durationMinutes !== undefined) {
    if (durationMinutes != null && durationMinutes !== "" && (Number(durationMinutes) < 0 || Number(durationMinutes) > 1440)) {
      return res.status(400).json({ error: "مدت زمان باید بین ۰ تا ۱۴۴۰ دقیقه باشد." });
    }
    fields.push(`duration_minutes = $${idx++}`);
    params.push(durationMinutes != null && durationMinutes !== "" ? Number(durationMinutes) : null);
  }
  if (ticketId !== undefined) {
    fields.push(`ticket_id = $${idx++}`);
    params.push(ticketId || null);
  }
  if (assigneeId !== undefined) {
    const assignee = assigneeId ? Number(assigneeId) : req.user.id;
    if (assignee !== req.user.id) {
      const ok = await assertAdminUser(assignee);
      if (!ok) return res.status(400).json({ error: "همکار انتخاب‌شده معتبر نیست." });
    }
    fields.push(`assignee_id = $${idx++}`);
    params.push(assignee);
  }
  if (status !== undefined) {
    if (!VALID_STATUSES.has(status)) {
      return res.status(400).json({ error: "وضعیت نامعتبر است." });
    }
    fields.push(`status = $${idx++}`);
    params.push(status);
    if (status === "rejected") {
      fields.push(`reject_reason = $${idx++}`);
      params.push(rejectReason?.trim() || null);
    } else {
      fields.push(`reject_reason = $${idx++}`);
      params.push(null);
    }
  } else if (rejectReason !== undefined) {
    fields.push(`reject_reason = $${idx++}`);
    params.push(rejectReason?.trim() || null);
  }

  if (fields.length === 0) {
    return res.status(400).json({ error: "تغییری ارسال نشده است." });
  }

  params.push(id);
  await db.query(`UPDATE work_logs SET ${fields.join(", ")} WHERE id = $${idx}`, params);

  const updated = await fetchWorkLog(id);
  res.json({
    ...mapRow(updated),
    ...enrichPermissions(updated, req.user.id),
  });
});

router.post("/:id/reject", async (req, res) => {
  const id = Number(req.params.id);
  const existing = await db.query("SELECT * FROM work_logs WHERE id = $1", [id]);
  if (existing.rows.length === 0) {
    return res.status(404).json({ error: "مورد کار یافت نشد." });
  }

  const row = existing.rows[0];
  const perms = enrichPermissions(row, req.user.id);
  if (!perms.canReject) {
    return res.status(403).json({ error: "فقط مسئول انجام کار می‌تواند این مورد را رد کند." });
  }

  const { reason } = req.body || {};
  await db.query(
    `UPDATE work_logs SET status = 'rejected', reject_reason = $1 WHERE id = $2`,
    [reason?.trim() || null, id]
  );

  const updated = await fetchWorkLog(id);
  res.json({
    ...mapRow(updated),
    ...enrichPermissions(updated, req.user.id),
  });
});

router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const existing = await db.query("SELECT author_id FROM work_logs WHERE id = $1", [id]);
  if (existing.rows.length === 0) {
    return res.status(404).json({ error: "مورد کار یافت نشد." });
  }
  const perms = enrichPermissions(existing.rows[0], req.user.id);
  if (!perms.canDelete) {
    return res.status(403).json({ error: "اجازه حذف این کار را ندارید." });
  }
  await db.query("DELETE FROM work_logs WHERE id = $1", [id]);
  res.json({ ok: true });
});

module.exports = router;
