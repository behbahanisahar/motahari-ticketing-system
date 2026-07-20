import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Building2, UserRound } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { TableToolbar } from "@/components/TableToolbar";
import { ResponsiveTable } from "@/components/ResponsiveTable";
import { useClientTable } from "@/hooks/useClientTable";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { PriorityBadge, StatusBadge } from "@/components/StatusBadges";
import { STATUSES, ticketItPriority, ticketStatus } from "@/lib/constants";
import { formatDateFa, formatNumber, toPersianDigits } from "@/lib/format";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 10;

function FilterBar({ years, jYear, setJYear, jMonth, setJMonth, calendar, department, setDepartment, teams, status, setStatus }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
      <Select value={String(jYear)} onValueChange={(v) => setJYear(Number(v))}>
        <SelectTrigger className="border-slate-200 bg-white/95 dark:border-white/20"><SelectValue placeholder="سال" /></SelectTrigger>
        <SelectContent>
          {years.map((y) => (
            <SelectItem key={y} value={String(y)}>{toPersianDigits(y)}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={String(jMonth)} onValueChange={setJMonth}>
        <SelectTrigger className="border-slate-200 bg-white/95 dark:border-white/20"><SelectValue placeholder="ماه" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">کل سال</SelectItem>
          {calendar?.months.map((name, i) => (
            <SelectItem key={i + 1} value={String(i + 1)}>{name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={department || "all"} onValueChange={(v) => setDepartment(v === "all" ? "" : v)}>
        <SelectTrigger className="border-slate-200 bg-white/95 dark:border-white/20"><SelectValue placeholder="واحد سازمانی" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">همه واحدها</SelectItem>
          {teams.map((t) => (
            <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={status || "all"} onValueChange={(v) => setStatus(v === "all" ? "" : v)}>
        <SelectTrigger className="border-slate-200 bg-white/95 dark:border-white/20"><SelectValue placeholder="وضعیت پیگیری" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">همه وضعیت‌ها</SelectItem>
          {STATUSES.map((s) => (
            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

const STATUS_BAR = {
  queued: "bg-slate-400",
  in_progress: "bg-sky-500",
  done: "bg-emerald-500",
  rejected: "bg-rose-500",
};

const PRIORITY_BAR = {
  low: "bg-emerald-500",
  medium: "bg-sky-500",
  high: "bg-amber-500",
  urgent: "bg-rose-500",
};

function ReportsOverview({ stats }) {
  const total = Math.max(1, stats.total || 0);
  const statusRows = STATUSES.map((s) => {
    const count = stats.byStatus.find((r) => r.status === s.value)?.count || 0;
    return { ...s, count, pct: (count / total) * 100 };
  });
  const priorityRows = (stats.byPriority || []).map((p) => ({
    ...p,
    pct: (p.count / total) * 100,
  }));

  return (
    <section className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "کل تیکت‌ها", value: formatNumber(stats.total) },
          { label: "درخواست‌کنندگان", value: formatNumber(stats.summary.uniqueRequesters) },
          {
            label: "بدون مسئول",
            value: formatNumber(stats.summary.unassigned),
            warn: stats.summary.unassigned > 0,
          },
          {
            label: "میانگین انجام",
            value:
              stats.summary.avgResolutionHours != null
                ? `${formatNumber(stats.summary.avgResolutionHours)} س`
                : "—",
          },
        ].map((item) => (
          <div key={item.label} className="panel-on-canvas rounded-2xl px-4 py-3">
            <p className="panel-on-canvas-muted text-xs">{item.label}</p>
            <p
              className={cn(
                "fa-num mt-1 text-2xl font-bold tracking-tight",
                item.warn ? "text-amber-600 dark:text-amber-300" : "text-[hsl(var(--panel-on-canvas-text))]"
              )}
            >
              {item.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="panel-on-canvas rounded-2xl p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-[hsl(var(--panel-on-canvas-text))]">وضعیت پیگیری</p>
            <p className="panel-on-canvas-muted fa-num text-xs">{formatNumber(stats.total)} تیکت</p>
          </div>
          <div className="panel-on-canvas-track mb-3 flex h-2.5 overflow-hidden rounded-full">
            {statusRows.map((s) =>
              s.count > 0 ? (
                <div
                  key={s.value}
                  className={cn("h-full", STATUS_BAR[s.value])}
                  style={{ width: `${Math.max(s.pct, 2)}%` }}
                  title={`${s.label}: ${s.count}`}
                />
              ) : null
            )}
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-2">
            {statusRows.map((s) => (
              <div key={s.value} className="flex items-center justify-between gap-2 text-sm">
                <span className="panel-on-canvas-muted inline-flex items-center gap-2">
                  <span className={cn("h-2 w-2 rounded-full", STATUS_BAR[s.value])} />
                  {s.label}
                </span>
                <span className="fa-num font-semibold text-[hsl(var(--panel-on-canvas-text))]">
                  {formatNumber(s.count)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="panel-on-canvas rounded-2xl p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-[hsl(var(--panel-on-canvas-text))]">توزیع اولویت</p>
          </div>
          <div className="space-y-2.5">
            {priorityRows.map((p) => (
              <div key={p.priority} className="grid grid-cols-[4.5rem_1fr_2rem] items-center gap-2">
                <span className="panel-on-canvas-muted text-xs">
                  {p.priority === "low"
                    ? "کم"
                    : p.priority === "medium"
                      ? "متوسط"
                      : p.priority === "high"
                        ? "بالا"
                        : "فوری"}
                </span>
                <div className="panel-on-canvas-track h-2 overflow-hidden rounded-full">
                  <div
                    className={cn("h-full rounded-full", PRIORITY_BAR[p.priority] || "bg-slate-400")}
                    style={{ width: `${Math.max(p.pct, p.count > 0 ? 4 : 0)}%` }}
                  />
                </div>
                <span className="fa-num text-end text-sm font-semibold text-[hsl(var(--panel-on-canvas-text))]">
                  {formatNumber(p.count)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default function AdminReports() {
  const [years, setYears] = useState([]);
  const [teams, setTeams] = useState([]);
  const [calendar, setCalendar] = useState(null);
  const [jYear, setJYear] = useState(null);
  const [jMonth, setJMonth] = useState("all");
  const [status, setStatus] = useState("");
  const [department, setDepartment] = useState("");
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.statsCalendar().then((c) => {
      setCalendar(c);
      setJYear(c.jYear);
      setYears(Array.from({ length: 7 }, (_, i) => c.jYear - 3 + i));
    }).catch((err) => toast.error(err.message));
    api.teams().then((list) => setTeams([...list].sort((a, b) => a.name.localeCompare(b.name, "fa")))).catch(() => {});
  }, []);

  useEffect(() => {
    if (!jYear) return;
    api
      .stats({ jYear, jMonth, status, department })
      .then(setStats)
      .catch((err) => toast.error(err.message));
  }, [jYear, jMonth, status, department]);

  const adminTable = useClientTable(stats?.byAdmin ?? null, {
    pageSize: PAGE_SIZE,
    searchKeys: ["username", "display_name"],
  });

  const deptTable = useClientTable(stats?.byDepartment ?? null, {
    pageSize: PAGE_SIZE,
    searchKeys: ["department"],
  });

  const ticketsTable = useClientTable(stats?.tickets ?? null, {
    pageSize: PAGE_SIZE,
    searchKeys: [
      "ticket_number",
      "subject",
      "team",
      "computer_name",
      "requester_name",
      "assignee_name",
    ],
  });

  const maxDept = Math.max(1, ...(stats?.byDepartment?.map((d) => d.count) || [1]));

  return (
    <div className="section-gap">
      <PageHeader
        title="گزارش عملکرد"
        description={stats ? toPersianDigits(stats.period.label) : "در حال بارگذاری..."}
      />

      <FilterBar
        years={years}
        jYear={jYear}
        setJYear={setJYear}
        jMonth={jMonth}
        setJMonth={setJMonth}
        calendar={calendar}
        department={department}
        setDepartment={setDepartment}
        teams={teams}
        status={status}
        setStatus={setStatus}
      />

      {stats && (
        <>
          <ReportsOverview stats={stats} />

          <section className="section-block">
            <h2 className="section-label">عملکرد تیم فناوری اطلاعات</h2>
            <TableToolbar
              query={adminTable.query}
              onQueryChange={adminTable.setQuery}
              page={adminTable.page}
              totalPages={adminTable.totalPages}
              total={adminTable.total}
              onPageChange={adminTable.setPage}
              placeholder="جستجو در نام یا نام کاربری..."
              onDark
            />
            <ResponsiveTable
              rowKey={(a) => a.id}
              rows={adminTable.rows}
              emptyMessage={adminTable.query ? "موردی یافت نشد." : "داده‌ای وجود ندارد."}
              columns={[
                {
                  key: "name",
                  label: "نام",
                  primary: true,
                  render: (a) => (
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-cyan-700 text-sm font-bold text-white">
                        {(a.display_name || "?").charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-900">{a.display_name}</p>
                        <p className="truncate text-xs text-slate-500 md:hidden">{a.username}</p>
                      </div>
                    </div>
                  ),
                },
                {
                  key: "username",
                  label: "نام کاربری",
                  hideOnMobile: true,
                  className: "text-slate-600",
                  render: (a) => a.username,
                },
                {
                  key: "assigned",
                  label: "واگذارشده",
                  className: "fa-num font-semibold",
                  render: (a) => formatNumber(a.assigned_count),
                },
                {
                  key: "progress",
                  label: "در حال انجام",
                  className: "fa-num font-semibold",
                  render: (a) => formatNumber(a.in_progress_count),
                },
                {
                  key: "done",
                  label: "انجام شده",
                  className: "fa-num font-semibold text-low",
                  render: (a) => formatNumber(a.done_count),
                },
                {
                  key: "rejected",
                  label: "رد شده",
                  className: "fa-num font-semibold text-urgent",
                  render: (a) => formatNumber(a.rejected_count),
                },
              ]}
            />
          </section>

          <section className="section-block">
            <h2 className="section-label">تیکت‌ها بر اساس واحد سازمانی</h2>
            <TableToolbar
              query={deptTable.query}
              onQueryChange={deptTable.setQuery}
              page={deptTable.page}
              totalPages={deptTable.totalPages}
              total={deptTable.total}
              onPageChange={deptTable.setPage}
              placeholder="جستجو در نام واحد..."
              onDark
            />

            {deptTable.rows.length === 0 ? (
              <div className="rounded-[1.25rem] border border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-500">
                {deptTable.query ? "واحدی یافت نشد." : "داده‌ای برای این بازه زمانی وجود ندارد."}
              </div>
            ) : (
              <div className="overflow-hidden rounded-[1.25rem] border border-slate-200 bg-white shadow-soft">
                {deptTable.rows.map((d, i) => (
                  <div
                    key={d.department}
                    className={cn(
                      "px-4 py-3.5",
                      i > 0 && "border-t border-slate-100"
                    )}
                  >
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <Building2 className="h-4 w-4 shrink-0 text-primary" />
                        <span className="truncate font-semibold text-slate-900">{d.department}</span>
                      </div>
                      <span className="fa-num shrink-0 text-base font-bold text-teal-700">
                        {formatNumber(d.count)}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-gradient-to-l from-teal-600 to-cyan-500"
                        style={{ width: `${Math.max(8, (d.count / maxDept) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="section-block">
            <h2 className="section-label flex items-center gap-2">
              <UserRound className="h-4 w-4 text-teal-300" />
              جزئیات تیکت‌ها ({formatNumber(stats.tickets.length)})
            </h2>
            <TableToolbar
              query={ticketsTable.query}
              onQueryChange={ticketsTable.setQuery}
              page={ticketsTable.page}
              totalPages={ticketsTable.totalPages}
              total={ticketsTable.total}
              onPageChange={ticketsTable.setPage}
              placeholder="جستجو در شماره، موضوع، واحد، کامپیوتر..."
              onDark
            />
            <ResponsiveTable
              rowKey={(t) => t.id}
              rows={ticketsTable.rows}
              emptyMessage={ticketsTable.query ? "تیکتی یافت نشد." : "تیکتی برای این بازه وجود ندارد."}
              tableMinWidth="min-w-full"
              columns={[
                {
                  key: "number",
                  label: "شماره",
                  primary: true,
                  headClassName: "whitespace-nowrap",
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
                  className: "max-w-[20rem] truncate",
                  render: (t) => t.subject,
                },
                {
                  key: "badges",
                  label: "وضعیت",
                  primary: true,
                  render: (t) => (
                    <div className="flex flex-wrap gap-1.5">
                      <StatusBadge value={ticketStatus(t)} />
                      <PriorityBadge value={ticketItPriority(t)} />
                    </div>
                  ),
                },
                {
                  key: "department",
                  label: "واحد",
                  hideOnMobile: true,
                  render: (t) => t.department || "—",
                },
                {
                  key: "requester",
                  label: "درخواست‌کننده",
                  hideOnMobile: true,
                  render: (t) => t.requester_name || "—",
                },
                {
                  key: "date",
                  label: "تاریخ",
                  className: "fa-num text-slate-500 whitespace-nowrap",
                  render: (t) => formatDateFa(t.created_at),
                },
              ]}
            />
          </section>
        </>
      )}
    </div>
  );
}
