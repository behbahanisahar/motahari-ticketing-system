import { toJalaali } from "jalaali-js";

const PERSIAN_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
const PERSIAN_DIGIT_CHARS = "۰۱۲۳۴۵۶۷۸۹";
const ARABIC_DIGIT_CHARS = "٠١٢٣٤٥٦٧٨٩";

const PERSIAN_MONTHS = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
];

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

/** Format a duration in hours for admin reports (Persian). */
export function formatDurationFa(hours) {
  if (hours == null || hours === "" || !Number.isFinite(Number(hours)) || Number(hours) < 0) {
    return "—";
  }
  const h = Number(hours);
  if (h < 1) {
    const mins = Math.max(1, Math.round(h * 60));
    return `${formatNumber(mins)} دقیقه`;
  }
  if (h < 48) {
    const rounded = Math.round(h * 10) / 10;
    return `${formatNumber(rounded)} ساعت`;
  }
  const days = Math.floor(h / 24);
  const remHours = Math.round(h % 24);
  if (remHours === 0) return `${formatNumber(days)} روز`;
  return `${formatNumber(days)} روز و ${formatNumber(remHours)} ساعت`;
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
export function getTehranParts(date) {
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

function toShamsi(parts) {
  return toJalaali(parts.year, parts.month + 1, parts.day);
}

/** Shamsi label from Tehran calendar day. */
function formatShamsiLabel(parts, options = {}) {
  const { jy, jm, jd } = toShamsi(parts);
  const withYear = options.year != null;
  const withMonth = options.month != null;
  const withDay = options.day != null;
  const bits = [];
  if (withDay) bits.push(String(jd));
  if (withMonth) bits.push(PERSIAN_MONTHS[jm - 1]);
  if (withYear) bits.push(String(jy));
  return bits.join(" ");
}

export function formatDateFa(iso, options = { month: "short", day: "numeric" }) {
  const date = parseAppDate(iso);
  if (!date) return "";
  const parts = getTehranParts(date);
  return toPersianDigits(formatShamsiLabel(parts, options));
}

export function formatDateTimeFa(iso) {
  const date = parseAppDate(iso);
  if (!date) return "";
  const parts = getTehranParts(date);
  const dateLabel = formatShamsiLabel(parts, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const time = `${pad2(parts.hour)}:${pad2(parts.minute)}`;
  return toPersianDigits(`${dateLabel}، ${time}`);
}

/** Compact Tehran/Shamsi time for chat bubbles and notification rows. */
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

  const dateLabel = formatShamsiLabel(parts, { month: "short", day: "numeric" });
  return toPersianDigits(`${dateLabel} ${time}`);
}
