import { BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatCard({ icon: Icon, label, value, iconClassName, valueClassName, className }) {
  const IconComponent = Icon || BarChart3;

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-[1.25rem] border border-border/70 bg-white/85 p-4 shadow-soft backdrop-blur-xl transition-all duration-300",
        "hover:-translate-y-0.5 hover:border-primary/25 hover:bg-white hover:shadow-card sm:p-5",
        className
      )}
    >
      <div className="pointer-events-none absolute -end-8 -top-8 h-28 w-28 rounded-full bg-primary/10 blur-2xl transition-opacity group-hover:opacity-100" />

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-muted-foreground sm:text-sm">{label}</p>
          <p className={cn("fa-num mt-1.5 text-xl font-bold tracking-tight text-foreground sm:text-2xl", valueClassName)}>
            {value}
          </p>
        </div>

        <div
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 via-cyan-500/10 to-transparent text-primary ring-1 ring-primary/10",
            iconClassName
          )}
        >
          <IconComponent className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
