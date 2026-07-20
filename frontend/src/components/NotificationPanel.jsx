import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Bell, CheckCheck, ChevronLeft, ChevronRight, MessageCircle, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/StatusBadges";
import { useNotifications } from "@/hooks/useNotifications";
import { api } from "@/lib/api";
import { formatDateTimeFa, formatNumber, toPersianDigits } from "@/lib/format";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 8;

export function NotificationPanel() {
  const { summary, markTicketRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [list, setList] = useState(null);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef(null);

  const unread = summary.unreadTotal;

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.notifications({ page, limit: PAGE_SIZE, q: query, filter });
      setList(data);
    } catch {
      setList({ items: [], total: 0, page: 1, totalPages: 1 });
    } finally {
      setLoading(false);
    }
  }, [page, query, filter]);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(loadList, query ? 250 : 0);
    return () => clearTimeout(timer);
  }, [open, loadList, query, summary.unreadTotal, summary.totalTickets]);

  const handleOpenTicket = async (ticketId) => {
    await markTicketRead(ticketId);
    setOpen(false);
  };

  const items = list?.items ?? [];
  const total = list?.total ?? 0;
  const totalPages = list?.totalPages ?? 1;

  return (
    <div className="relative" ref={panelRef}>
      <Button
        variant="outline"
        size="sm"
        className={cn(
          "relative h-9 rounded-full border px-2.5 shadow-sm transition-all",
          open
            ? "border-primary bg-primary text-primary-foreground shadow-md shadow-primary/25"
            : "border-[hsl(var(--header-border))] bg-[hsl(var(--header-control-bg))] text-[hsl(var(--header-fg))] hover:bg-[hsl(var(--header-control-hover))]",
          unread > 0 && !open && "border-primary/50"
        )}
        onClick={() => setOpen((v) => !v)}
        aria-label="اعلان‌ها"
        aria-expanded={open}
      >
        <Bell className={cn("h-4 w-4", open ? "text-primary-foreground" : unread > 0 && "text-primary")} />
        {unread > 0 && (
          <span className="fa-num absolute -top-2 start-0 flex h-5 min-w-5 -translate-x-1/2 items-center justify-center rounded-full bg-urgent px-1 text-[10px] font-bold text-white shadow-lg ring-2 ring-[hsl(var(--header-bg))]">
            {formatNumber(unread)}
          </span>
        )}
      </Button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40 bg-slate-950/45 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-hidden
          />

          <div
            className={cn(
              "notification-panel fixed z-50 flex max-h-[min(88vh,640px)] flex-col overflow-hidden rounded-2xl",
              "border border-white/70 bg-white/90 shadow-[0_24px_64px_rgb(15_23_42_/_0.2)] backdrop-blur-xl",
              "inset-x-2 top-[4rem] sm:inset-x-4 md:absolute md:inset-x-auto md:end-0 md:top-full md:mt-2",
              "w-auto md:w-[min(100vw-2rem,420px)]"
            )}
          >
            <div className="border-b border-white/20 bg-gradient-to-l from-primary via-cyan-600 to-slate-800 px-4 py-4 text-white">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                    <MessageCircle className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-base font-bold">پیام‌ها و اعلان‌ها</p>
                    <p className="fa-num mt-0.5 text-xs text-white/85">
                      {unread > 0
                        ? `${formatNumber(unread)} پیام خوانده‌نشده`
                        : "همه پیام‌ها خوانده شده‌اند"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/15 transition-colors hover:bg-white/25"
                  aria-label="بستن"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="space-y-3 border-b border-border/60 bg-white/65 px-3 py-3 backdrop-blur-sm">
              <div className="relative">
                <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setPage(1);
                  }}
                  placeholder="جستجو در موضوع، شماره تیکت، پیام..."
                  className="h-10 border-border/80 bg-white/90 ps-10"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "all", label: "همه" },
                  { id: "unread", label: "خوانده‌نشده" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setFilter(tab.id);
                      setPage(1);
                    }}
                    className={cn(
                      "rounded-xl border px-3 py-2 text-sm font-semibold transition-colors",
                      filter === tab.id
                        ? "border-primary bg-primary text-primary-foreground shadow-sm"
                        : "border-border/80 bg-white/80 text-slate-700 hover:border-primary/40"
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto bg-white/90">
              {loading && !list ? (
                <p className="px-4 py-10 text-center text-sm text-muted-foreground">در حال بارگذاری...</p>
              ) : items.length === 0 ? (
                <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
                  <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary text-muted-foreground">
                    <Bell className="h-6 w-6" />
                  </span>
                  <p className="text-sm font-semibold text-foreground">
                    {query || filter === "unread" ? "موردی یافت نشد" : "اعلانی وجود ندارد"}
                  </p>
                  <p className="text-xs text-muted-foreground">پیام‌های تیکت‌ها اینجا نمایش داده می‌شوند.</p>
                </div>
              ) : (
                <ul className="divide-y divide-border/60">
                  {items.map((item) => {
                    const isUnread = item.unreadCount > 0;
                    return (
                      <li key={item.ticketId}>
                        <Link
                          to={`/tickets/${item.ticketId}`}
                          onClick={() => handleOpenTicket(item.ticketId)}
                          className={cn(
                            "block border-s-4 px-4 py-3.5 transition-colors hover:bg-secondary/60",
                            isUnread ? "border-s-primary bg-primary/5" : "border-s-transparent"
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="mb-2 flex flex-wrap items-center gap-2">
                                <span className="fa-num rounded-lg bg-slate-800 px-2 py-0.5 text-xs font-bold text-white">
                                  {toPersianDigits(item.ticketNumber)}
                                </span>
                                <StatusBadge value={item.status} />
                                {isUnread && (
                                  <span className="fa-num rounded-full bg-urgent px-2 py-0.5 text-[10px] font-bold text-white">
                                    {formatNumber(item.unreadCount)} جدید
                                  </span>
                                )}
                              </div>
                              <p className="font-bold leading-snug text-foreground">{item.subject}</p>
                              {item.lastMessage && (
                                <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                                  <span className="font-semibold text-foreground">
                                    {item.lastMessage.author_name}:
                                  </span>{" "}
                                  {item.lastMessage.body}
                                </p>
                              )}
                              {item.lastMessage && (
                                <p className="fa-num mt-2 text-xs font-medium text-muted-foreground">
                                  {formatDateTimeFa(item.lastMessage.created_at)}
                                </p>
                              )}
                            </div>
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="flex flex-col gap-2 border-t border-border/60 bg-white/70 px-3 py-3">
              {total > 0 && (
                <div className="flex items-center justify-between gap-2">
                  <span className="fa-num text-xs font-medium text-muted-foreground">
                    {formatNumber(total)} تیکت · صفحه {formatNumber(page)} از {formatNumber(totalPages)}
                  </span>
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 border-border/80 bg-white/90"
                      disabled={page <= 1 || loading}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      aria-label="صفحه قبل"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 border-border/80 bg-white/90"
                      disabled={page >= totalPages || loading}
                      onClick={() => setPage((p) => p + 1)}
                      aria-label="صفحه بعد"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
              {unread === 0 && items.length > 0 && (
                <div className="flex items-center justify-center gap-1.5 text-xs font-medium text-emerald-700">
                  <CheckCheck className="h-3.5 w-3.5" />
                  همه پیام‌ها خوانده شده‌اند
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
