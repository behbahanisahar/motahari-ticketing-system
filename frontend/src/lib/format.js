const PERSIAN_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
const PERSIAN_DIGIT_CHARS = "۰۱۲۳۴۵۶۷۸۹";
const ARABIC_DIGIT_CHARS = "٠١٢٣٤٥٦٧٨٩";

/** Iran has no DST (fixed UTC+03:30). Avoid Intl Asia/Tehran — old ICU/Windows data is often wrong. */
const TEHRAN_OFFSET_MS = 3.5 * 60 * 60 * 1000;

export function toPersianDigits(value) {
  return String(value).replace(/\d/g, (d) => PERSIAN_DIGITS[Number(d)]);
}

/** Convert Persian/Arabic digits to ASCII 0-9 */
export function toEnglishDigits(value) {
  return String(value).replace(/[۰-۹٠-٩]/g, (ch) => {
    const persianIndex = PERSIAN_DIGIT_CHARS.indexOf(ch);
    if (persianIndex >= 0) return String(persianIndex);
    const arabicIndex = ARABIC_DIGIT_CHARS.indexOf(ch);
    if (arabicIndex >= 0) return String(arabicIndex);
    return ch;
  });
}

/** Strip non-digits after normalizing localized numerals */
export function sanitizeIntegerInput(value) {
  return toEnglishDigits(value).replace(/\D/g, "");
}

export function parseLocalizedInteger(value) {
  const normalized = sanitizeIntegerInput(value);
  if (normalized === "") return null;
  const num = Number(normalized);
  return Number.isNaN(num) ? null : num;
}

export function formatNumber(value) {
  if (value === null || value === undefined || value === "") return "";
  const num = Number(value);
  if (Number.isNaN(num)) return toPersianDigits(value);
  return toPersianDigits(new Intl.NumberFormat("en-US").format(num));
}

export function formatMinutesAsHours(minutes) {
  if (!minutes) return "";
  const hours = Math.round((minutes / 60) * 10) / 10;
  return `${formatNumber(hours)} ساعت`;
}

/** Parse API timestamps consistently (values are UTC instants). */
export function parseAppDate(value) {
  if (!value && value !== 0) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === "number") {
    const ms = value < 1e12 ? value * 1000 : value;
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const raw = String(value).trim();
  if (!raw) return null;

  // Date-only: keep calendar day stable at Tehran noon.
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const d = new Date(`${raw}T12:00:00+03:30`);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  // Already has timezone / Z — absolute instant
  if (/[zZ]|[+-]\d{2}:?\d{2}$/.test(raw)) {
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  // No timezone: treat as UTC so browsers don't apply the OS timezone
  const normalized = raw.includes("T") ? raw : raw.replace(" ", "T");
  const d = new Date(`${normalized}Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

/** Wall-clock parts in Asia/Tehran from a UTC instant. */
function getTehranParts(date) {
  const shifted = new Date(date.getTime() + TEHRAN_OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
    second: shifted.getUTCSeconds(),
  };
}

/** Persian labels for Gregorian day/month (time comes from fixed-offset parts). */
function formatTehranDateLabel(parts, options = {}) {
  const fakeUtc = new Date(Date.UTC(parts.year, parts.month, parts.day, 12, 0, 0));
  return new Intl.DateTimeFormat("fa-IR-u-ca-gregory", {
    timeZone: "UTC",
    ...options,
  }).format(fakeUtc);
}

export function formatDateFa(iso, options = { month: "short", day: "numeric" }) {
  const date = parseAppDate(iso);
  if (!date) return "";
  const parts = getTehranParts(date);
  return toPersianDigits(formatTehranDateLabel(parts, options));
}

export function formatDateTimeFa(iso) {
  const date = parseAppDate(iso);
  if (!date) return "";
  const parts = getTehranParts(date);
  const dateLabel = formatTehranDateLabel(parts, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const time = `${pad2(parts.hour)}:${pad2(parts.minute)}`;
  return toPersianDigits(`${dateLabel}، ${time}`);
}

/** Compact Tehran time for chat bubbles and notification rows. */
export function formatMessageTimeFa(iso) {
  const date = parseAppDate(iso);
  if (!date) return "";

  const parts = getTehranParts(date);
  const nowParts = getTehranParts(new Date());
  const time = `${pad2(parts.hour)}:${pad2(parts.minute)}`;

  const sameDay =
    parts.year === nowParts.year &&
    parts.month === nowParts.month &&
    parts.day === nowParts.day;

  if (sameDay) {
    return toPersianDigits(time);
  }

  const dateLabel = formatTehranDateLabel(parts, { month: "short", day: "numeric" });
  return toPersianDigits(`${dateLabel} ${time}`);
}
