import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { TableToolbar } from "@/components/TableToolbar";
import { ResponsiveTable } from "@/components/ResponsiveTable";
import { useNotifications } from "@/hooks/useNotifications";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { PriorityBadge, StatusBadge } from "@/components/StatusBadges";
import { STATUSES, ticketItPriority, ticketRequesterPriority, ticketStatus, ACTIVE_TICKET_CATEGORIES, ticketCategoryMeta } from "@/lib/constants";
import { PRIORITIES } from "@/lib/constants";
import { formatDateFa, formatNumber, toPersianDigits } from "@/lib/format";
import { api } from "@/lib/api";
import { toast } from "sonner";

const SORT_OPTIONS = [
  { value: "priority:asc", label: "اولویت (فوری/بالا فقط وقتی باز است)" },
  { value: "created_at:desc", label: "جدیدترین" },
  { value: "created_at:asc", label: "قدیمی‌ترین" },
  { value: "status:asc", label: "وضعیت پیگیری" },
];

export default function AgentDashboard() {
  const { dashboard } = useNotifications();
  const [result, setResult] = useState(null);
  const [teams, setTeams] = useState([]);
  const [filters, setFilters] = useState({ status: "", priority: "", team: "", category: "", q: "" });
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState("priority:asc");
  const limit = 20;

  useEffect(() => {
    api.teams().then((list) => setTeams([...list].sort((a, b) => a.name.localeCompare(b.name, "fa")))).catch(() => {});
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      const [sort, order] = sortKey.split(":");
      api
        .allTickets({ ...filters, page, limit, sort, order })
        .then(setResult)
        .catch((err) => toast.error(err.message));
    }, 250);
    return () => clearTimeout(timeout);
  }, [filters, page, sortKey]);

  const setFilter = (key, value) => {
    setPage(1);
    setFilters((f) => ({ ...f, [key]: value === "all" ? "" : value }));
  };

  const tickets = result?.items ?? null;
  const total = result?.total ?? 0;
  const totalPages = result?.totalPages ?? 1;

  return (
    <div className="section-gap">
      <PageHeader
        title="مدیریت تیکت‌ها"
        description={result ? `${formatNumber(total)} تیکت در سیستم` : "در حال بارگذاری..."}
      />

      {dashboard && (
        <div className="flex flex-wrap gap-2">
          {[
            { label: "کل پیام‌ها", value: dashboard.totalMessages },
            { label: "خوانده‌نشده", value: dashboard.unreadMessages, hot: dashboard.unreadMessages > 0 },
            { label: "پیام‌های امروز", value: dashboard.messagesToday },
            { label: "تیکت با پیام جدید", value: dashboard.ticketsWithUnread, hot: dashboard.ticketsWithUnread > 0 },
          ].map((item) => (
            <span
              key={item.label}
              className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm backdrop-blur-md ${
                item.hot
                  ? "border-rose-300/40 bg-rose-400/15 text-rose-100"
                  : "border-white/20 bg-white/90 text-slate-800"
              }`}
            >
              <span className={item.hot ? "text-rose-200/90" : "text-slate-500"}>{item.label}</span>
              <span className="fa-num font-bold">{formatNumber(item.value)}</span>
            </span>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-3">
        <TableToolbar
          query={filters.q}
          onQueryChange={(v) => setFilter("q", v)}
          page={page}
          totalPages={totalPages}
          total={total}
          onPageChange={setPage}
          placeholder="جستجو در موضوع، نام کامپیوتر یا نام کاربر..."
          onDark
        />

        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
          <Select value={filters.status || "all"} onValueChange={(v) => setFilter("status", v)}>
            <SelectTrigger className="border-slate-200 bg-white"><SelectValue placeholder="وضعیت پیگیری" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همه وضعیت‌ها</SelectItem>
              {STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filters.priority || "all"} onValueChange={(v) => setFilter("priority", v)}>
            <SelectTrigger className="border-slate-200 bg-white"><SelectValue placeholder="اولویت" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همه اولویت‌ها</SelectItem>
              {PRIORITIES.map((p) => (
                <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filters.category || "all"} onValueChange={(v) => setFilter("category", v)}>
            <SelectTrigger className="border-slate-200 bg-white"><SelectValue placeholder="دسته‌بندی" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همه دسته‌ها</SelectItem>
              <SelectItem value="none">تعیین نشده</SelectItem>
              {ACTIVE_TICKET_CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filters.team || "all"} onValueChange={(v) => setFilter("team", v)}>
            <SelectTrigger className="border-slate-200 bg-white"><SelectValue placeholder="واحد سازمانی" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همه واحدها</SelectItem>
              {teams.map((t) => (
                <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={sortKey}
            onValueChange={(v) => {
              setPage(1);
              setSortKey(v);
            }}
          >
            <SelectTrigger className="border-slate-200 bg-white"><SelectValue placeholder="مرتب‌سازی" /></SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {tickets === null ? (
        <p className="py-10 text-center text-muted-foreground">در حال بارگذاری...</p>
      ) : (
        <ResponsiveTable
          rowKey={(t) => t.id}
          rows={tickets}
          emptyMessage="تیکتی با این فیلترها یافت نشد."
          columns={[
            {
              key: "number",
              label: "شماره",
              primary: true,
              render: (t) => (
                <Link to={`/tickets/${t.id}`} className="fa-num font-bold text-primary hover:underline">
                  {toPersianDigits(t.ticket_number)}
                </Link>
              ),
            },
            {
              key: "subject",
              label: "موضوع",
              primary: true,
              render: (t) => (
                <Link to={`/tickets/${t.id}`} className="font-semibold hover:underline">{t.subject}</Link>
              ),
            },
            {
              key: "status",
              label: "وضعیت",
              primary: true,
              render: (t) => <StatusBadge value={ticketStatus(t)} />,
            },
            { key: "requester", label: "درخواست‌کننده", render: (t) => t.requester_name },
            { key: "team", label: "واحد", render: (t) => t.team },
            {
              key: "category",
              label: "دسته",
              render: (t) => ticketCategoryMeta(t.category).label,
            },
            { key: "computer", label: "کامپیوتر", render: (t) => t.computer_name },
            {
              key: "requesterPriority",
              label: "فوریت درخواست‌کننده",
              hideOnMobile: true,
              render: (t) => <PriorityBadge value={ticketRequesterPriority(t)} />,
            },
            {
              key: "priority",
              label: "فوریت پیگیری IT",
              hideOnMobile: true,
              render: (t) => <PriorityBadge value={ticketItPriority(t)} />,
            },
            { key: "assignee", label: "مسئول", render: (t) => t.assignee_name || "—" },
            {
              key: "date",
              label: "تاریخ",
              className: "fa-num text-muted-foreground",
              render: (t) => formatDateFa(t.created_at, { year: "numeric", month: "long", day: "numeric" }),
            },
          ]}
        />
      )}

      {result && totalPages > 1 && (
        <TableToolbar
          showSearch={false}
          page={page}
          totalPages={totalPages}
          total={total}
          onPageChange={setPage}
          onDark
        />
      )}
    </div>
  );
}
