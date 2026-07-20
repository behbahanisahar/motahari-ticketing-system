import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

export function MobileNav({ links }) {
  return (
    <nav
      className="fixed inset-x-3 bottom-3 z-50 rounded-[1.5rem] border border-white/70 bg-white/80 pb-[env(safe-area-inset-bottom)] shadow-[0_16px_40px_rgb(15_23_42_/_0.14)] backdrop-blur-2xl lg:hidden"
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
                      : "bg-white/70 text-muted-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <span className="max-w-full truncate px-0.5">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
