import { useEffect, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

export function AdminMoreMenu({ links, className, navLinkClass }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const location = useLocation();
  const isChildActive = links.some(
    (l) => location.pathname === l.to || (l.to !== "/" && location.pathname.startsWith(l.to))
  );

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className={cn("relative", className)} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className={cn(
          typeof navLinkClass === "function"
            ? navLinkClass({ isActive: isChildActive || open })
            : navLinkClass,
          "gap-1.5"
        )}
      >
        <MoreHorizontal className="h-4 w-4 shrink-0" />
        <span className="whitespace-nowrap">بیشتر</span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute start-0 top-[calc(100%+0.5rem)] z-50 min-w-[13rem] overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-1.5 text-slate-900 shadow-xl shadow-slate-900/15 backdrop-blur-xl dark:border-white/15 dark:bg-slate-900 dark:text-slate-50"
        >
          {links.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              role="menuitem"
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-slate-800 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-white/10"
                )
              }
            >
              <Icon className="h-4 w-4 shrink-0 opacity-80" />
              {label}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}
