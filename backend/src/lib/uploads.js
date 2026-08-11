const fs = require("fs");
const path = require("path");

const UPLOADS_DIR = path.resolve(__dirname, "../../uploads/tickets");
const MAX_SCREENSHOT_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_SCREENSHOT_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

function ensureUploadsDir() {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  return UPLOADS_DIR;
}

function screenshotAbsolutePath(filename) {
  if (!filename) return null;
  const safe = path.basename(String(filename));
  return path.join(UPLOADS_DIR, safe);
}

module.exports = {
  UPLOADS_DIR,
  MAX_SCREENSHOT_BYTES,
  ALLOWED_SCREENSHOT_MIME,
  ensureUploadsDir,
  screenshotAbsolutePath,
};
