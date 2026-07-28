import { Flame, TriangleAlert, CircleDot, Minus, ListOrdered, Loader2, CheckCircle2, XCircle } from "lucide-react";

export const PRIORITIES = [
  { value: "low", label: "کم", hint: "می‌تواند صبر کند", icon: Minus, variant: "low" },
  { value: "medium", label: "متوسط", hint: "روال عادی کار", icon: CircleDot, variant: "medium" },
  { value: "high", label: "بالا", hint: "زودتر رسیدگی شود", icon: TriangleAlert, variant: "high" },
  { value: "urgent", label: "فوری", hint: "کارم متوقف شده", icon: Flame, variant: "urgent" },
];

export const STATUSES = [
  { value: "queued", label: "در صف", variant: "outline", icon: ListOrdered },
  { value: "in_progress", label: "در حال انجام", variant: "medium", icon: Loader2 },
  { value: "done", label: "انجام شده", variant: "low", icon: CheckCircle2 },
  { value: "rejected", label: "رد شده", variant: "urgent", icon: XCircle },
];

const LEGACY_STATUS_LABELS = {
  open: "در صف",
  resolved: "انجام شده",
  closed: "انجام شده",
};

export function priorityMeta(value) {
  return PRIORITIES.find((p) => p.value === value) || PRIORITIES[1];
}

export function statusMeta(value) {
  const found = STATUSES.find((s) => s.value === value);
  if (found) return found;
  if (LEGACY_STATUS_LABELS[value]) {
    return { value, label: LEGACY_STATUS_LABELS[value], variant: "secondary" };
  }
  return STATUSES[0];
}

export function ticketStatus(ticket) {
  return ticket?.status ?? "queued";
}

export function ticketRequesterPriority(ticket) {
  return ticket?.requester_priority ?? ticket?.requesterPriority ?? ticket?.priority ?? "medium";
}

export function ticketItPriority(ticket) {
  return ticket?.priority ?? "medium";
}

/** @deprecated use ticketStatus */
export const ticketItStatus = ticketStatus;

export const WORK_CATEGORIES = [
  { value: "windows", label: "نصب ویندوز" },
  { value: "printer", label: "پرینتر" },
  { value: "network", label: "شبکه و اینترنت" },
  { value: "hardware", label: "سخت‌افزار" },
  { value: "support", label: "پاسخ به سوال" },
  { value: "rayavaran", label: "سیستم رایاوران" },
  { value: "office_automation", label: "اتوماسیون اداری و چارگون" },
  { value: "other", label: "سایر" },
];

/** Same taxonomy as work-log categories; used for IT ticket classification. */
export const TICKET_CATEGORIES = WORK_CATEGORIES;

export function workCategoryMeta(value) {
  return WORK_CATEGORIES.find((c) => c.value === value) || WORK_CATEGORIES[WORK_CATEGORIES.length - 1];
}

export function ticketCategoryMeta(value) {
  if (!value) return { value: "", label: "تعیین نشده" };
  return TICKET_CATEGORIES.find((c) => c.value === value) || { value, label: value };
}
