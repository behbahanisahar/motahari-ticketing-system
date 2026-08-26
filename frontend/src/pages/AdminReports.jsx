import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Building2, FileSpreadsheet, UserRound } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { TableToolbar } from "@/components/TableToolbar";
import { ResponsiveTable } from "@/components/ResponsiveTable";
import { useClientTable } from "@/hooks/useClientTable";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { PriorityBadge, StatusBadge } from "@/components/StatusBadges";
import { STATUSES, statusMeta, priorityMeta, ticketItPriority, ticketStatus, ticketCategoryMeta } from "@/lib/constants";
import { currentJalaali, PERSIAN_MONTHS } from "@/lib/shamsi";
import { formatDateFa, formatDurationFa, formatNumber, toPersianDigits } from "@/lib/format";
import { downloadExcel } from "@/lib/exportExcel";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 10;
const nowJalaali = currentJalaali();

function toExcelNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function buildReportFileName(periodLabel) {
  const safe = String(periodLabel || "reports").replace(/[\\/:*?"<>|]/g, "-").trim();
  return `gozaresh-tickets-${safe || "reports"}`;
}

function FilterBar({ years, jYear, setJYear, jMonth, setJMonth, months, department, setDepartment, teams, status, setStatus }) {
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
          {months.map((name, i) => (
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
    const count = (stats.byStatus || []).find((r) => r.status === s.value)?.count || 0;
    return { ...s, count, pct: (count / total) * 100 };
  });
  const priorityRows = (stats.byPriority || []).map((p) => ({
    ...p,
    pct: (p.count / total) * 100,
  }));
  const categoryRows = (stats.byCategory || []).map((c) => ({
    ...c,
    pct: (c.count / total) * 100,
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
            label: "میانگین زمان انجام",
            value:
              stats.summary.avgResolutionHours != null
                ? formatDurationFa(stats.summary.avgResolutionHours)
                : "—",
            hint:
              stats.summary.closedCount > 0
                ? `بر اساس ${formatNumber(stats.summary.closedCount)} تیکت بسته‌شده`
                : "هنوز تیکت بسته‌شده‌ای در این بازه نیست",
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
            {item.hint && <p className="panel-on-canvas-muted fa-num mt-1 text-[11px] leading-5">{item.hint}</p>}
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

      <div className="panel-on-canvas rounded-2xl p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-[hsl(var(--panel-on-canvas-text))]">توزیع دسته‌بندی</p>
          <p className="panel-on-canvas-muted fa-num text-xs">{formatNumber(stats.total)} تیکت</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {categoryRows.map((c) => (
            <div key={c.category} className="rounded-xl border border-black/5 px-3 py-2.5 dark:border-white/10">
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <span className="truncate text-sm text-[hsl(var(--panel-on-canvas-text))]">{c.label}</span>
                <span className="fa-num shrink-0 text-sm font-bold text-[hsl(var(--panel-on-canvas-text))]">
                  {formatNumber(c.count)}
                </span>
              </div>
              <div className="panel-on-canvas-track h-1.5 overflow-hidden rounded-full">
                <div
                  className="h-full rounded-full bg-gradient-to-l from-teal-600 to-cyan-500"
                  style={{ width: `${Math.max(c.pct, c.count > 0 ? 4 : 0)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function AdminReports() {
  const [years] = useState(() => Array.from({ length: 7 }, (_, i) => nowJalaali.jy - 3 + i));
  const [teams, setTeams] = useState([]);
  const [jYear, setJYear] = useState(nowJalaali.jy);
  const [jMonth, setJMonth] = useState("all");
  const [status, setStatus] = useState("");
  const [department, setDepartment] = useState("");
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.teams().then((list) => setTeams([...list].sort((a, b) => a.name.localeCompare(b.name, "fa")))).catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    api
      .stats({ jYear, jMonth, status, department })
      .then((data) => {
        if (!cancelled) setStats(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setStats(null);
          setError(err.message || "بارگذاری گزارش ناموفق بود.");
          toast.error(err.message || "بارگذاری گزارش ناموفق بود.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
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
      "category",
    ],
  });

  const maxDept = Math.max(1, ...(stats?.byDepartment?.map((d) => d.count) || [1]));

  const handleExportExcel = async () => {
    try {
      const fullStats = await api.stats({ jYear, jMonth, status, department, tickets: "all" });
      const periodLabel = fullStats?.period?.label || stats?.period?.label || "گزارش";

      downloadExcel(buildReportFileName(periodLabel), [
        {
          name: "خلاصه",
          headers: ["شاخص", "مقدار"],
          rows: [
            ["بازه", periodLabel],
            ["کل تیکت‌ها", toExcelNumber(fullStats.total)],
            ["درخواست‌کنندگان", toExcelNumber(fullStats.summary?.uniqueRequesters)],
            ["بدون مسئول", toExcelNumber(fullStats.summary?.unassigned)],
            [
              "میانگین زمان انجام (ساعت)",
              fullStats.summary?.avgResolutionHours != null
                ? Number(fullStats.summary.avgResolutionHours)
                : "—",
            ],
            ["تعداد تیکت بسته‌شده", toExcelNumber(fullStats.summary?.closedCount)],
          ],
        },
        {
          name: "وضعیت",
          headers: ["وضعیت", "تعداد"],
          rows: STATUSES.map((item) => [
            item.label,
            toExcelNumber((fullStats.byStatus || []).find((row) => row.status === item.value)?.count),
          ]),
        },
        {
          name: "اولویت",
          headers: ["اولویت", "تعداد"],
          rows: (fullStats.byPriority || []).map((row) => [
            priorityMeta(row.priority).label,
            toExcelNumber(row.count),
          ]),
        },
        {
          name: "دسته‌بندی",
          headers: ["دسته‌بندی", "تعداد"],
          rows: (fullStats.byCategory || []).map((row) => [row.label, toExcelNumber(row.count)]),
        },
        {
          name: "واحدها",
          headers: ["واحد سازمانی", "تعداد تیکت"],
          rows: (fullStats.byDepartment || []).map((row) => [row.department || "—", toExcelNumber(row.count)]),
        },
        {
          name: "عملکرد تیم",
          headers: ["نام", "نام کاربری", "واگذارشده", "در صف", "در حال انجام", "انجام شده", "رد شده"],
          rows: (fullStats.byAdmin || []).map((row) => [
            row.display_name || "—",
            row.username || "—",
            toExcelNumber(row.assigned_count),
            toExcelNumber(row.queued_count),
            toExcelNumber(row.in_progress_count),
            toExcelNumber(row.done_count),
            toExcelNumber(row.rejected_count),
          ]),
        },
        {
          name: "جزئیات تیکت‌ها",
          headers: [
            "شماره",
            "موضوع",
            "وضعیت",
            "اولویت",
            "واحد",
            "دسته‌بندی",
            "درخواست‌کننده",
            "مسئول",
            "کامپیوتر",
            "تاریخ ثبت",
            "زمان انجام",
            "پیشرفت متوقف",
          ],
          rows: (fullStats.tickets || []).map((ticket) => [
            ticket.ticket_number || "",
            ticket.subject || "",
            statusMeta(ticketStatus(ticket)).label,
            priorityMeta(ticketItPriority(ticket)).label,
            ticket.team || ticket.department || "—",
            ticketCategoryMeta(ticket.category).label,
            ticket.requester_name || "—",
            ticket.assignee_name || "—",
            ticket.computer_name || "—",
            formatDateFa(ticket.created_at, { year: "numeric", month: "long", day: "numeric" }),
            ticket.is_blocked ? "مستثنی" : formatDurationFa(ticket.resolutionHours),
            ticket.is_blocked ? "بله" : "خیر",
          ]),
        },
      ]);

      toast.success("فایل اکسل گزارش دانلود شد.");
    } catch (err) {
      toast.error(err.message || "خروجی اکسل ناموفق بود.");
    }
  };

  return (
    <div className="section-gap">
      <PageHeader
        title="گزارش عملکرد"
        description={
          loading
            ? "در حال بارگذاری..."
            : stats
              ? toPersianDigits(stats.period.label)
              : error || "گزارشی برای نمایش نیست."
        }
        action={
          <Button type="button" variant="outline" onClick={handleExportExcel} disabled={loading || !stats}>
            <FileSpreadsheet className="h-4 w-4" />
            خروجی اکسل
          </Button>
        }
      />

      <FilterBar
        years={years}
        jYear={jYear}
        setJYear={setJYear}
        jMonth={jMonth}
        setJMonth={setJMonth}
        months={PERSIAN_MONTHS}
        department={department}
        setDepartment={setDepartment}
        teams={teams}
        status={status}
        setStatus={setStatus}
      />

      {loading && !stats && (
        <div className="rounded-[1.25rem] border border-white/20 bg-white/90 px-4 py-10 text-center text-sm text-slate-600">
          در حال آماده‌سازی گزارش...
        </div>
      )}

      {!loading && error && !stats && (
        <div className="rounded-[1.25rem] border border-rose-200 bg-rose-50 px-4 py-10 text-center text-sm text-rose-800">
          {error}
        </div>
      )}

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
              جزئیات تیکت‌ها ({formatNumber(stats.tickets.length)}
              {stats.ticketsLimited && stats.total > stats.tickets.length
                ? ` از ${formatNumber(stats.total)}`
                : ""}
              )
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
                      {t.is_blocked && (
                        <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                          متوقف
                        </span>
                      )}
                    </div>
                  ),
                },
                {
                  key: "department",
                  label: "واحد",
                  hideOnMobile: true,
                  render: (t) => t.team || t.department || "—",
                },
                {
                  key: "category",
                  label: "دسته",
                  hideOnMobile: true,
                  render: (t) => ticketCategoryMeta(t.category).label,
                },
                {
                  key: "requester",
                  label: "درخواست‌کننده",
                  hideOnMobile: true,
                  render: (t) => t.requester_name || "—",
                },
                {
                  key: "date",
                  label: "تاریخ ثبت",
                  className: "fa-num text-slate-500 whitespace-nowrap",
                  render: (t) => formatDateFa(t.created_at, { year: "numeric", month: "long", day: "numeric" }),
                },
                {
                  key: "resolution",
                  label: "زمان انجام",
                  className: "fa-num whitespace-nowrap font-semibold text-slate-700",
                  render: (t) =>
                    t.is_blocked ? (
                      <span className="text-xs font-semibold text-amber-700">مستثنی</span>
                    ) : (
                      formatDurationFa(t.resolutionHours)
                    ),
                },
              ]}
            />
          </section>
        </>
      )}
    </div>
  );
}
