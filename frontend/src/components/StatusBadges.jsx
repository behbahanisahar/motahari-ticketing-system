import { Badge } from "@/components/ui/badge";
import { priorityMeta, statusMeta } from "@/lib/constants";

export function PriorityBadge({ value }) {
  const meta = priorityMeta(value);
  const Icon = meta.icon;
  return (
    <Badge variant={meta.variant}>
      <Icon className="h-3.5 w-3.5" />
      {meta.label}
    </Badge>
  );
}

export function StatusBadge({ value }) {
  const meta = statusMeta(value);
  return <Badge variant={meta.variant}>{meta.label}</Badge>;
}
