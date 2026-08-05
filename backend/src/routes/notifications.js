const express = require("express");
const { requireAuth } = require("../middleware/auth");
const { asyncHandler } = require("../lib/asyncHandler");
const {
  getNotificationList,
  getNotificationSummary,
  getDashboardMessageStats,
  markTicketsRead,
} = require("../lib/notifications");

const router = express.Router();

router.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { page, limit, q, filter } = req.query;
    const result = await getNotificationList(req.user, { page, limit, q, filter });
    res.json(result);
  })
);

router.post(
  "/mark-seen",
  requireAuth,
  asyncHandler(async (req, res) => {
    const ticketIds = Array.isArray(req.body?.ticketIds) ? req.body.ticketIds : [];
    const marked = await markTicketsRead(req.user.id, ticketIds);
    const summary = await getNotificationSummary(req.user);
    res.json({ marked, summary });
  })
);

router.get(
  "/summary",
  requireAuth,
  asyncHandler(async (req, res) => {
    const summary = await getNotificationSummary(req.user);
    res.json(summary);
  })
);

router.get(
  "/dashboard",
  requireAuth,
  asyncHandler(async (req, res) => {
    const stats = await getDashboardMessageStats(req.user);
    res.json(stats);
  })
);

module.exports = router;
