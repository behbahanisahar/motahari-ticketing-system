import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Plus,
  ListChecks,
  LayoutDashboard,
  BarChart3,
  Users,
  UserCircle,
  ClipboardList,
  ArrowLeft,
  Clock,
  Ticket,
  MessageCircle,
  Bell,
  CalendarDays,
  BookOpen,
  Phone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadges";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";
import { api } from "@/lib/api";
import { ticketStatus } from "@/lib/constants";
import { formatDateFa, formatNumber, toPersianDigits } from "@/lib/format";
import { toast } from "sonner";

export default function Home() {
  const { user } = useAuth();
  const { dashboard } = useNotifications();
  const isAdmin = user?.role === "admin";
  const [recent, setRecent] = useState(null);
  const [total, setTotal] = useState(null);

  useEffect(() => {
    if (isAdmin) {
      api
        .allTickets({ page: 1, limit: 5, sort: "created_at", order: "desc" })
        .then((r) => {
          setRecent(r.items);
          setTotal(r.total);
        })
        .catch((err) => toast.error(err.message));
    } else {
      api
        .myTickets({ page: 1, limit: 5 })
        .then((r) => {
          setRecent(r.items);
          setTotal(r.total);
        })
        .catch((err) => toast.error(err.message));
    }
  }, [isAdmin]);

  const userActions = [
    { to: "/new", icon: Plus, title: "ثبت تیکت جدید" },
    { to: "/mine", icon: ListChecks, title: "تیکت‌های من" },
    { to: "/guide", icon: BookOpen, title: "راهنمای استفاده" },
  ];

  const adminActions = [
    { to: "/dashboard", icon: LayoutDashboard, title: "مدیریت تیکت‌ها" },
    { to: "/worklog", icon: ClipboardList, title: "دفتر کار روزانه" },
    { to: "/reports", icon: BarChart3, title: "گزارش‌ها" },
    { to: "/admin", icon: Users, title: "کاربران و واحدها" },
    { to: "/phonebook", icon: Phone, title: "دفترچه تلفن داخلی" },
    { to: "/profile", icon: UserCircle, title: "پروفایل" },
    { to: "/guide", icon: BookOpen, title: "راهنمای استفاده" },
  ];

  const actions = isAdmin ? adminActions : userActions;

  return (
    <div className="section-gap">
      <section className="relative">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="app-kicker mb-3">{isAdmin ? "پنل مدیریت" : "پورتال کاربران"}</p>
            <h1 className="text-2xl font-bold tracking-tight text-[hsl(var(--canvas-text))] sm:text-3xl">
              سلام، {user?.displayName}
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-7 text-[hsl(var(--canvas-muted))] sm:text-base">
              {isAdmin
                ? "تیکت‌ها، کار روزانه و گزارش‌ها در یک نگاه."
                : "ثبت درخواست پشتیبانی و پیگیری وضعیت آن."}
            </p>
            {user?.department && (
              <p className="mt-2 text-sm text-[hsl(var(--canvas-muted))]">
                واحد: <span className="font-semibold text-[hsl(var(--canvas-text))]">{user.department}</span>
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {total !== null && (
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/90 px-4 py-2 text-sm shadow-soft backdrop-blur-md">
                <Ticket className="h-4 w-4 text-primary" />
                <span className="text-muted-foreground">{isAdmin ? "کل تیکت‌ها" : "تیکت‌های شما"}</span>
                <span className="fa-num font-bold text-foreground">{formatNumber(total)}</span>
              </div>
            )}
            {!isAdmin && (
              <Link to="/new">
                <Button size="lg" className="rounded-2xl shadow-lg shadow-primary/20">
                  <Plus className="h-5 w-5" />
                  ثبت درخواست
                </Button>
              </Link>
            )}
          </div>
        </div>
      </section>

      {dashboard && (
        <section className="section-block">
          <h2 className="page-section-title mb-0 flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-primary" />
            آمار پیام‌ها
          </h2>
          <div className="metric-strip lg:!grid-cols-4 xl:!grid-cols-4">
            <div className="metric-cell">
              <div className="flex items-center gap-2 text-muted-foreground">
                <MessageCircle className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs">کل پیام‌ها</span>
              </div>
              <p className="fa-num text-xl font-bold">{formatNumber(dashboard.totalMessages)}</p>
            </div>
            <div className="metric-cell">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Bell className={`h-3.5 w-3.5 ${dashboard.unreadMessages > 0 ? "text-urgent" : "text-primary"}`} />
                <span className="text-xs">خوانده‌نشده</span>
              </div>
              <p className="fa-num text-xl font-bold">{formatNumber(dashboard.unreadMessages)}</p>
            </div>
            <div className="metric-cell">
              <div className="flex items-center gap-2 text-muted-foreground">
                <CalendarDays className="h-3.5 w-3.5 text-cyan-700" />
                <span className="text-xs">پیام‌های امروز</span>
              </div>
              <p className="fa-num text-xl font-bold">{formatNumber(dashboard.messagesToday)}</p>
            </div>
            <div className="metric-cell">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Ticket className="h-3.5 w-3.5 text-slate-700" />
                <span className="text-xs">تیکت با پیام جدید</span>
              </div>
              <p className="fa-num text-xl font-bold">{formatNumber(dashboard.ticketsWithUnread)}</p>
            </div>
          </div>
        </section>
      )}

      <section className="section-block">
        <h2 className="page-section-title mb-0">دسترسی سریع</h2>
        <div className="home-action-row">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <Link key={action.to} to={action.to} className="home-action-chip">
                <Icon className="h-4 w-4 text-primary" />
                {action.title}
              </Link>
            );
          })}
        </div>
      </section>

      {recent !== null && (
        <section className="section-block">
          <div className="flex items-center justify-between gap-3">
            <h2 className="page-section-title mb-0 flex items-center gap-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              {isAdmin ? "آخرین تیکت‌ها" : "فعالیت اخیر"}
            </h2>
            <Link
              to={isAdmin ? "/dashboard" : "/mine"}
              className="text-sm font-semibold text-primary hover:underline"
            >
              مشاهده همه
            </Link>
          </div>

          {recent.length === 0 ? (
            <div className="home-list px-4 py-10 text-center text-sm text-muted-foreground">
              هنوز تیکتی ثبت نشده است.
              {!isAdmin && (
                <div className="mt-4">
                  <Link to="/new">
                    <Button type="button">ثبت اولین تیکت</Button>
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <div className="home-list">
              {recent.map((t) => (
                <Link key={t.id} to={`/tickets/${t.id}`} className="home-list-item">
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="fa-num rounded-md bg-slate-800 px-2 py-0.5 text-xs font-semibold text-white">
                        {toPersianDigits(t.ticket_number)}
                      </span>
                      <StatusBadge value={ticketStatus(t)} />
                    </div>
                    <p className="truncate font-semibold text-foreground">{t.subject}</p>
                    <p className="fa-num text-xs text-muted-foreground">
                      {formatDateFa(t.created_at, { year: "numeric", month: "long", day: "numeric" })}
                    </p>
                  </div>
                  <ArrowLeft className="h-4 w-4 shrink-0 text-muted-foreground" />
                </Link>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
