import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

export function LogoMark({ className, size = 40 }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      fill="none"
      width={size}
      height={size}
      className={cn("shrink-0", className)}
      aria-hidden
    >
      <defs>
        <linearGradient id="logo-g1" x1="8" y1="4" x2="56" y2="60" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0F766E" />
          <stop offset="0.55" stopColor="#14B8A6" />
          <stop offset="1" stopColor="#0F172A" />
        </linearGradient>
        <linearGradient id="logo-g2" x1="20" y1="16" x2="44" y2="48" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFFFFF" stopOpacity="0.95" />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity="0.75" />
        </linearGradient>
      </defs>
      <rect x="4" y="4" width="56" height="56" rx="16" fill="url(#logo-g1)" />
      <path
        d="M18 22h28a3 3 0 0 1 3 3v18a3 3 0 0 1-3 3H18a3 3 0 0 1-3-3V25a3 3 0 0 1 3-3Z"
        fill="url(#logo-g2)"
      />
      <circle cx="22" cy="34" r="2.5" fill="#14B8A6" />
      <circle cx="32" cy="34" r="2.5" fill="#14B8A6" />
      <circle cx="42" cy="34" r="2.5" fill="#14B8A6" />
      <path
        d="M32 14v6M26 17l6-3 6 3"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M28 42h8" stroke="#0F766E" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ className, showText = true, size = 40, to = "/", inverted = false }) {
  return (
    <Link
      to={to}
      className={cn(
        "group inline-flex items-center gap-3 rounded-xl outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className
      )}
      aria-label="صفحه اصلی سامانه پشتیبانی"
    >
      <LogoMark size={size} className="shadow-lg shadow-teal-500/30 transition-transform duration-300 group-hover:scale-105" />
      {showText && (
        <div className="min-w-0">
          <p
            className={cn(
              "truncate text-sm font-bold leading-none",
              inverted ? "text-slate-100" : "text-foreground"
            )}
          >
            تیک‌یار
          </p>
          <p
            className={cn(
              "mt-0.5 hidden truncate text-xs sm:block",
              inverted ? "text-slate-400" : "text-muted-foreground"
            )}
          >
            سامانه پشتیبانی فنی
          </p>
        </div>
      )}
    </Link>
  );
}
