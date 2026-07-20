import { PRIORITIES } from "@/lib/constants";
import { cn } from "@/lib/utils";

const ringByVariant = {
  low: "border-low/30 data-[active=true]:border-low data-[active=true]:bg-low/10",
  medium: "border-medium/30 data-[active=true]:border-medium data-[active=true]:bg-medium/10",
  high: "border-high/30 data-[active=true]:border-high data-[active=true]:bg-high/10",
  urgent: "border-urgent/30 data-[active=true]:border-urgent data-[active=true]:bg-urgent/10",
};

const iconColorByVariant = {
  low: "text-low",
  medium: "text-medium",
  high: "text-high",
  urgent: "text-urgent",
};

export function PriorityPicker({ value, onChange }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {PRIORITIES.map((p) => {
        const Icon = p.icon;
        const active = value === p.value;
        return (
          <button
            key={p.value}
            type="button"
            data-active={active}
            onClick={() => onChange(p.value)}
            className={cn(
              "flex flex-col items-center gap-1.5 rounded-xl border-2 bg-card px-3 py-4 text-center transition-all duration-200 hover:shadow-soft",
              ringByVariant[p.variant],
              active && "shadow-soft"
            )}
          >
            <Icon className={cn("h-6 w-6", iconColorByVariant[p.variant])} />
            <span className="text-sm font-bold">{p.label}</span>
            <span className="text-xs text-muted-foreground">{p.hint}</span>
          </button>
        );
      })}
    </div>
  );
}
