const PERSIAN_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
const PERSIAN_DIGIT_CHARS = "۰۱۲۳۴۵۶۷۸۹";
const ARABIC_DIGIT_CHARS = "٠١٢٣٤٥٦٧٨٩";

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

const TEHRAN_TZ = "Asia/Tehran";

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

  // Date-only: keep calendar day stable in Tehran noon.
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const d = new Date(`${raw}T12:00:00+03:30`);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  // Already has timezone / Z — absolute instant
  if (/[zZ]|[+-]\d{2}:?\d{2}$/.test(raw)) {
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  // No timezone: API/DB should send UTC; append Z so browsers don't use local OS TZ
  const normalized = raw.includes("T") ? raw : raw.replace(" ", "T");
  const d = new Date(`${normalized}Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatDateFa(iso, options = { month: "short", day: "numeric" }) {
  const date = parseAppDate(iso);
  if (!date) return "";
  return toPersianDigits(
    date.toLocaleDateString("fa-IR", {
      timeZone: TEHRAN_TZ,
      ...options,
    })
  );
}

export function formatDateTimeFa(iso) {
  const date = parseAppDate(iso);
  if (!date) return "";
  return toPersianDigits(
    date.toLocaleString("fa-IR", {
      timeZone: TEHRAN_TZ,
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
  );
}

/** Compact Tehran time for chat bubbles and notification rows. */
export function formatMessageTimeFa(iso) {
  const date = parseAppDate(iso);
  if (!date) return "";

  const now = new Date();
  const tehranNow = new Date(now.toLocaleString("en-US", { timeZone: TEHRAN_TZ }));
  const tehranDate = new Date(date.toLocaleString("en-US", { timeZone: TEHRAN_TZ }));

  const sameDay =
    tehranNow.getFullYear() === tehranDate.getFullYear() &&
    tehranNow.getMonth() === tehranDate.getMonth() &&
    tehranNow.getDate() === tehranDate.getDate();

  if (sameDay) {
    return toPersianDigits(
      date.toLocaleTimeString("fa-IR", {
        timeZone: TEHRAN_TZ,
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
    );
  }

  return toPersianDigits(
    date.toLocaleString("fa-IR", {
      timeZone: TEHRAN_TZ,
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
  );
}
