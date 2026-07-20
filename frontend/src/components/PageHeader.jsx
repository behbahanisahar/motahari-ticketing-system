import { cn } from "@/lib/utils";

export function PageHeader({ title, description, action, className }) {
  return (
    <div className={cn("mb-5 flex flex-wrap items-end justify-between gap-3", className)}>
      <div className="min-w-0 space-y-1">
        <h1 className="text-xl font-bold tracking-tight text-[hsl(var(--canvas-text))] sm:text-2xl">
          {title}
        </h1>
        {description && (
          <p className="text-sm text-[hsl(var(--canvas-muted))]">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
