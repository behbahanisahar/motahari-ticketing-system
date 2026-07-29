import { NavLink, useNavigate } from "react-router-dom";
import {
  Home,
  Plus,
  ListChecks,
  LayoutDashboard,
  Users,
  LogOut,
  BarChart3,
  UserCircle,
  ClipboardList,
  BookOpen,
  Phone,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { NotificationPanel } from "@/components/NotificationPanel";
import { MobileNav } from "@/components/MobileNav";
import { AdminMoreMenu } from "@/components/AdminMoreMenu";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";

function UserChip({ name }) {
  const initial = name?.trim()?.charAt(0) || "?";
  return (
    <div className="hidden items-center gap-2 md:flex">
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-teal-400 to-cyan-600 text-sm font-bold text-white shadow-sm shadow-teal-500/30">
        {initial}
      </div>
      <span className="max-w-[120px] truncate text-sm font-semibold text-[hsl(var(--header-fg))] lg:max-w-[160px]">
        {name}
      </span>
    </div>
  );
}

export function Shell({ children }) {
  const { user, logout } = useAuth();
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const isAdmin = user?.role === "admin";

  const navLink = ({ isActive }) =>
    cn(
      "inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition-all",
      isActive
        ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
        : "text-[hsl(var(--header-nav))] hover:bg-[hsl(var(--header-control-hover))] hover:text-[hsl(var(--header-fg))]"
    );

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const homeLink = { to: "/", icon: Home, label: "خانه" };

  const userLinks = [
    homeLink,
    { to: "/new", icon: Plus, label: "ثبت تیکت" },
    { to: "/mine", icon: ListChecks, label: "تیکت‌های من" },
    { to: "/phonebook", icon: Phone, label: "داخلی‌ها" },
    { to: "/guide", icon: BookOpen, label: "راهنما" },
  ];

  // Primary admin destinations stay in the bar; the rest live under «بیشتر».
  const adminPrimaryLinks = [
    homeLink,
    { to: "/dashboard", icon: LayoutDashboard, label: "تیکت‌ها" },
    { to: "/worklog", icon: ClipboardList, label: "کار روزانه" },
    { to: "/reports", icon: BarChart3, label: "گزارش‌ها" },
  ];

  const adminMoreLinks = [
    { to: "/admin", icon: Users, label: "کاربران" },
    { to: "/phonebook", icon: Phone, label: "داخلی‌ها" },
    { to: "/profile", icon: UserCircle, label: "پروفایل" },
    { to: "/guide", icon: BookOpen, label: "راهنما" },
  ];

  const desktopLinks = isAdmin ? adminPrimaryLinks : userLinks;
  const mobileLinks = isAdmin ? adminPrimaryLinks : userLinks;
  const mobileMoreLinks = isAdmin ? adminMoreLinks : [];

  return (
    <div className="min-h-full pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-0">
      <header className="glass-header">
        <div className="app-container flex h-16 items-center gap-3 sm:h-[4.25rem] sm:gap-4">
          <div className="shrink-0">
            <Logo to="/" size={36} inverted={isDark} />
          </div>

          <nav className="mx-auto hidden min-w-0 items-center gap-0.5 lg:flex">
            {desktopLinks.map(({ to, icon: Icon, label }) => (
              <NavLink key={to} to={to} end={to === "/"} className={navLink}>
                <Icon className="h-4 w-4 shrink-0" />
                <span className="whitespace-nowrap">{label}</span>
              </NavLink>
            ))}
            {isAdmin && <AdminMoreMenu links={adminMoreLinks} navLinkClass={navLink} />}
          </nav>

          <div className="ms-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
            {user && <UserChip name={user.displayName} />}
            {user && <NotificationPanel />}
            <ThemeToggle />
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="h-9 rounded-xl border-[hsl(var(--header-border))] bg-[hsl(var(--header-control-bg))] px-2.5 text-[hsl(var(--header-fg))] hover:bg-[hsl(var(--header-control-hover))] hover:text-[hsl(var(--header-fg))] sm:px-3"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">خروج</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="app-container py-5 sm:py-7 lg:py-8">
        <div className="page-shell animate-slide-up">{children}</div>
      </main>

      <MobileNav links={mobileLinks} moreLinks={mobileMoreLinks} />
    </div>
  );
}
