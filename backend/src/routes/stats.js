const express = require("express");
const db = require("../db");
const { requireAuth, requireRole } = require("../middleware/auth");
const { PERSIAN_MONTHS, resolvePeriod, currentShamsi } = require("../lib/shamsi");
const { STATUSES, PRIORITIES } = require("../lib/constants");

const router = express.Router();

router.get("/calendar", requireAuth, requireRole("admin"), (req, res) => {
  const now = currentShamsi();
  res.json({
    jYear: now.jy,
    jMonth: now.jm,
    months: PERSIAN_MONTHS,
  });
});

router.get("/", requireAuth, requireRole("admin"), async (req, res) => {
  const now = currentShamsi();
  const jYear = parseInt(req.query.jYear, 10) || now.jy;
  const jMonth = req.query.jMonth === "all" ? "all" : parseInt(req.query.jMonth, 10) || now.jm;
  const { status, department } = req.query;

  if (jMonth !== "all" && (jMonth < 1 || jMonth > 12)) {
    return res.status(400).json({ error: "ماه شمسی نامعتبر است." });
  }

  const period = resolvePeriod(jYear, jMonth);
  const params = [period.start, period.end];
  let extraClauses = "";

  if (status && STATUSES.includes(status)) {
    params.push(status);
    extraClauses += ` AND t.status = $${params.length}`;
  }
  if (department) {
    params.push(department);
    extraClauses += ` AND t.team = $${params.length}`;
  }

  const ticketFilter = `t.created_at >= $1::timestamptz AND t.created_at <= $2::timestamptz${extraClauses}`;

  const [
    byStatusRes,
    byDeptRes,
    byAdminRes,
    byPriorityRes,
    summaryRes,
    ticketsRes,
  ] = await Promise.all([
    db.query(
      `SELECT t.status, COUNT(*)::int AS count
       FROM tickets t WHERE ${ticketFilter}
       GROUP BY t.status ORDER BY count DESC`,
      params
    ),
    db.query(
      `SELECT t.team AS department, COUNT(*)::int AS count
       FROM tickets t WHERE ${ticketFilter}
       GROUP BY t.team ORDER BY t.team ASC`,
      params
    ),
    db.query(
      `SELECT u.id, u.username, u.display_name,
              COUNT(t.id)::int AS assigned_count,
              COUNT(*) FILTER (WHERE t.status = 'done')::int AS done_count,
              COUNT(*) FILTER (WHERE t.status = 'in_progress')::int AS in_progress_count,
              COUNT(*) FILTER (WHERE t.status = 'queued')::int AS queued_count,
              COUNT(*) FILTER (WHERE t.status = 'rejected')::int AS rejected_count
       FROM users u
       LEFT JOIN tickets t ON t.assigned_to = u.id AND ${ticketFilter}
       WHERE u.role = 'admin' AND u.is_active = true
       GROUP BY u.id, u.username, u.display_name
       ORDER BY assigned_count DESC, done_count DESC`,
      params
    ),
    db.query(
      `SELECT t.priority, COUNT(*)::int AS count
       FROM tickets t WHERE ${ticketFilter}
       GROUP BY t.priority ORDER BY count DESC`,
      params
    ),
    db.query(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE t.assigned_to IS NULL)::int AS unassigned,
         COUNT(DISTINCT t.requester_id)::int AS unique_requesters,
         ROUND(AVG(EXTRACT(EPOCH FROM (t.updated_at - t.created_at)) / 3600)
           FILTER (WHERE t.status = 'done'), 1)::float AS avg_resolution_hours
       FROM tickets t WHERE ${ticketFilter}`,
      params
    ),
    db.query(
      `SELECT t.id, t.ticket_number, t.subject, t.team, t.status, t.priority,
              t.computer_name, t.created_at, t.updated_at,
              u.display_name AS requester_name,
              a.display_name AS assignee_name
       FROM tickets t
       JOIN users u ON u.id = t.requester_id
       LEFT JOIN users a ON a.id = t.assigned_to
       WHERE ${ticketFilter}
       ORDER BY t.created_at DESC`,
      params
    ),
  ]);

  const summary = summaryRes.rows[0] || {
    total: 0,
    unassigned: 0,
    unique_requesters: 0,
    avg_resolution_hours: null,
  };

  const byPriority = PRIORITIES.map((p) => {
    const row = byPriorityRes.rows.find((r) => r.priority === p);
    return { priority: p, count: row?.count || 0 };
  });

  res.json({
    period: { jYear, jMonth: period.jMonth, label: period.label },
    total: summary.total,
    summary: {
      unassigned: summary.unassigned,
      uniqueRequesters: summary.unique_requesters,
      avgResolutionHours: summary.avg_resolution_hours,
    },
    byStatus: byStatusRes.rows,
    byPriority,
    byDepartment: byDeptRes.rows,
    byAdmin: byAdminRes.rows,
    tickets: ticketsRes.rows,
  });
});

module.exports = router;
