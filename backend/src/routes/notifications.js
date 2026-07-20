const express = require("express");
const { requireAuth } = require("../middleware/auth");
const {
  getNotificationList,
  getNotificationSummary,
  getDashboardMessageStats,
} = require("../lib/notifications");

const router = express.Router();

router.get("/", requireAuth, async (req, res) => {
  const { page, limit, q, filter } = req.query;
  const result = await getNotificationList(req.user, { page, limit, q, filter });
  res.json(result);
});

router.get("/summary", requireAuth, async (req, res) => {
  const summary = await getNotificationSummary(req.user);
  res.json(summary);
});

router.get("/dashboard", requireAuth, async (req, res) => {
  const stats = await getDashboardMessageStats(req.user);
  res.json(stats);
});

module.exports = router;
