import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, CalendarDays, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PersianDatePicker } from "@/components/PersianDatePicker";
import {
  addGregorianDays,
  formatShamsiDateShort,
  todayGregorian,
  yesterdayGregorian,
} from "@/lib/shamsi";
import { cn } from "@/lib/utils";

const QUICK_FILTERS = [
  { id: "today", label: "امروز" },
  { id: "yesterday", label: "دیروز" },
  { id: "all", label: "همه" },
];

export function WorkLogDateFilter({ mode, date, onModeChange, onDateChange, compact = false }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const [menuStyle, setMenuStyle] = useState(null);
  const isAll = mode === "all";

  useEffect(() => {
    const onClickOutside = (e) => {
      if (rootRef.current?.contains(e.target) || menuRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    if (open) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  useEffect(() => {
    if (!open || !triggerRef.current) return;

    const updatePosition = () => {
      const rect = triggerRef.current.getBoundingClientRect();
      const menuWidth = 240;
      const padding = 8;
      let left = rect.left + (rect.width - menuWidth) / 2;
      if (left + menuWidth > window.innerWidth - padding) {
        left = window.innerWidth - menuWidth - padding;
      }
      left = Math.max(padding, left);

      setMenuStyle({ top: rect.bottom + 6, left, width: menuWidth });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  const applyQuick = (id) => {
    if (id === "all") {
      onModeChange("all");
      setOpen(false);
      return;
    }
    onModeChange("day");
    onDateChange(id === "today" ? todayGregorian() : yesterdayGregorian());
  };

  const activeQuick =
    mode === "all" ? "all" : date === todayGregorian() ? "today" : date === yesterdayGregorian() ? "yesterday" : null;

  return (
    <div ref={rootRef} className={cn("flex flex-wrap items-center gap-2", compact && "contents")}>
      {QUICK_FILTERS.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => applyQuick(item.id)}
          className={cn(
            "rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors sm:px-3 sm:py-1.5 sm:text-sm",
            activeQuick === item.id
              ? "border-primary bg-primary text-primary-foreground shadow-sm"
              : "border-white/70 bg-white/70 text-slate-700 hover:border-primary/30 backdrop-blur-sm"
          )}
        >
          {item.label}
        </button>
      ))}

      {!isAll && (
        <div className="flex shrink-0 items-center gap-0.5 rounded-xl border border-white/70 bg-white/70 p-0.5 backdrop-blur-sm">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onDateChange(addGregorianDays(date, -1))}
            aria-label="روز قبل"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>

          <button
            ref={triggerRef}
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className={cn(
              "flex h-7 w-[7.25rem] items-center justify-between gap-1 rounded-md px-2 text-start sm:w-[8.5rem]",
              open && "bg-primary/5 text-primary"
            )}
          >
            <CalendarDays className="h-3.5 w-3.5 shrink-0" />
            <span className="fa-num truncate text-xs font-semibold sm:text-sm">{formatShamsiDateShort(date)}</span>
            <ChevronDown className={cn("h-3 w-3 shrink-0 opacity-60", open && "rotate-180")} />
          </button>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onDateChange(addGregorianDays(date, 1))}
            aria-label="روز بعد"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {open &&
        menuStyle &&
        createPortal(
          <div
            ref={menuRef}
            className="fixed z-[200] rounded-xl border border-white/70 bg-white/95 p-1.5 shadow-xl backdrop-blur-xl"
            style={menuStyle}
          >
            <PersianDatePicker
              value={date}
              onChange={(v) => {
                onDateChange(v);
                setOpen(false);
              }}
            />
          </div>,
          document.body
        )}
    </div>
  );
}
