const PRIORITIES = ["low", "medium", "high", "urgent"];
const STATUSES = ["queued", "in_progress", "done", "rejected"];

const CATEGORIES = [
  "windows",
  "printer",
  "network",
  "hardware",
  "support",
  "rayavaran",
  "office_automation",
  "other",
];

const CATEGORY_LABELS = {
  windows: "نصب ویندوز",
  printer: "پرینتر",
  network: "شبکه و اینترنت",
  hardware: "سخت‌افزار",
  support: "پاسخ به سوال",
  rayavaran: "سیستم رایاوران",
  office_automation: "اتوماسیون اداری و چارگون",
  other: "سایر",
};

module.exports = { PRIORITIES, STATUSES, CATEGORIES, CATEGORY_LABELS };
