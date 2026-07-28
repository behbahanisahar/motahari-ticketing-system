const db = require("../db");

async function getMessageRecipientIds(ticket, authorId) {
  const ids = new Set();
  if (ticket.requester_id !== authorId) {
    ids.add(ticket.requester_id);
  }
  if (authorId === ticket.requester_id) {
    if (ticket.assigned_to && ticket.assigned_to !== authorId) {
      ids.add(ticket.assigned_to);
    } else {
      const admins = await db.query(
        "SELECT id FROM users WHERE role = 'admin' AND is_active = true AND id != $1",
        [authorId]
      );
      admins.rows.forEach((a) => ids.add(a.id));
    }
  }
  return [...ids];
}

async function markTicketRead(userId, ticketId) {
  await db.query(
    `INSERT INTO ticket_read_status (user_id, ticket_id, last_read_at)
     VALUES ($1, $2, now())
     ON CONFLICT (user_id, ticket_id)
     DO UPDATE SET last_read_at = now()`,
    [userId, ticketId]
  );
}

async function getUnreadCountForTicket(userId, ticketId) {
  const result = await db.query(
    `SELECT COUNT(*)::int AS count
     FROM ticket_comments c
     LEFT JOIN ticket_read_status r
       ON r.ticket_id = c.ticket_id AND r.user_id = $1
     WHERE c.ticket_id = $2
       AND c.author_id != $1
       AND c.created_at > COALESCE(r.last_read_at, '1970-01-01'::timestamptz)`,
    [userId, ticketId]
  );
  return result.rows[0].count;
}

function toIsoUtc(value) {
  if (value == null || value === "") return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }
  const raw = String(value).trim();
  if (!raw) return null;
  if (/[zZ]|[+-]\d{2}:?\d{2}$/.test(raw)) {
    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? raw : parsed.toISOString();
  }
  const normalized = raw.includes("T") ? raw : raw.replace(" ", "T");
  const parsed = new Date(`${normalized}Z`);
  return Number.isNaN(parsed.getTime()) ? raw : parsed.toISOString();
}

function mapNotificationRow(row) {
  const lastMessage = row.last_message
    ? {
        ...row.last_message,
        created_at: toIsoUtc(row.last_message.created_at),
      }
    : null;

  return {
    ticketId: row.ticket_id,
    ticketNumber: row.ticket_number,
    subject: row.subject,
    status: row.status,
    unreadCount: row.unread_count,
    isRead: row.unread_count === 0,
    lastMessage,
  };
}

const NOTIFICATION_BASE_SQL = `
  SELECT
    t.id AS ticket_id,
    t.ticket_number,
    t.subject,
    t.status,
    (
      SELECT COUNT(*)::int
      FROM ticket_comments c
      LEFT JOIN ticket_read_status r
        ON r.ticket_id = c.ticket_id AND r.user_id = $USER_ID
      WHERE c.ticket_id = t.id
        AND c.author_id != $USER_ID
        AND c.created_at > COALESCE(r.last_read_at, '1970-01-01'::timestamptz)
    ) AS unread_count,
    (
      SELECT row_to_json(last_msg)
      FROM (
        SELECT c.body, c.created_at, u.display_name AS author_name
        FROM ticket_comments c
        JOIN users u ON u.id = c.author_id
        WHERE c.ticket_id = t.id
        ORDER BY c.created_at DESC
        LIMIT 1
      ) last_msg
    ) AS last_message,
    (
      SELECT MAX(c.created_at) FROM ticket_comments c WHERE c.ticket_id = t.id
    ) AS last_activity
  FROM tickets t
  WHERE EXISTS (SELECT 1 FROM ticket_comments c WHERE c.ticket_id = t.id)
`;

async function getNotificationList(user, { page = 1, limit = 15, q = "", filter = "all" } = {}) {
  const isAdmin = user.role === "admin";
  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const safeLimit = Math.min(50, Math.max(1, parseInt(limit, 10) || 15));
  const offset = (safePage - 1) * safeLimit;

  const params = [];
  const outerConditions = [];
  let idx = 1;

  params.push(user.id);
  const userIdRef = `$${idx++}`;

  let innerScope = "";
  if (!isAdmin) {
    params.push(user.id);
    innerScope = `AND t.requester_id = $${idx++}`;
  }

  const baseSql = NOTIFICATION_BASE_SQL.replace(/\$USER_ID/g, userIdRef);

  if (q?.trim()) {
    params.push(`%${q.trim()}%`);
    outerConditions.push(`(
      n.subject ILIKE $${idx}
      OR n.ticket_number ILIKE $${idx}
      OR (n.last_message->>'body') ILIKE $${idx}
      OR (n.last_message->>'author_name') ILIKE $${idx}
    )`);
    idx++;
  }

  if (filter === "unread") {
    outerConditions.push("n.unread_count > 0");
  }

  const outerWhere = outerConditions.length ? `WHERE ${outerConditions.join(" AND ")}` : "";

  const result = await db.query(
    `WITH notification_rows AS (
       ${baseSql}
       ${innerScope}
     )
     SELECT n.*, COUNT(*) OVER()::int AS total_count
     FROM notification_rows n
     ${outerWhere}
     ORDER BY n.last_activity DESC NULLS LAST
     LIMIT $${idx} OFFSET $${idx + 1}`,
    [...params, safeLimit, offset]
  );

  const total = result.rows[0]?.total_count ?? 0;
  const items = result.rows.map(mapNotificationRow);

  return {
    items,
    total,
    page: safePage,
    limit: safeLimit,
    totalPages: Math.max(1, Math.ceil(total / safeLimit)),
  };
}

async function getNotificationCounts(user) {
  const isAdmin = user.role === "admin";
  const params = [user.id];
  let scope = "";
  if (!isAdmin) {
    params.push(user.id);
    scope = "AND t.requester_id = $2";
  }

  const baseSql = NOTIFICATION_BASE_SQL.replace(/\$USER_ID/g, "$1");

  const result = await db.query(
    `WITH notification_rows AS (
       ${baseSql}
       ${scope}
     )
     SELECT
       COALESCE(SUM(unread_count), 0)::int AS unread_total,
       COUNT(*) FILTER (WHERE unread_count > 0)::int AS tickets_with_unread,
       COUNT(*)::int AS total_tickets
     FROM notification_rows`,
    params
  );

  const row = result.rows[0];
  return {
    unreadTotal: row.unread_total,
    ticketsWithUnread: row.tickets_with_unread,
    totalTickets: row.total_tickets,
  };
}

async function getNotificationSummary(user) {
  const counts = await getNotificationCounts(user);
  return { ...counts, items: [] };
}

async function getDashboardMessageStats(user) {
  const isAdmin = user.role === "admin";
  const params = isAdmin ? [user.id] : [user.id, user.id];
  const scope = isAdmin ? "" : "AND t.requester_id = $2";

  const result = await db.query(
    `SELECT
       (SELECT COUNT(*)::int FROM ticket_comments c
        JOIN tickets t ON t.id = c.ticket_id
        WHERE 1=1 ${scope}) AS total_messages,
       (SELECT COUNT(*)::int FROM ticket_comments c
        JOIN tickets t ON t.id = c.ticket_id
        LEFT JOIN ticket_read_status r ON r.ticket_id = c.ticket_id AND r.user_id = $1
        WHERE c.author_id != $1
          AND c.created_at > COALESCE(r.last_read_at, '1970-01-01'::timestamptz)
          ${scope}) AS unread_messages,
       (SELECT COUNT(*)::int FROM ticket_comments c
        JOIN tickets t ON t.id = c.ticket_id
        WHERE c.created_at >= date_trunc('day', now())
          ${scope}) AS messages_today,
       (SELECT COUNT(DISTINCT t.id)::int FROM tickets t
        JOIN ticket_comments c ON c.ticket_id = t.id
        LEFT JOIN ticket_read_status r ON r.ticket_id = t.id AND r.user_id = $1
        WHERE c.author_id != $1
          AND c.created_at > COALESCE(r.last_read_at, '1970-01-01'::timestamptz)
          ${scope}) AS tickets_with_unread`,
    params
  );

  const row = result.rows[0];
  return {
    totalMessages: row.total_messages,
    unreadMessages: row.unread_messages,
    messagesToday: row.messages_today,
    ticketsWithUnread: row.tickets_with_unread,
  };
}

async function enrichComment(commentId) {
  const result = await db.query(
    `SELECT c.*, u.display_name AS author_name, u.role AS author_role
     FROM ticket_comments c
     JOIN users u ON u.id = c.author_id
     WHERE c.id = $1`,
    [commentId]
  );
  const row = result.rows[0];
  if (!row) return null;
  return {
    ...row,
    created_at: toIsoUtc(row.created_at),
  };
}

module.exports = {
  getMessageRecipientIds,
  markTicketRead,
  getUnreadCountForTicket,
  getNotificationList,
  getNotificationCounts,
  getNotificationSummary,
  getDashboardMessageStats,
  enrichComment,
  toIsoUtc,
};
