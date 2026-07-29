import { jalaaliMonthLength, toGregorian, toJalaali } from "jalaali-js";
import { getTehranParts, toPersianDigits } from "@/lib/format";

export const PERSIAN_MONTHS = [
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

export const PERSIAN_WEEKDAYS_SHORT = ["ش", "ی", "د", "س", "چ", "پ", "ج"];

export function formatGregorian(gy, gm, gd) {
  return `${gy}-${String(gm).padStart(2, "0")}-${String(gd).padStart(2, "0")}`;
}

export function todayGregorian() {
  const parts = getTehranParts(new Date());
  return formatGregorian(parts.year, parts.month + 1, parts.day);
}

export function yesterdayGregorian() {
  return addGregorianDays(todayGregorian(), -1);
}

export function parseGregorianDate(dateStr) {
  if (!dateStr) return null;
  const iso = String(dateStr).trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [gy, gm, gd] = iso.split("-").map(Number);
  if (!Number.isFinite(gy) || !Number.isFinite(gm) || !Number.isFinite(gd)) return null;
  if (gm < 1 || gm > 12 || gd < 1 || gd > 31) return null;
  return { gy, gm, gd, iso };
}

export function currentJalaali() {
  const parts = getTehranParts(new Date());
  return toJalaali(parts.year, parts.month + 1, parts.day);
}

export function gregorianToJalaali(dateStr) {
  const parsed = parseGregorianDate(dateStr);
  if (!parsed) return currentJalaali();
  return toJalaali(parsed.gy, parsed.gm, parsed.gd);
}

export function jalaaliToGregorian(jy, jm, jd) {
  const g = toGregorian(jy, jm, jd);
  return formatGregorian(g.gy, g.gm, g.gd);
}

export function jalaaliDaysInMonth(jy, jm) {
  return jalaaliMonthLength(jy, jm);
}

export function jalaaliMonthStartWeekday(jy, jm) {
  const g = toGregorian(jy, jm, 1);
  const d = new Date(g.gy, g.gm - 1, g.gd);
  return (d.getDay() + 1) % 7;
}

export function addGregorianDays(dateStr, delta) {
  const parsed = parseGregorianDate(dateStr);
  if (!parsed) return todayGregorian();
  const d = new Date(`${parsed.iso}T12:00:00`);
  d.setDate(d.getDate() + delta);
  return formatGregorian(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

export function formatShamsiDateLong(dateStr) {
  const parsed = parseGregorianDate(dateStr);
  if (!parsed) return "";
  const { jy, jm, jd } = toJalaali(parsed.gy, parsed.gm, parsed.gd);
  const weekday = new Date(`${parsed.iso}T12:00:00`).toLocaleDateString("fa-IR", { weekday: "long" });
  return toPersianDigits(`${weekday}، ${jd} ${PERSIAN_MONTHS[jm - 1]} ${jy}`);
}

export function formatShamsiDateShort(dateStr) {
  const parsed = parseGregorianDate(dateStr);
  if (!parsed) return "";
  const { jy, jm, jd } = toJalaali(parsed.gy, parsed.gm, parsed.gd);
  return toPersianDigits(`${jd} ${PERSIAN_MONTHS[jm - 1]} ${jy}`);
}

export function normalizeGregorianDate(dateStr) {
  return parseGregorianDate(dateStr)?.iso ?? null;
}
