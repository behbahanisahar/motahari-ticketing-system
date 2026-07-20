import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ClipboardList, Clock, Pencil, Plus, Trash2, Undo2, XCircle, CalendarDays } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { WorkLogDateFilter } from "@/components/WorkLogDateFilter";
import { StatCard } from "@/components/StatCard";
import { ResponsiveTable } from "@/components/ResponsiveTable";
import { TableToolbar } from "@/components/TableToolbar";
import { StatusBadge } from "@/components/StatusBadges";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NumericInput } from "@/components/ui/numeric-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useAppDialog } from "@/hooks/useAppDialog";
import { api } from "@/lib/api";
import { STATUSES, WORK_CATEGORIES, workCategoryMeta } from "@/lib/constants";
import { formatMinutesAsHours, formatNumber, parseLocalizedInteger, toPersianDigits } from "@/lib/format";
import { formatShamsiDateLong, formatShamsiDateShort, normalizeGregorianDate, todayGregorian } from "@/lib/shamsi";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const PAGE_SIZE = 10;

function formatWorkDate(dateStr) {
  return formatShamsiDateLong(dateStr);
}

function formatWorkDateCell(dateStr) {
  const iso = normalizeGregorianDate(dateStr);
  return iso ? formatShamsiDateShort(iso) : "—";
}

function assignmentBadge(row) {
  if (row.isSelfTask) {
    return { label: "کار شخصی", className: "border-slate-200 bg-slate-100 text-slate-700" };
  }
  if (row.isDelegatedByMe) {
    return { label: "واگذاری", className: "border-cyan-200 bg-cyan-50 text-cyan-700" };
  }
  if (row.isReceivedByMe) {
    return { label: "دریافتی", className: "border-teal-200 bg-teal-50 text-teal-700" };
  }
  return null;
}

const emptyForm = {
  title: "",
  description: "",
  category: "other",
  durationMinutes: "",
  assigneeId: "self",
  status: "queued",
};

export default function WorkLog() {
  const { user } = useAuth();
  const { confirm, prompt } = useAppDialog();
  const [dateMode, setDateMode] = useState("day");
  const [date, setDate] = useState(todayGregorian());
  const [assigneeId, setAssigneeId] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [admins, setAdmins] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const listDate = dateMode === "all" ? "all" : date;

  const load = useCallback(() => {
    setLoading(true);
    api
      .workLogs({
        date: listDate,
        assigneeId: assigneeId || undefined,
        category: category || undefined,
        status: statusFilter || undefined,
        q: search || undefined,
        page,
        limit: PAGE_SIZE,
      })
      .then(setData)
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false));
  }, [listDate, assigneeId, category, statusFilter, search, page]);

  useEffect(() => {
    api.admins().then(setAdmins).catch(() => {});
  }, []);

  useEffect(() => {
    const t = setTimeout(load, search ? 250 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error("عنوان کار را وارد کنید.");
      return;
    }
    setSaving(true);
    try {
      const isSelf = form.assigneeId === "self";
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        category: form.category,
        workDate: date,
        durationMinutes: form.durationMinutes !== "" ? parseLocalizedInteger(form.durationMinutes) : undefined,
      };
      if (isSelf) {
        payload.status = form.status;
        if (editingId) payload.assigneeId = user?.id;
      } else {
        payload.assigneeId = Number(form.assigneeId);
      }
      if (editingId) {
        await api.updateWorkLog(editingId, payload);
        toast.success("کار به‌روزرسانی شد.");
      } else {
        await api.createWorkLog(payload);
        toast.success("کار ثبت شد.");
      }
      resetForm();
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (item) => {
    if (!item.canEdit) return;
    setEditingId(item.id);
    setForm({
      title: item.title,
      description: item.description || "",
      category: item.category,
      durationMinutes: item.durationMinutes ?? "",
      assigneeId: item.isAssigned ? String(item.assigneeId) : "self",
      status: item.status,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (item) => {
    if (!item.canDelete) return;
    const ok = await confirm({
      title: "حذف کار",
      message: `«${item.title}» حذف شود؟`,
      confirmLabel: "حذف",
      destructive: true,
    });
    if (!ok) return;
    try {
      await api.deleteWorkLog(item.id);
      toast.success("حذف شد.");
      if (editingId === item.id) resetForm();
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleStatusChange = async (item, status) => {
    try {
      await api.updateWorkLog(item.id, { status });
      toast.success("وضعیت به‌روزرسانی شد.");
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleReject = async (item) => {
    const reason = await prompt({
      title: "رد کردن کار",
      message: "علت رد کار را وارد کنید (اختیاری):",
      placeholder: "علت رد...",
      confirmLabel: "رد کردن",
      destructive: true,
    });
    if (reason === null) return;
    try {
      await api.rejectWorkLog(item.id, reason);
      toast.success("کار رد شد.");
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleRevert = async (item) => {
    const ok = await confirm({
      title: "بازگشت به صف",
      message: "این کار دوباره به وضعیت «در صف» برگردد؟",
      confirmLabel: "بازگشت",
    });
    if (!ok) return;
    try {
      await api.updateWorkLog(item.id, { status: "queued" });
      toast.success("رد لغو شد و کار به صف برگشت.");
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const otherAdmins = admins.filter((a) => String(a.id) !== String(user?.id));
  const isSelfAssignee = form.assigneeId === "self";

  const items = data?.items ?? [];
  const summary = data?.summary ?? [];
  const totalCount = data?.total ?? 0;
  const totalMinutes = data?.totalMinutes ?? 0;
  const showAllDates = dateMode === "all";

  const columns = [
    ...(showAllDates
      ? [
          {
            key: "workDate",
            label: "تاریخ",
            headClassName: "w-28 whitespace-nowrap",
            className: "whitespace-nowrap",
            render: (row) => (
              <span className="fa-num text-sm font-medium text-foreground">
                {formatWorkDateCell(row.workDate ?? row.work_date)}
              </span>
            ),
          },
        ]
      : []),
    {
      key: "title",
      label: "شرح کار",
      primary: true,
      headClassName: "whitespace-nowrap",
      className: "min-w-[8.5rem] max-w-[12rem] sm:max-w-[16rem] lg:max-w-[20rem] xl:max-w-[24rem] 2xl:max-w-[28rem]",
      render: (row) => {
        const flag = assignmentBadge(row);
        return (
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <p className="line-clamp-1 font-semibold text-foreground">{row.title}</p>
              {flag && (
                <span className={cn("shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold", flag.className)}>
                  {flag.label}
                </span>
              )}
            </div>
            {row.description && (
              <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{row.description}</p>
            )}
            {row.ticketNumber && (
              <Link to={`/tickets/${row.ticketId}`} className="mt-1 inline-block text-xs font-medium text-primary hover:underline">
                تیکت {toPersianDigits(row.ticketNumber)}
              </Link>
            )}
          </div>
        );
      },
    },
    {
      key: "assignee",
      label: "مسئول",
      headClassName: "w-28 whitespace-nowrap",
      className: "min-w-[6.5rem] max-w-[7.5rem]",
      render: (row) => (
        <div className="text-sm">
          <p className="font-medium">{row.assigneeName}</p>
          {row.isAssigned && (
            <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">از طرف {row.authorName}</p>
          )}
        </div>
      ),
    },
    {
      key: "status",
      label: "وضعیت",
      headClassName: "w-32 whitespace-nowrap",
      className: "min-w-[7.5rem]",
      render: (row) =>
        row.canUpdateStatus ? (
          <Select value={row.status} onValueChange={(v) => handleStatusChange(row, v)}>
            <SelectTrigger className="h-8 w-full min-w-[6.5rem] max-w-[7.5rem]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.filter((s) => s.value !== "rejected").map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <div className="flex flex-col gap-1">
            <StatusBadge value={row.status} />
            {row.rejectReason && (
              <span className="line-clamp-2 text-xs text-muted-foreground">علت رد: {row.rejectReason}</span>
            )}
            {row.canRevert && (
              <Button type="button" variant="outline" size="sm" className="h-7 gap-1 px-2 text-xs" onClick={() => handleRevert(row)}>
                <Undo2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">بازگشت</span>
              </Button>
            )}
          </div>
        ),
    },
    {
      key: "category",
      label: "دسته",
      headClassName: "w-24 whitespace-nowrap",
      className: "whitespace-nowrap",
      render: (row) => (
        <Badge variant="secondary" className="font-normal">
          {workCategoryMeta(row.category).label}
        </Badge>
      ),
    },
    {
      key: "duration",
      label: "مدت",
      headClassName: "w-20 whitespace-nowrap",
      className: "whitespace-nowrap fa-num",
      render: (row) => (
        <span className="fa-num text-sm text-muted-foreground">
          {row.durationMinutes ? `${formatNumber(row.durationMinutes)} دقیقه` : "—"}
        </span>
      ),
    },
  ];

  const rowActions = (row) => (
    <div className="flex flex-wrap justify-end gap-1">
      {row.canEdit && (
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEdit(row)}>
          <Pencil className="h-4 w-4" />
        </Button>
      )}
      {row.canDelete && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-urgent hover:text-urgent"
          onClick={() => handleDelete(row)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
      {row.canReject && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-urgent hover:text-urgent"
          onClick={() => handleReject(row)}
          title="رد کردن"
        >
          <XCircle className="h-4 w-4" />
        </Button>
      )}
      {!row.canEdit && !row.canDelete && !row.canReject && !row.canUpdateStatus && !row.canRevert && (
        <span className="text-xs text-muted-foreground">فقط مشاهده</span>
      )}
    </div>
  );

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="دفتر کار روزانه IT"
        description="کارهای خود را ثبت کنید، به همکاران واگذار کنید و وضعیت را پیگیری کنید."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          icon={ClipboardList}
          label={showAllDates ? "کل کارهای ثبت‌شده" : "کل کارهای این روز"}
          value={formatNumber(totalCount)}
        />
        <StatCard
          icon={Clock}
          label="مجموع زمان ثبت‌شده"
          value={totalMinutes ? formatMinutesAsHours(totalMinutes) : "—"}
        />
        <StatCard
          icon={CalendarDays}
          label={showAllDates ? "بازه نمایش" : "تاریخ شمسی"}
          value={showAllDates ? "همه تاریخ‌ها" : formatWorkDate(date)}
          valueClassName="text-lg leading-snug sm:text-xl"
          iconClassName="from-cyan-500/20 via-cyan-500/10 to-transparent text-cyan-700 ring-cyan-500/20"
        />
      </div>

      {summary.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {summary.map((s) => (
            <button
              key={s.assigneeId}
              type="button"
              onClick={() => {
                setAssigneeId(String(s.assigneeId) === assigneeId ? "" : String(s.assigneeId));
                setPage(1);
              }}
              className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                String(s.assigneeId) === assigneeId
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-white/70 bg-white/70 text-muted-foreground hover:border-primary/30 backdrop-blur-sm"
              }`}
            >
              {s.assigneeName} · {formatNumber(s.count)} کار
              {s.totalMinutes > 0 && ` · ${formatMinutesAsHours(s.totalMinutes)}`}
            </button>
          ))}
          {assigneeId && (
            <button
              type="button"
              onClick={() => {
                setAssigneeId("");
                setPage(1);
              }}
              className="rounded-full border border-dashed border-border px-3 py-1.5 text-sm text-muted-foreground"
            >
              همه همکاران
            </button>
          )}
        </div>
      )}

      <Card className="border-primary/10">
        <CardContent className="p-4 sm:p-6">
          <h2 className="mb-4 flex items-center gap-2 text-base font-bold">
            <Plus className="h-5 w-5 text-primary" />
            {editingId ? "ویرایش کار" : "ثبت کار جدید"}
          </h2>
          <form onSubmit={handleSubmit} className="grid gap-4 lg:grid-cols-2">
            <div className="flex flex-col gap-2 lg:col-span-2">
              <Label htmlFor="work-title">شرح کار *</Label>
              <Input
                id="work-title"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="مثال: نصب ویندوز روی PC اتاق ۳، تعمیر پرینتر واحد مالی..."
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>واگذار به</Label>
              <Select
                value={form.assigneeId}
                onValueChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    assigneeId: v,
                    status: v === "self" ? f.status : "queued",
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="self">خودم</SelectItem>
                  {otherAdmins.map((a) => (
                    <SelectItem key={a.id} value={String(a.id)}>
                      {a.display_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {isSelfAssignee ? (
              <div className="flex flex-col gap-2">
                <Label>وضعیت</Label>
                <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <Label>وضعیت</Label>
                <div className="flex h-10 items-center rounded-lg border border-border bg-muted/40 px-3 text-sm text-muted-foreground">
                  در صف (کار واگذارشده)
                </div>
              </div>
            )}
            <div className="flex flex-col gap-2">
              <Label>دسته‌بندی</Label>
              <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WORK_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="work-duration">مدت زمان (دقیقه)</Label>
              <NumericInput
                id="work-duration"
                value={form.durationMinutes}
                onValueChange={(v) => setForm((f) => ({ ...f, durationMinutes: v }))}
                placeholder="اختیاری"
                maxLength={4}
              />
            </div>
            <div className="flex flex-col gap-2 lg:col-span-2">
              <Label htmlFor="work-desc">جزئیات بیشتر</Label>
              <Textarea
                id="work-desc"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="توضیحات اضافه، نام درخواست‌کننده، محل..."
                rows={2}
              />
            </div>
            <div className="flex flex-wrap gap-2 lg:col-span-2">
              <Button type="submit" disabled={saving}>
                {saving ? "در حال ذخیره..." : editingId ? "ذخیره تغییرات" : "ثبت کار"}
              </Button>
              {editingId && (
                <Button type="button" variant="outline" onClick={resetForm}>
                  انصراف
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="overflow-visible">
        <CardContent className="flex flex-col gap-3 overflow-visible p-4">
          <TableToolbar
            query={search}
            onQueryChange={(v) => {
              setSearch(v);
              setPage(1);
            }}
            page={data?.page ?? 1}
            totalPages={data?.totalPages ?? 1}
            total={totalCount}
            onPageChange={setPage}
            placeholder="جستجو در عنوان، توضیحات یا نام همکار..."
          />

          <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
            <WorkLogDateFilter
              compact
              mode={dateMode}
              date={date}
              onModeChange={(mode) => {
                setDateMode(mode);
                if (mode === "day" && dateMode === "all") {
                  setDate(todayGregorian());
                }
                setPage(1);
              }}
              onDateChange={(v) => {
                setDateMode("day");
                setDate(v);
                setPage(1);
              }}
            />

            <div className="flex flex-1 flex-wrap gap-2">
              <Select
                value={category || "all"}
                onValueChange={(v) => {
                  setCategory(v === "all" ? "" : v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-9 w-full min-w-[8.5rem] sm:w-36">
                  <SelectValue placeholder="دسته" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">همه دسته‌ها</SelectItem>
                  {WORK_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={assigneeId || "all"}
                onValueChange={(v) => {
                  setAssigneeId(v === "all" ? "" : v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-9 w-full min-w-[8.5rem] sm:w-36">
                  <SelectValue placeholder="مسئول" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">همه مسئولین</SelectItem>
                  {admins.map((a) => (
                    <SelectItem key={a.id} value={String(a.id)}>
                      {a.display_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={statusFilter || "all"}
                onValueChange={(v) => {
                  setStatusFilter(v === "all" ? "" : v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-9 w-full min-w-[8.5rem] sm:w-36">
                  <SelectValue placeholder="وضعیت" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">همه وضعیت‌ها</SelectItem>
                  {STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading && !data ? (
        <p className="py-8 text-center text-sm text-muted-foreground">در حال بارگذاری...</p>
      ) : (
        <ResponsiveTable
          rowKey={(row) => row.id}
          rows={items}
          columns={columns}
          tableMinWidth="min-w-full"
          emptyMessage={
            search || category || assigneeId || statusFilter
              ? "کاری با این فیلتر یافت نشد."
              : showAllDates
                ? "هنوز کاری ثبت نشده است."
                : `برای ${formatWorkDate(date)} هنوز کاری ثبت نشده است.`
          }
          mobileActions={rowActions}
        />
      )}
    </div>
  );
}
