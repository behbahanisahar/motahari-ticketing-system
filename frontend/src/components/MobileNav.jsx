import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { MoreHorizontal, X } from "lucide-react";
import { cn } from "@/lib/utils";

export function MobileNav({ links, moreLinks = [] }) {
  const [moreOpen, setMoreOpen] = useState(false);
  const location = useLocation();
  const hasMore = moreLinks.length > 0;
  const moreActive = moreLinks.some(
    (l) => location.pathname === l.to || (l.to !== "/" && location.pathname.startsWith(l.to))
  );

  useEffect(() => {
    setMoreOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!moreOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") setMoreOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [moreOpen]);

  return (
    <>
      {moreOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-slate-900/35 backdrop-blur-[2px] lg:hidden"
          aria-label="بستن منو"
          onClick={() => setMoreOpen(false)}
        />
      )}

      {moreOpen && hasMore && (
        <div className="fixed inset-x-3 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-50 overflow-hidden rounded-[1.5rem] border border-white/70 bg-white/95 shadow-[0_16px_40px_rgb(15_23_42_/_0.18)] backdrop-blur-2xl lg:hidden dark:border-white/10 dark:bg-slate-900/95">
          <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
            <p className="text-sm font-bold text-foreground">سایر بخش‌ها</p>
            <button
              type="button"
              onClick={() => setMoreOpen(false)}
              className="rounded-full p-1.5 text-muted-foreground hover:bg-muted"
              aria-label="بستن"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 p-3">
            {moreLinks.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === "/"}
                onClick={() => setMoreOpen(false)}
                className={({ isActive }) =>
                  cn(
                    "flex flex-col items-center gap-2 rounded-2xl px-3 py-3.5 text-xs font-semibold transition-all",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                      : "bg-muted/60 text-foreground hover:bg-muted"
                  )
                }
              >
                <Icon className="h-5 w-5" />
                <span className="text-center leading-snug">{label}</span>
              </NavLink>
            ))}
          </div>
        </div>
      )}

      <nav
        className="fixed inset-x-3 bottom-3 z-50 rounded-[1.5rem] border border-white/70 bg-white/80 pb-[env(safe-area-inset-bottom)] shadow-[0_16px_40px_rgb(15_23_42_/_0.14)] backdrop-blur-2xl lg:hidden dark:border-white/10 dark:bg-slate-900/80"
        aria-label="منوی اصلی"
      >
        <div className="flex items-stretch justify-around px-1 py-1.5">
          {links.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                cn(
                  "flex min-w-0 flex-1 flex-col items-center gap-1 rounded-2xl px-1 py-1.5 text-[10px] font-semibold transition-all",
                  isActive ? "text-primary" : "text-muted-foreground"
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-xl transition-all",
                      isActive
                        ? "bg-gradient-to-br from-primary to-cyan-700 text-white shadow-md shadow-primary/25"
                        : "bg-white/70 text-muted-foreground dark:bg-white/10"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="max-w-full truncate px-0.5">{label}</span>
                </>
              )}
            </NavLink>
          ))}

          {hasMore && (
            <button
              type="button"
              onClick={() => setMoreOpen((v) => !v)}
              className={cn(
                "flex min-w-0 flex-1 flex-col items-center gap-1 rounded-2xl px-1 py-1.5 text-[10px] font-semibold transition-all",
                moreOpen || moreActive ? "text-primary" : "text-muted-foreground"
              )}
              aria-expanded={moreOpen}
            >
              <span
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-xl transition-all",
                  moreOpen || moreActive
                    ? "bg-gradient-to-br from-primary to-cyan-700 text-white shadow-md shadow-primary/25"
                    : "bg-white/70 text-muted-foreground dark:bg-white/10"
                )}
              >
                <MoreHorizontal className="h-4 w-4" />
              </span>
              <span className="max-w-full truncate px-0.5">بیشتر</span>
            </button>
          )}
        </div>
      </nav>
    </>
  );
}
