require("dotenv").config();
const path = require("path");
const fs = require("fs");
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const config = require("./config");
const { seedAdmins } = require("./seed");
const { ensureSchema } = require("./ensureSchema");

const authRoutes = require("./routes/auth");
const ticketRoutes = require("./routes/tickets");
const metaRoutes = require("./routes/meta");
const statsRoutes = require("./routes/stats");
const notificationRoutes = require("./routes/notifications");
const worklogRoutes = require("./routes/worklogs");

const FRONTEND_DIST = path.resolve(__dirname, "../../frontend/dist");

let appInstance = null;
let initPromise = null;
let seedPromise = null;

function ensureSeeded(req, res, next) {
  if (!seedPromise) {
    seedPromise = ensureSchema()
      .then(() => seedAdmins())
      .catch((err) => {
        seedPromise = null;
        throw err;
      });
  }
  seedPromise.then(() => next()).catch(next);
}

function buildApp() {
  const app = express();

  const allowedOrigins = config.CORS_ORIGIN.split(",").map((o) => o.trim()).filter(Boolean);

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(null, false);
        }
      },
      credentials: true,
    })
  );
  app.use(express.json());
  app.use(cookieParser());
  app.use(ensureSeeded);

  app.get("/api/health", async (req, res) => {
    try {
      const db = require("./db");
      const result = await db.query(
        "SELECT now() AS db_now, current_setting('TIMEZONE') AS db_timezone"
      );
      const row = result.rows[0];
      const now = new Date();
      const dbNow = row.db_now instanceof Date ? row.db_now : new Date(row.db_now);
      // Iran is fixed UTC+03:30 (no DST)
      const tehranOffsetMs = 3.5 * 60 * 60 * 1000;
      const tehran = new Date(now.getTime() + tehranOffsetMs);
      const pad = (n) => String(n).padStart(2, "0");
      const tehranNow = `${tehran.getUTCFullYear()}-${pad(tehran.getUTCMonth() + 1)}-${pad(tehran.getUTCDate())} ${pad(tehran.getUTCHours())}:${pad(tehran.getUTCMinutes())}:${pad(tehran.getUTCSeconds())} +0330`;

      res.json({
        ok: true,
        serverNowUtc: now.toISOString(),
        dbNowUtc: Number.isNaN(dbNow.getTime()) ? String(row.db_now) : dbNow.toISOString(),
        tehranNow,
        dbSessionTimezone: row.db_timezone,
        /** Minutes east of UTC for this Node process (Tehran must be -210). */
        nodeTimezoneOffsetMinutes: now.getTimezoneOffset(),
        expectedTehranOffsetMinutes: -210,
        hint:
          now.getTimezoneOffset() === -210
            ? "Node timezone looks like Tehran."
            : "Windows/OS timezone is NOT Tehran. Set timezone to (UTC+03:30) Tehran, then restart Node. Only changing the clock time is not enough.",
      });
    } catch (err) {
      res.status(500).json({
        ok: false,
        serverNowUtc: new Date().toISOString(),
        error: err.message,
      });
    }
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/tickets", ticketRoutes);
  app.use("/api/meta", metaRoutes);
  app.use("/api/stats", statsRoutes);
  app.use("/api/notifications", notificationRoutes);
  app.use("/api/worklogs", worklogRoutes);

  // Serve built frontend from the same origin (fixes LAN "Failed to fetch" / CORS).
  if (fs.existsSync(FRONTEND_DIST)) {
    app.use(express.static(FRONTEND_DIST));
    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api")) return next();
      res.sendFile(path.join(FRONTEND_DIST, "index.html"));
    });
  }

  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: "خطای داخلی سرور رخ داده است." });
  });

  return app;
}

async function initApp() {
  if (appInstance) return appInstance;
  if (!initPromise) {
    initPromise = ensureSchema()
      .then(() => seedAdmins())
      .then(() => {
        appInstance = buildApp();
        return appInstance;
      });
  }
  return initPromise;
}

module.exports = { initApp, buildApp };
