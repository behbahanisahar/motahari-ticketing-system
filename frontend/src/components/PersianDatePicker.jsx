import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  currentJalaali,
  gregorianToJalaali,
  jalaaliDaysInMonth,
  jalaaliMonthStartWeekday,
  jalaaliToGregorian,
  PERSIAN_MONTHS,
  PERSIAN_WEEKDAYS_SHORT,
  todayGregorian,
} from "@/lib/shamsi";
import { toPersianDigits } from "@/lib/format";
import { cn } from "@/lib/utils";

export function PersianDatePicker({ value, onChange, className }) {
  const selected = gregorianToJalaali(value || todayGregorian());
  const today = currentJalaali();
  const [viewJy, setViewJy] = useState(selected.jy);
  const [viewJm, setViewJm] = useState(selected.jm);

  useEffect(() => {
    const j = gregorianToJalaali(value || todayGregorian());
    setViewJy(j.jy);
    setViewJm(j.jm);
  }, [value]);

  const daysInMonth = jalaaliDaysInMonth(viewJy, viewJm);
  const startOffset = jalaaliMonthStartWeekday(viewJy, viewJm);
  const cells = useMemo(() => {
    const list = [];
    for (let i = 0; i < startOffset; i += 1) list.push(null);
    for (let d = 1; d <= daysInMonth; d += 1) list.push(d);
    return list;
  }, [daysInMonth, startOffset]);

  const shiftMonth = (delta) => {
    let nextJm = viewJm + delta;
    let nextJy = viewJy;
    if (nextJm < 1) {
      nextJm = 12;
      nextJy -= 1;
    } else if (nextJm > 12) {
      nextJm = 1;
      nextJy += 1;
    }
    setViewJy(nextJy);
    setViewJm(nextJm);
  };

  const pickDay = (day) => {
    onChange?.(jalaaliToGregorian(viewJy, viewJm, day));
  };

  const isSelected = (day) => selected.jy === viewJy && selected.jm === viewJm && selected.jd === day;
  const isToday = (day) => today.jy === viewJy && today.jm === viewJm && today.jd === day;

  return (
    <div className={cn("w-[15rem] select-none", className)}>
      <div className="flex items-center justify-between gap-0.5 px-1 py-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => shiftMonth(-1)}
          aria-label="ماه قبل"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
        <p className="fa-num text-[11px] font-bold text-foreground">
          {PERSIAN_MONTHS[viewJm - 1]} {toPersianDigits(viewJy)}
        </p>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => shiftMonth(1)}
          aria-label="ماه بعد"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-px px-1 pb-1">
        {PERSIAN_WEEKDAYS_SHORT.map((name) => (
          <div key={name} className="text-center text-[9px] font-semibold text-muted-foreground">
            {name}
          </div>
        ))}
        {cells.map((day, index) =>
          day === null ? (
            <div key={`empty-${index}`} className="h-6" />
          ) : (
            <button
              key={day}
              type="button"
              onClick={() => pickDay(day)}
              className={cn(
                "fa-num mx-auto flex h-6 w-6 items-center justify-center rounded text-[11px] font-medium transition-colors",
                isSelected(day)
                  ? "bg-primary text-primary-foreground"
                  : isToday(day)
                    ? "bg-primary/10 text-primary"
                    : "text-foreground hover:bg-slate-100"
              )}
            >
              {toPersianDigits(day)}
            </button>
          )
        )}
      </div>

      <button
        type="button"
        onClick={() => onChange?.(todayGregorian())}
        className="mx-1 mb-1 w-[calc(100%-0.5rem)] rounded border border-slate-200 py-1 text-[10px] font-medium text-primary hover:bg-primary/5"
      >
        امروز
      </button>
    </div>
  );
}
