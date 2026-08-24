import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Monitor, Building2, User, MessageCircle, Download, Expand, X } from "lucide-react";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/PageHeader";
import { TicketChat } from "@/components/TicketChat";
import { PriorityPicker } from "@/components/PriorityPicker";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { PriorityBadge, StatusBadge } from "@/components/StatusBadges";
import { STATUSES, ticketItPriority, ticketRequesterPriority, ticketStatus, ticketCategoryOptions, ticketCategoryMeta } from "@/lib/constants";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { formatDateTimeFa, formatNumber, toPersianDigits } from "@/lib/format";

export default function TicketDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [ticket, setTicket] = useState(null);
  const [admins, setAdmins] = useState([]);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const isAdmin = user?.role === "admin";

  const load = () => {
    api
      .ticket(id)
      .then(setTicket)
      .catch((err) => toast.error(err.message));
  };

  useEffect(() => {
    load();
    if (isAdmin) {
      api.admins().then(setAdmins).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleUpdate = async (payload) => {
    try {
      await api.updateTicket(id, payload);
      toast.success("تیکت به‌روزرسانی شد.");
      try {
        await api.ticket(id).then(setTicket);
      } catch (_) {
        load();
      }
    } catch (err) {
      toast.error(err.message || "خطا در ارتباط با سرور. دوباره تلاش کنید.");
    }
  };

  if (!ticket) {
    return <p className="text-slate-300">در حال بارگذاری...</p>;
  }

  const status = ticketStatus(ticket);
  const requesterPriority = ticketRequesterPriority(ticket);
  const itPriority = ticketItPriority(ticket);
  const isClosed = status === "done" || status === "rejected";

  return (
    <div className="section-gap">
      <PageHeader
        title={ticket.subject}
        description={`شماره ${toPersianDigits(ticket.ticket_number)} · ${formatDateTimeFa(ticket.created_at)}`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            {ticket.unreadCount > 0 && (
              <span className="fa-num rounded-full bg-teal-400/15 px-2.5 py-1 text-xs font-bold text-teal-200">
                {formatNumber(ticket.unreadCount)} پیام جدید
              </span>
            )}
            <StatusBadge value={status} />
            <PriorityBadge value={requesterPriority} />
          </div>
        }
      />

      <section className="overflow-hidden rounded-[1.35rem] border border-slate-200 bg-white shadow-soft">
        <div className="space-y-5 p-5 sm:p-6">
          <div>
            <p className="mb-2 text-xs font-semibold text-slate-500">شرح درخواست</p>
            <p className="whitespace-pre-wrap text-[15px] leading-8 text-slate-800">{ticket.description}</p>
          </div>

          {ticket.has_screenshot && (
            <div className="border-t border-slate-100 pt-4">
              <p className="mb-3 text-xs font-semibold text-slate-500">تصویر ضمیمه</p>
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                <button
                  type="button"
                  onClick={() => setLightboxOpen(true)}
                  className="block w-full text-start"
                >
                  <img
                    src={api.ticketScreenshotUrl(ticket.id)}
                    alt={ticket.screenshot_name || "تصویر تیکت"}
                    className="max-h-64 w-full object-contain bg-white"
                  />
                </button>
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-white px-3 py-2.5">
                  <p className="truncate text-xs text-slate-500">{ticket.screenshot_name || "screenshot"}</p>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => setLightboxOpen(true)}>
                      <Expand className="h-4 w-4" />
                      بزرگ‌نمایی
                    </Button>
                    <a
                      href={api.ticketScreenshotUrl(ticket.id, { download: true })}
                      className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 shadow-sm hover:border-primary/40"
                    >
                      <Download className="h-4 w-4" />
                      دانلود
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-slate-100 pt-4 text-sm text-slate-600">
            <span className="inline-flex items-center gap-1.5">
              <User className="h-4 w-4 text-teal-700" />
              {ticket.requester_name}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Building2 className="h-4 w-4 text-teal-700" />
              {ticket.team}
            </span>
            {ticket.computer_name && (
              <span className="inline-flex items-center gap-1.5">
                <Monitor className="h-4 w-4 text-teal-700" />
                {ticket.computer_name}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
            <div className="inline-flex items-center gap-2">
              <span className="text-xs text-slate-500">وضعیت</span>
              <StatusBadge value={status} />
            </div>
            <span className="hidden h-4 w-px bg-slate-200 sm:block" />
            <div className="inline-flex items-center gap-2">
              <span className="text-xs text-slate-500">فوریت شما</span>
              <PriorityBadge value={requesterPriority} />
            </div>
            {isAdmin && (
              <>
                <span className="hidden h-4 w-px bg-slate-200 sm:block" />
                <div className="inline-flex items-center gap-2">
                  <span className="text-xs text-slate-500">دسته</span>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700">
                    {ticketCategoryMeta(ticket.category).label}
                  </span>
                </div>
              </>
            )}
            {isAdmin && itPriority !== requesterPriority && (
              <>
                <span className="hidden h-4 w-px bg-slate-200 sm:block" />
                <div className="inline-flex items-center gap-2">
                  <span className="text-xs text-slate-500">فوریت IT</span>
                  <PriorityBadge value={itPriority} />
                </div>
              </>
            )}
          </div>
        </div>

        {isAdmin && (
          <div className="border-t border-slate-100 bg-slate-50/80 px-5 py-5 sm:px-6">
            <p className="mb-4 text-sm font-bold text-slate-800">مدیریت تیکت</p>
            {isClosed ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                این تیکت {status === "rejected" ? "رد شده" : "انجام شده"} است و دیگر قابل ویرایش نیست.
              </div>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <span className="text-xs font-semibold text-slate-500">وضعیت پیگیری</span>
                    <Select value={status} onValueChange={(v) => handleUpdate({ status: v })}>
                      <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((s) => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <span className="text-xs font-semibold text-slate-500">مسئول پیگیری</span>
                    <Select
                      value={ticket.assigned_to ? String(ticket.assigned_to) : "none"}
                      onValueChange={(v) => handleUpdate({ assignedTo: v === "none" ? null : Number(v) })}
                    >
                      <SelectTrigger className="bg-white"><SelectValue placeholder="تعیین نشده" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">تعیین نشده</SelectItem>
                        {admins.map((a) => (
                          <SelectItem key={a.id} value={String(a.id)}>{a.display_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-1.5 sm:col-span-2">
                    <span className="text-xs font-semibold text-slate-500">دسته‌بندی تیکت</span>
                    <Select
                      value={ticket.category || "none"}
                      onValueChange={(v) => handleUpdate({ category: v === "none" ? null : v })}
                    >
                      <SelectTrigger className="bg-white"><SelectValue placeholder="انتخاب دسته" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">تعیین نشده</SelectItem>
                        {ticketCategoryOptions(ticket.category).map((c) => (
                          <SelectItem key={c.value} value={c.value} disabled={!c.active}>
                            {c.active ? c.label : `${c.label} (غیرفعال)`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="mt-5 flex flex-col gap-2.5">
                  <Label className="text-sm font-semibold text-slate-800">فوریت پیگیری برای IT</Label>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span>فوریت درخواست‌کننده:</span>
                    <PriorityBadge value={requesterPriority} />
                  </div>
                  <PriorityPicker value={itPriority} onChange={(v) => handleUpdate({ priority: v })} />
                </div>
              </>
            )}
          </div>
        )}
      </section>

      <section className="overflow-hidden rounded-[1.35rem] border border-slate-200 bg-white shadow-soft">
        <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4 sm:px-6">
          <MessageCircle className="h-5 w-5 text-teal-700" />
          <h2 className="text-sm font-bold text-slate-900 sm:text-base">گفتگوی زنده</h2>
        </div>
        <div className="p-4 sm:p-5">
          <TicketChat ticketId={Number(id)} initialComments={ticket.comments} />
        </div>
      </section>

      {lightboxOpen && ticket.has_screenshot && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
          onClick={() => setLightboxOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="نمایش بزرگ تصویر"
        >
          <button
            type="button"
            className="absolute end-4 top-4 rounded-full bg-white/15 p-2 text-white hover:bg-white/25"
            onClick={() => setLightboxOpen(false)}
            aria-label="بستن"
          >
            <X className="h-5 w-5" />
          </button>
          <img
            src={api.ticketScreenshotUrl(ticket.id)}
            alt={ticket.screenshot_name || "تصویر تیکت"}
            className="max-h-[90vh] max-w-full rounded-xl object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
