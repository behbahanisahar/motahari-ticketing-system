const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const db = require("../db");
const { requireAuth, requireRole } = require("../middleware/auth");
const { asyncHandler } = require("../lib/asyncHandler");
const { PRIORITIES, STATUSES, CATEGORIES, CATEGORY_LABELS, isAllowedTicketCategory } = require("../lib/constants");
const {
  getMessageRecipientIds,
  markTicketRead,
  getUnreadCountForTicket,
  enrichComment,
  toIsoUtc,
} = require("../lib/notifications");
const {
  UPLOADS_DIR,
  MAX_SCREENSHOT_BYTES,
  ALLOWED_SCREENSHOT_MIME,
  ensureUploadsDir,
  screenshotAbsolutePath,
} = require("../lib/uploads");
const { emitNewMessage } = require("../socket");

const router = express.Router();

ensureUploadsDir();

const screenshotUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      ensureUploadsDir();
      cb(null, UPLOADS_DIR);
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname || "").toLowerCase();
      const safeExt = [".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(ext) ? ext : ".jpg";
      cb(null, `ticket-${Date.now()}-${Math.random().toString(36).slice(2, 10)}${safeExt}`);
    },
  }),
  limits: { fileSize: MAX_SCREENSHOT_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_SCREENSHOT_MIME.has(file.mimetype)) {
      return cb(new Error("فقط تصویر JPEG، PNG، WebP یا GIF مجاز است."));
    }
    cb(null, true);
  },
});

function optionalScreenshot(req, res, next) {
  screenshotUpload.single("screenshot")(req, res, (err) => {
    if (!err) return next();
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ error: "حجم تصویر حداکثر ۵ مگابایت است." });
    }
    return res.status(400).json({ error: err.message || "آپلود تصویر ناموفق بود." });
  });
}

function publicTicket(row) {
  if (!row) return row;
  const {
    screenshot_filename,
    screenshot_original_name,
    screenshot_mime,
    ...rest
  } = row;
  return {
    ...rest,
    created_at: toIsoUtc(row.created_at),
    updated_at: toIsoUtc(row.updated_at),
    closed_at: toIsoUtc(row.closed_at),
    has_screenshot: Boolean(screenshot_filename),
    screenshot_name: screenshot_original_name || null,
  };
}

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
  // High/urgent stay pinned to the top only while the ticket is still open.
  const openHighFirst = `CASE
      WHEN t.status IN ('queued', 'in_progress', 'open')
       AND t.priority IN ('urgent', 'high') THEN 0
      ELSE 1
    END ASC`;

  if (sort === "created_at") {
    return `${openHighFirst}, t.created_at ${direction}`;
  }
  if (sort === "status") {
    return `${openHighFirst}, CASE t.status
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

  // Default priority sort:
  // 1) open + urgent/high
  // 2) other open tickets (by priority)
  // 3) closed tickets by date only (priority no longer keeps them on top)
  return `CASE
      WHEN t.status IN ('queued', 'in_progress', 'open')
       AND t.priority IN ('urgent', 'high') THEN 0
      WHEN t.status IN ('queued', 'in_progress', 'open') THEN 1
      ELSE 2
    END ASC,
    CASE
      WHEN t.status IN ('queued', 'in_progress', 'open') THEN
        CASE t.priority
          WHEN 'urgent' THEN 0
          WHEN 'high' THEN 1
          WHEN 'medium' THEN 2
          ELSE 3
        END
    END ASC NULLS LAST,
    t.created_at DESC`;
}

// Create a new ticket (any logged-in user); optional screenshot image
router.post(
  "/",
  requireAuth,
  optionalScreenshot,
  asyncHandler(async (req, res) => {
    const { subject, description, computerName, priority } = req.body || {};

    if (
      !subject ||
      !String(subject).trim() ||
      !description ||
      !String(description).trim() ||
      !computerName ||
      !String(computerName).trim()
    ) {
      if (req.file?.path) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (_) {}
      }
      return res.status(400).json({ error: "عنوان، توضیحات و نام کامپیوتر الزامی است." });
    }

    const userRes = await db.query("SELECT department FROM users WHERE id = $1", [req.user.id]);
    const department = userRes.rows[0]?.department;
    if (!department) {
      if (req.file?.path) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (_) {}
      }
      return res.status(400).json({ error: "واحد سازمانی کاربر مشخص نیست. با مدیر تماس بگیرید." });
    }

    const prio = PRIORITIES.includes(priority) ? priority : "medium";
    const screenshotFilename = req.file?.filename || null;
    const screenshotOriginal = req.file?.originalname || null;
    const screenshotMime = req.file?.mimetype || null;

    let result;
    try {
      result = await db.query(
        `INSERT INTO tickets (
           requester_id, subject, description, team, computer_name,
           requester_priority, priority, status,
           screenshot_filename, screenshot_original_name, screenshot_mime
         )
         VALUES ($1,$2,$3,$4,$5,$6,'medium','queued',$7,$8,$9)
         RETURNING *`,
        [
          req.user.id,
          String(subject).trim(),
          String(description).trim(),
          department,
          String(computerName).trim(),
          prio,
          screenshotFilename,
          screenshotOriginal,
          screenshotMime,
        ]
      );
    } catch (err) {
      if (req.file?.path) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (_) {}
      }
      if (err && /screenshot_|closed_at|column/i.test(String(err.message || ""))) {
        console.error("Ticket create failed (schema):", err.message);
        return res.status(500).json({
          error:
            "ستون تصویر در دیتابیس آماده نیست. سرور را یک‌بار ری‌استارت کنید یا این SQL را اجرا کنید: ALTER TABLE tickets ADD COLUMN IF NOT EXISTS screenshot_filename VARCHAR(255); ALTER TABLE tickets ADD COLUMN IF NOT EXISTS screenshot_original_name VARCHAR(255); ALTER TABLE tickets ADD COLUMN IF NOT EXISTS screenshot_mime VARCHAR(100);",
        });
      }
      throw err;
    }
    res.status(201).json(publicTicket(result.rows[0]));
  })
);

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
  res.json({
    ...publicTicket(ticket),
    comments: comments.rows.map((c) => ({
      ...c,
      created_at: toIsoUtc(c.created_at),
    })),
    unreadCount,
  });
});

// Serve ticket screenshot (requester or admin)
router.get(
  "/:id/screenshot",
  requireAuth,
  asyncHandler(async (req, res) => {
    const result = await db.query("SELECT * FROM tickets WHERE id = $1", [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: "تیکت یافت نشد." });
    const ticket = result.rows[0];
    const isOwner = ticket.requester_id === req.user.id;
    const isAdmin = req.user.role === "admin";
    if (!isOwner && !isAdmin) return res.status(403).json({ error: "دسترسی غیرمجاز." });
    if (!ticket.screenshot_filename) {
      return res.status(404).json({ error: "تصویری برای این تیکت ثبت نشده است." });
    }

    const filePath = screenshotAbsolutePath(ticket.screenshot_filename);
    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).json({ error: "فایل تصویر یافت نشد." });
    }

    const downloadName = ticket.screenshot_original_name || ticket.screenshot_filename;
    if (req.query.download === "1") {
      return res.download(filePath, downloadName);
    }
    res.type(ticket.screenshot_mime || "image/jpeg");
    res.setHeader("Cache-Control", "private, max-age=3600");
    return res.sendFile(filePath);
  })
);

// Update ticket fields (admin only: status, IT priority, assignee, category, isBlocked)
router.patch(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
  const { status, priority, assignedTo, category, isBlocked } = req.body || {};

  const ticketRes = await db.query("SELECT * FROM tickets WHERE id = $1", [req.params.id]);
  if (ticketRes.rows.length === 0) return res.status(404).json({ error: "تیکت یافت نشد." });
  const ticket = ticketRes.rows[0];

  const isAdmin = req.user.role === "admin";
  if (!isAdmin) return res.status(403).json({ error: "فقط مدیر می‌تواند تیکت را به‌روزرسانی کند." });

  const isClosed = ticket.status === "done" || ticket.status === "rejected";
  const wantsOtherChanges =
    status !== undefined ||
    priority !== undefined ||
    assignedTo !== undefined ||
    category !== undefined;
  // Closed tickets stay locked except for the statistical block flag.
  if (isClosed && wantsOtherChanges) {
    return res.status(403).json({ error: "تیکت‌های انجام‌شده یا ردشده قابل ویرایش نیستند." });
  }

  const fields = [];
  const params = [];

  if (status !== undefined) {
    if (!STATUSES.includes(status)) return res.status(400).json({ error: "وضعیت نامعتبر است." });
    params.push(status);
    fields.push(`status = $${params.length}`);
    if (status === "done" || status === "rejected") {
      fields.push("closed_at = COALESCE(closed_at, now())");
    }
  }
  if (priority !== undefined) {
    if (!PRIORITIES.includes(priority)) return res.status(400).json({ error: "اولویت نامعتبر است." });
    params.push(priority);
    fields.push(`priority = $${params.length}`);
  }
  if (category !== undefined) {
    const nextCategory = category || null;
    if (nextCategory && !isAllowedTicketCategory(nextCategory, ticket.category)) {
      return res.status(400).json({ error: "دسته‌بندی نامعتبر است." });
    }
    params.push(nextCategory);
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
  if (isBlocked !== undefined) {
    params.push(Boolean(isBlocked));
    fields.push(`is_blocked = $${params.length}`);
  }

  if (fields.length === 0) return res.status(400).json({ error: "هیچ تغییری ارسال نشده است." });

  params.push(req.params.id);
  let result;
  try {
    result = await db.query(
      `UPDATE tickets SET ${fields.join(", ")} WHERE id = $${params.length} RETURNING *`,
      params
    );
  } catch (err) {
    if (err && /category|is_blocked/i.test(String(err.message || ""))) {
      console.error("Ticket update failed:", err.message);
      return res.status(500).json({
        error: "ستون مورد نیاز در دیتابیس آماده نیست. سرور را یک‌بار ری‌استارت کنید.",
      });
    }
    throw err;
  }
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

  res.json(publicTicket(updated));
  })
);

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
