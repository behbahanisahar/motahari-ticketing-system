import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Monitor, Building2, User, MessageCircle } from "lucide-react";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/PageHeader";
import { TicketChat } from "@/components/TicketChat";
import { PriorityPicker } from "@/components/PriorityPicker";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { PriorityBadge, StatusBadge } from "@/components/StatusBadges";
import { STATUSES, ticketItPriority, ticketRequesterPriority, ticketStatus } from "@/lib/constants";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { formatDateTimeFa, formatNumber, toPersianDigits } from "@/lib/format";

export default function TicketDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [ticket, setTicket] = useState(null);
  const [admins, setAdmins] = useState([]);

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
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (!ticket) {
    return <p className="text-slate-300">در حال بارگذاری...</p>;
  }

  const status = ticketStatus(ticket);
  const requesterPriority = ticketRequesterPriority(ticket);
  const itPriority = ticketItPriority(ticket);

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
            </div>

              <div className="mt-5 flex flex-col gap-2.5">
                <Label className="text-sm font-semibold text-slate-800">فوریت پیگیری برای IT</Label>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span>فوریت درخواست‌کننده:</span>
                  <PriorityBadge value={requesterPriority} />
                </div>
                <PriorityPicker value={itPriority} onChange={(v) => handleUpdate({ priority: v })} />
              </div>
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
    </div>
  );
}
