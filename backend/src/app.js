require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const config = require("./config");
const { seedAdmins } = require("./seed");

const authRoutes = require("./routes/auth");
const ticketRoutes = require("./routes/tickets");
const metaRoutes = require("./routes/meta");
const statsRoutes = require("./routes/stats");
const notificationRoutes = require("./routes/notifications");
const worklogRoutes = require("./routes/worklogs");

let appInstance = null;
let initPromise = null;
let seedPromise = null;

function ensureSeeded(req, res, next) {
  if (!seedPromise) {
    seedPromise = seedAdmins().catch((err) => {
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

  app.get("/api/health", (req, res) => res.json({ ok: true }));

  app.use("/api/auth", authRoutes);
  app.use("/api/tickets", ticketRoutes);
  app.use("/api/meta", metaRoutes);
  app.use("/api/stats", statsRoutes);
  app.use("/api/notifications", notificationRoutes);
  app.use("/api/worklogs", worklogRoutes);

  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: "خطای داخلی سرور رخ داده است." });
  });

  return app;
}

async function initApp() {
  if (appInstance) return appInstance;
  if (!initPromise) {
    initPromise = seedAdmins().then(() => {
      appInstance = buildApp();
      return appInstance;
    });
  }
  return initPromise;
}

module.exports = { initApp, buildApp };
