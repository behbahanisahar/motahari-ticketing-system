const express = require("express");
const db = require("../db");
const { requireAuth, requireRole } = require("../middleware/auth");
const { asyncHandler } = require("../lib/asyncHandler");
const { PERSIAN_MONTHS, resolvePeriod, currentShamsi } = require("../lib/shamsi");
const { PRIORITIES, STATUSES, CATEGORIES, CATEGORY_LABELS } = require("../lib/constants");

const router = express.Router();
const TICKETS_DETAIL_LIMIT = 100;

let categoryColumnReady = null;
let closedAtColumnReady = null;

async function ticketsHaveCategoryColumn() {
  if (categoryColumnReady != null) return categoryColumnReady;
  try {
    const result = await db.query(
      `SELECT 1
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'tickets'
         AND column_name = 'category'
       LIMIT 1`
    );
    categoryColumnReady = result.rows.length > 0;
  } catch (_) {
    categoryColumnReady = false;
  }
  return categoryColumnReady;
}

async function ticketsHaveClosedAtColumn() {
  if (closedAtColumnReady != null) return closedAtColumnReady;
  try {
    const result = await db.query(
      `SELECT 1
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'tickets'
         AND column_name = 'closed_at'
       LIMIT 1`
    );
    closedAtColumnReady = result.rows.length > 0;
  } catch (_) {
    closedAtColumnReady = false;
  }
  return closedAtColumnReady;
}

function resolutionHours(row) {
  const closed =
    row.status === "done" || row.status === "rejected"
      ? row.closed_at || row.updated_at
      : null;
  if (!closed || !row.created_at) return null;
  const hours = (new Date(closed) - new Date(row.created_at)) / 3600000;
  if (!Number.isFinite(hours) || hours < 0) return null;
  return Math.round(hours * 10) / 10;
}

function bump(map, key) {
  if (key == null || key === "") return;
  map[key] = (map[key] || 0) + 1;
}

router.get("/calendar", requireAuth, requireRole("admin"), (req, res) => {
  const now = currentShamsi();
  res.json({
    jYear: now.jy,
    jMonth: now.jm,
    months: PERSIAN_MONTHS,
  });
});

router.get(
  "/",
  requireAuth,
  requireRole("admin"),
  asyncHandler(async (req, res) => {
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
    const hasCategory = await ticketsHaveCategoryColumn();
    const hasClosedAt = await ticketsHaveClosedAtColumn();
    const categorySelect = hasCategory ? "t.category" : "NULL::varchar AS category";
    const closedAtSelect = hasClosedAt ? "t.closed_at" : "NULL::timestamptz AS closed_at";

    const [ticketsRes, byAdminRes] = await Promise.all([
      db.query(
        `SELECT t.id, t.ticket_number, t.subject, t.team, t.status, t.priority,
                ${categorySelect},
                t.computer_name, t.created_at, t.updated_at, ${closedAtSelect},
                t.assigned_to, t.requester_id,
                u.display_name AS requester_name,
                a.display_name AS assignee_name
         FROM tickets t
         JOIN users u ON u.id = t.requester_id
         LEFT JOIN users a ON a.id = t.assigned_to
         WHERE ${ticketFilter}
         ORDER BY t.created_at DESC`,
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
    ]);

    const rows = ticketsRes.rows;
    const byStatusMap = {};
    const byPriorityMap = {};
    const byCategoryMap = {};
    const byDepartmentMap = {};
    const requesterIds = new Set();
    let unassigned = 0;
    let resolutionSumHours = 0;
    let resolutionCount = 0;
    let closedCount = 0;

    for (const row of rows) {
      bump(byStatusMap, row.status);
      bump(byPriorityMap, row.priority);
      bump(byCategoryMap, row.category || "none");
      bump(byDepartmentMap, row.team);
      if (row.requester_id != null) requesterIds.add(row.requester_id);
      if (row.assigned_to == null) unassigned += 1;
      const hours = resolutionHours(row);
      row.resolutionHours = hours;
      if (hours != null) {
        resolutionSumHours += hours;
        resolutionCount += 1;
        closedCount += 1;
      }
    }

    const byStatus = Object.entries(byStatusMap).map(([key, count]) => ({
      status: key,
      count,
    }));
    const byPriority = PRIORITIES.map((p) => ({
      priority: p,
      count: byPriorityMap[p] || 0,
    }));
    const byCategory = [
      ...CATEGORIES.map((value) => ({
        category: value,
        label: CATEGORY_LABELS[value] || value,
        count: byCategoryMap[value] || 0,
      })),
      {
        category: "none",
        label: "تعیین نشده",
        count: byCategoryMap.none || 0,
      },
    ];
    const byDepartment = Object.entries(byDepartmentMap)
      .map(([departmentName, count]) => ({ department: departmentName, count }))
      .sort((a, b) => a.department.localeCompare(b.department, "fa"));

    res.json({
      period: { jYear, jMonth: period.jMonth, label: period.label },
      total: rows.length,
      summary: {
        unassigned,
        uniqueRequesters: requesterIds.size,
        closedCount,
        avgResolutionHours:
          resolutionCount > 0 ? Math.round((resolutionSumHours / resolutionCount) * 10) / 10 : null,
      },
      byStatus,
      byPriority,
      byCategory,
      byDepartment,
      byAdmin: byAdminRes.rows,
      tickets: rows.slice(0, TICKETS_DETAIL_LIMIT).map(({ assigned_to, requester_id, ...ticket }) => ticket),
      ticketsLimited: rows.length > TICKETS_DETAIL_LIMIT,
      ticketsLimit: TICKETS_DETAIL_LIMIT,
    });
  })
);

module.exports = router;
