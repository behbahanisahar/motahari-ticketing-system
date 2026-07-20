const jalaali = require("jalaali-js");

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

function currentShamsi() {
  const now = new Date();
  return jalaali.toJalaali(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

function shamsiMonthRange(jYear, jMonth) {
  const startG = jalaali.toGregorian(jYear, jMonth, 1);
  const lastDay = jalaali.jalaaliMonthLength(jYear, jMonth);
  const endG = jalaali.toGregorian(jYear, jMonth, lastDay);

  const start = new Date(startG.gy, startG.gm - 1, startG.gd, 0, 0, 0, 0);
  const end = new Date(endG.gy, endG.gm - 1, endG.gd, 23, 59, 59, 999);

  return {
    start: start.toISOString(),
    end: end.toISOString(),
    label: `${PERSIAN_MONTHS[jMonth - 1]} ${jYear}`,
  };
}

function shamsiYearRange(jYear) {
  const startG = jalaali.toGregorian(jYear, 1, 1);
  const lastDay = jalaali.jalaaliMonthLength(jYear, 12);
  const endG = jalaali.toGregorian(jYear, 12, lastDay);

  const start = new Date(startG.gy, startG.gm - 1, startG.gd, 0, 0, 0, 0);
  const end = new Date(endG.gy, endG.gm - 1, endG.gd, 23, 59, 59, 999);

  return {
    start: start.toISOString(),
    end: end.toISOString(),
    label: `کل سال ${jYear}`,
  };
}

function resolvePeriod(jYear, jMonth) {
  if (!jMonth || jMonth === "all") {
    return { ...shamsiYearRange(jYear), jMonth: "all" };
  }
  return { ...shamsiMonthRange(jYear, jMonth), jMonth };
}

module.exports = {
  PERSIAN_MONTHS,
  shamsiMonthRange,
  shamsiYearRange,
  resolvePeriod,
  currentShamsi,
};
