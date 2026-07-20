const vercelUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null;

module.exports = {
  PORT: process.env.PORT || 4000,
  CORS_ORIGIN: process.env.CORS_ORIGIN || vercelUrl || "http://localhost:5173",
  DATABASE_URL:
    process.env.DATABASE_URL ||
    "postgres://ticketing_user:ticketing_pass@localhost:5432/ticketing",
  JWT_SECRET: process.env.JWT_SECRET || "dev-only-secret-change-in-production",
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "12h",
  COOKIE_SECURE: process.env.COOKIE_SECURE === "true",
};
