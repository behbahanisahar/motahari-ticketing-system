const PRIORITIES = ["low", "medium", "high", "urgent"];
const STATUSES = ["queued", "in_progress", "done", "rejected"];

const ACTIVE_CATEGORIES = [
  "hardware",
  "windows",
  "rayavaran",
  "office_automation",
  "insurance",
  "support",
  "user_error",
];

const LEGACY_CATEGORIES = ["printer", "network", "other"];

const CATEGORIES = [...ACTIVE_CATEGORIES, ...LEGACY_CATEGORIES];

const CATEGORY_LABELS = {
  hardware: "سخت افزار و پرینتر",
  windows: "ویندوز و نصب آن",
  rayavaran: "سیستم رایاوران و HIS",
  office_automation: "اتوماسیون اداری، چارگون و پرسنلی",
  insurance: "سامانه‌های بیمه‌ای",
  support: "پاسخ به سوال",
  user_error: "خطای کاربر",
  printer: "پرینتر",
  network: "شبکه و اینترنت",
  other: "سایر",
};

function isAllowedTicketCategory(category, current) {
  if (category == null || category === "") return true;
  if (ACTIVE_CATEGORIES.includes(category)) return true;
  return Boolean(current) && category === current && CATEGORIES.includes(category);
}

module.exports = {
  PRIORITIES,
  STATUSES,
  CATEGORIES,
  ACTIVE_CATEGORIES,
  LEGACY_CATEGORIES,
  CATEGORY_LABELS,
  isAllowedTicketCategory,
};
