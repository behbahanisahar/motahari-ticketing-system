const express = require("express");
const db = require("../db");
const { requireAuth, requireRole } = require("../middleware/auth");
const { PRIORITIES, STATUSES, CATEGORIES, CATEGORY_LABELS } = require("../lib/constants");
const {
  getMessageRecipientIds,
  markTicketRead,
  getUnreadCountForTicket,
  enrichComment,
} = require("../lib/notifications");
const { emitNewMessage } = require("../socket");

const router = express.Router();

const STATUS_LABELS = {
  queued: "در صف",
  in_progress: "در حال انجام",
  done: "انجام شده",
  rejected: "رد شده",
};

const PRIORITY_LABELS = {
  low: "کم",
  medium: "متوسط",
  high: "بالا",
  urgent: "فوری",
};

async function notifyRequesterOfTicketChanges({ ticket, updated, actorId }) {
  if (!ticket.requester_id || ticket.requester_id === actorId) return;

  const lines = [];

  if (updated.status !== ticket.status) {
    lines.push(
      `وضعیت تیکت به «${STATUS_LABELS[updated.status] || updated.status}» تغییر کرد.`
    );
  }

  if (updated.priority !== ticket.priority) {
    lines.push(
      `اولویت پیگیری IT به «${PRIORITY_LABELS[updated.priority] || updated.priority}» تغییر کرد.`
    );
  }

  if (updated.category !== ticket.category) {
    if (updated.category) {
      lines.push(
        `دسته‌بندی تیکت به «${CATEGORY_LABELS[updated.category] || updated.category}» تغییر کرد.`
      );
    } else {
      lines.push("دسته‌بندی تیکت برداشته شد.");
    }
  }

  const prevAssignee = ticket.assigned_to ?? null;
  const nextAssignee = updated.assigned_to ?? null;
  if (prevAssignee !== nextAssignee) {
    if (nextAssignee == null) {
      lines.push("مسئول پیگیری تیکت برداشته شد.");
    } else {
      const assigneeRes = await db.query(
        "SELECT display_name FROM users WHERE id = $1",
        [nextAssignee]
      );
      const name = assigneeRes.rows[0]?.display_name || "مدیر فناوری";
      lines.push(`مسئول پیگیری تیکت به «${name}» واگذار شد.`);
    }
  }

  if (lines.length === 0) return;

  const body = ["به‌روزرسانی توسط تیم فناوری اطلاعات:", ...lines].join("\n");
  const inserted = await db.query(
    `INSERT INTO ticket_comments (ticket_id, author_id, body) VALUES ($1, $2, $3) RETURNING id`,
    [ticket.id, actorId, body]
  );

  const message = await enrichComment(inserted.rows[0].id);
  const recipientIds = await getMessageRecipientIds(ticket, actorId);
  if (recipientIds.length > 0) {
    emitNewMessage(Number(ticket.id), message, recipientIds);
  }

  return message;
}

function buildFilterClauses(query) {
  const { status, priority, team, category, q } = query;
  const clauses = [];
  const params = [];

  if (status) {
    params.push(status);
    clauses.push(`t.status = $${params.length}`);
  }
  if (priority) {
    params.push(priority);
    clauses.push(`t.priority = $${params.length}`);
  }
  if (team) {
    params.push(team);
    clauses.push(`t.team = $${params.length}`);
  }
  if (category === "none") {
    clauses.push(`t.category IS NULL`);
  } else if (category) {
    params.push(category);
    clauses.push(`t.category = $${params.length}`);
  }
  if (q) {
    params.push(`%${q}%`);
    clauses.push(
      `(t.subject ILIKE $${params.length} OR t.computer_name ILIKE $${params.length} OR u.display_name ILIKE $${params.length})`
    );
  }

  return { clauses, params };
}

function buildOrderClause(sort, order) {
  const direction = order === "asc" ? "ASC" : "DESC";

  if (sort === "created_at") {
    return `t.created_at ${direction}`;
  }
  if (sort === "status") {
    return `CASE t.status
      WHEN 'queued' THEN 0
      WHEN 'in_progress' THEN 1
      WHEN 'done' THEN 2
      WHEN 'rejected' THEN 3
      WHEN 'open' THEN 0
      WHEN 'resolved' THEN 2
      WHEN 'closed' THEN 2
      ELSE 4
    END ${direction}, t.created_at DESC`;
  }
  // default: priority (urgent first when asc)
  if (direction === "ASC") {
    return `CASE t.priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END ASC, t.created_at DESC`;
  }
  return `CASE t.priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END DESC, t.created_at DESC`;
}

// Create a new ticket (any logged-in user)
router.post("/", requireAuth, async (req, res) => {
  const { subject, description, computerName, priority } = req.body || {};

  if (
    !subject ||
    !subject.trim() ||
    !description ||
    !description.trim() ||
    !computerName ||
    !computerName.trim()
  ) {
    return res.status(400).json({ error: "عنوان، توضیحات و نام کامپیوتر الزامی است." });
  }

  const userRes = await db.query("SELECT department FROM users WHERE id = $1", [req.user.id]);
  const department = userRes.rows[0]?.department;
  if (!department) {
    return res.status(400).json({ error: "واحد سازمانی کاربر مشخص نیست. با مدیر تماس بگیرید." });
  }

  const prio = PRIORITIES.includes(priority) ? priority : "medium";

  const result = await db.query(
    `INSERT INTO tickets (requester_id, subject, description, team, computer_name, requester_priority, priority, status)
     VALUES ($1,$2,$3,$4,$5,$6,'medium','queued') RETURNING *`,
    [req.user.id, subject.trim(), description.trim(), department, computerName.trim(), prio]
  );
  res.status(201).json(result.rows[0]);
});

// List the current user's own tickets
router.get("/mine", requireAuth, async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(5, parseInt(req.query.limit, 10) || 10));
  const offset = (page - 1) * limit;
  const q = req.query.q?.trim();

  let where = "WHERE requester_id = $1";
  const params = [req.user.id];

  if (q) {
    params.push(`%${q}%`);
    where += ` AND (subject ILIKE $${params.length} OR computer_name ILIKE $${params.length} OR ticket_number ILIKE $${params.length})`;
  }

  const countResult = await db.query(`SELECT COUNT(*)::int AS total FROM tickets ${where}`, params);
  const total = countResult.rows[0].total;

  const listParams = [...params, limit, offset];
  const result = await db.query(
    `SELECT * FROM tickets ${where} ORDER BY created_at DESC LIMIT $${listParams.length - 1} OFFSET $${listParams.length}`,
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

// List all tickets (admin only), with optional filters, pagination, and sorting
router.get("/", requireAuth, requireRole("admin"), async (req, res) => {
  const { status, priority, team, category, q, sort = "priority", order } = req.query;
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(10, parseInt(req.query.limit, 10) || 20));
  const offset = (page - 1) * limit;

  const validSorts = ["priority", "created_at", "status"];
  const sortField = validSorts.includes(sort) ? sort : "priority";
  const sortOrder =
    order === "asc" || order === "desc" ? order : sortField === "created_at" ? "desc" : "asc";

  const { clauses, params } = buildFilterClauses({ status, priority, team, category, q });
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const orderBy = buildOrderClause(sortField, sortOrder);

  const countResult = await db.query(
    `SELECT COUNT(*)::int AS total
     FROM tickets t
     JOIN users u ON u.id = t.requester_id
     ${where}`,
    params
  );
  const total = countResult.rows[0].total;

  const listParams = [...params, limit, offset];
  const result = await db.query(
    `SELECT t.*, u.display_name AS requester_name, u.username AS requester_username,
            a.display_name AS assignee_name
     FROM tickets t
     JOIN users u ON u.id = t.requester_id
     LEFT JOIN users a ON a.id = t.assigned_to
     ${where}
     ORDER BY ${orderBy}
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

// Fetch a single ticket (owner or admin)
router.get("/:id", requireAuth, async (req, res) => {
  const result = await db.query(
    `SELECT t.*, u.display_name AS requester_name, u.username AS requester_username,
            a.display_name AS assignee_name
     FROM tickets t
     JOIN users u ON u.id = t.requester_id
     LEFT JOIN users a ON a.id = t.assigned_to
     WHERE t.id = $1`,
    [req.params.id]
  );
  if (result.rows.length === 0) return res.status(404).json({ error: "تیکت یافت نشد." });

  const ticket = result.rows[0];
  const isOwner = ticket.requester_id === req.user.id;
  const isAdmin = req.user.role === "admin";
  if (!isOwner && !isAdmin) return res.status(403).json({ error: "دسترسی غیرمجاز." });

  const comments = await db.query(
    `SELECT c.*, u.display_name AS author_name, u.role AS author_role
     FROM ticket_comments c
     JOIN users u ON u.id = c.author_id
     WHERE ticket_id = $1 ORDER BY created_at ASC`,
    [req.params.id]
  );
  const unreadCount = await getUnreadCountForTicket(req.user.id, ticket.id);
  res.json({ ...ticket, comments: comments.rows, unreadCount });
});

// Update ticket fields (admin only: status, IT priority, assignee, category)
router.patch("/:id", requireAuth, async (req, res) => {
  const { status, priority, assignedTo, category } = req.body || {};

  const ticketRes = await db.query("SELECT * FROM tickets WHERE id = $1", [req.params.id]);
  if (ticketRes.rows.length === 0) return res.status(404).json({ error: "تیکت یافت نشد." });
  const ticket = ticketRes.rows[0];

  const isAdmin = req.user.role === "admin";
  if (!isAdmin) return res.status(403).json({ error: "فقط مدیر می‌تواند تیکت را به‌روزرسانی کند." });
  const fields = [];
  const params = [];

  if (status !== undefined) {
    if (!STATUSES.includes(status)) return res.status(400).json({ error: "وضعیت نامعتبر است." });
    params.push(status);
    fields.push(`status = $${params.length}`);
  }
  if (priority !== undefined) {
    if (!PRIORITIES.includes(priority)) return res.status(400).json({ error: "اولویت نامعتبر است." });
    params.push(priority);
    fields.push(`priority = $${params.length}`);
  }
  if (category !== undefined) {
    if (category !== null && category !== "" && !CATEGORIES.includes(category)) {
      return res.status(400).json({ error: "دسته‌بندی نامعتبر است." });
    }
    params.push(category || null);
    fields.push(`category = $${params.length}`);
  }
  if (assignedTo !== undefined) {
    if (assignedTo !== null) {
      const assignee = await db.query("SELECT id, role FROM users WHERE id = $1", [assignedTo]);
      if (assignee.rows.length === 0) {
        return res.status(400).json({ error: "کاربر مسئول یافت نشد." });
      }
      if (!["admin"].includes(assignee.rows[0].role)) {
        return res.status(400).json({ error: "فقط مدیران فناوری قابل انتساب هستند." });
      }
    }
    params.push(assignedTo || null);
    fields.push(`assigned_to = $${params.length}`);
  }

  if (fields.length === 0) return res.status(400).json({ error: "هیچ تغییری ارسال نشده است." });

  params.push(req.params.id);
  const result = await db.query(
    `UPDATE tickets SET ${fields.join(", ")} WHERE id = $${params.length} RETURNING *`,
    params
  );
  if (result.rows.length === 0) return res.status(404).json({ error: "تیکت یافت نشد." });

  const updated = result.rows[0];
  try {
    await notifyRequesterOfTicketChanges({
      ticket,
      updated,
      actorId: req.user.id,
    });
  } catch (err) {
    console.error("Failed to notify ticket requester:", err);
  }

  res.json(updated);
});

// Add a comment (owner or admin)
router.post("/:id/comments", requireAuth, async (req, res) => {
  const { body } = req.body || {};
  if (!body || !body.trim()) return res.status(400).json({ error: "متن پیام نمی‌تواند خالی باشد." });

  const ticketRes = await db.query("SELECT * FROM tickets WHERE id = $1", [req.params.id]);
  if (ticketRes.rows.length === 0) return res.status(404).json({ error: "تیکت یافت نشد." });
  const ticket = ticketRes.rows[0];

  const isOwner = ticket.requester_id === req.user.id;
  const isAdmin = req.user.role === "admin";
  if (!isOwner && !isAdmin) return res.status(403).json({ error: "دسترسی غیرمجاز." });

  const result = await db.query(
    `INSERT INTO ticket_comments (ticket_id, author_id, body) VALUES ($1,$2,$3) RETURNING *`,
    [req.params.id, req.user.id, body.trim()]
  );

  const message = await enrichComment(result.rows[0].id);
  const recipientIds = await getMessageRecipientIds(ticket, req.user.id);
  emitNewMessage(Number(req.params.id), message, recipientIds);

  res.status(201).json(message);
});

// Mark all messages on a ticket as read for the current user
router.post("/:id/read", requireAuth, async (req, res) => {
  const ticketRes = await db.query("SELECT * FROM tickets WHERE id = $1", [req.params.id]);
  if (ticketRes.rows.length === 0) return res.status(404).json({ error: "تیکت یافت نشد." });
  const ticket = ticketRes.rows[0];

  const isOwner = ticket.requester_id === req.user.id;
  const isAdmin = req.user.role === "admin";
  if (!isOwner && !isAdmin) return res.status(403).json({ error: "دسترسی غیرمجاز." });

  await markTicketRead(req.user.id, ticket.id);
  res.json({ ok: true });
});

module.exports = router;
