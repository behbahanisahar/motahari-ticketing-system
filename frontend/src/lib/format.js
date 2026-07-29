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

function tehranGregorianIso(parts) {
  return `${parts.year}-${pad2(parts.month + 1)}-${pad2(parts.day)}`;
}

/** Same style as worklog: «سه‌شنبه، ۷ مرداد ۱۴۰۵» */
function formatShamsiLongFromParts(parts) {
  const { jy, jm, jd } = toShamsi(parts);
  const weekday = new Date(`${tehranGregorianIso(parts)}T12:00:00`).toLocaleDateString("fa-IR", {
    weekday: "long",
  });
  return `${weekday}، ${jd} ${PERSIAN_MONTHS[jm - 1]} ${jy}`;
}

/** Same style as worklog table cells: «۷ مرداد ۱۴۰۵» */
function formatShamsiShortFromParts(parts) {
  const { jy, jm, jd } = toShamsi(parts);
  return `${jd} ${PERSIAN_MONTHS[jm - 1]} ${jy}`;
}

/**
 * Shamsi date like worklog.
 * @param {object} [options]
 * @param {'long'|'short'} [options.style='long'] long includes weekday
 */
export function formatDateFa(iso, options = {}) {
  const date = parseAppDate(iso);
  if (!date) return "";
  const parts = getTehranParts(date);
  const style = options.style === "short" ? "short" : "long";
  // Legacy callers passed Intl-like options — treat as long (worklog) format.
  const label = style === "short" ? formatShamsiShortFromParts(parts) : formatShamsiLongFromParts(parts);
  return toPersianDigits(label);
}

export function formatDateTimeFa(iso) {
  const date = parseAppDate(iso);
  if (!date) return "";
  const parts = getTehranParts(date);
  const time = `${pad2(parts.hour)}:${pad2(parts.minute)}`;
  return toPersianDigits(`${formatShamsiLongFromParts(parts)}، ${time}`);
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

  return toPersianDigits(`${formatShamsiShortFromParts(parts)} ${time}`);
}
