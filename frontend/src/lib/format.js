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

export function formatDateFa(iso, options = { month: "short", day: "numeric" }) {
  if (!iso) return "";
  return toPersianDigits(new Date(iso).toLocaleDateString("fa-IR", options));
}

export function formatDateTimeFa(iso) {
  if (!iso) return "";
  return toPersianDigits(
    new Date(iso).toLocaleString("fa-IR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  );
}
