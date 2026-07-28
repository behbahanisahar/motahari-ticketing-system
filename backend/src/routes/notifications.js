const express = require("express");
const { requireAuth } = require("../middleware/auth");
const { asyncHandler } = require("../lib/asyncHandler");
const {
  getNotificationList,
  getNotificationSummary,
  getDashboardMessageStats,
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
