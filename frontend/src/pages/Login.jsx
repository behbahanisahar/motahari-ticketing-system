import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  Eye,
  EyeOff,
  HeartPulse,
  Loader2,
  Lock,
  Shield,
  ShieldCheck,
  User,
} from "lucide-react";
import { Logo, LogoMark } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";

function LoginCareVisual() {
  return (
    <div className="login-visual relative mx-auto w-full max-w-[360px] shrink-0" aria-hidden>
      <svg viewBox="0 0 360 260" className="h-auto w-full drop-shadow-2xl" fill="none">
        <defs>
          <linearGradient id="lv-panel" x1="40" y1="30" x2="300" y2="230" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FFFFFF" stopOpacity="0.96" />
            <stop offset="1" stopColor="#E0F7FA" stopOpacity="0.88" />
          </linearGradient>
          <linearGradient id="lv-accent" x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="#14B8A6" />
            <stop offset="1" stopColor="#0891B2" />
          </linearGradient>
          <filter id="lv-soft" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="10" stdDeviation="12" floodColor="#042F2E" floodOpacity="0.25" />
          </filter>
        </defs>

        {/* Soft floor shadow */}
        <ellipse cx="180" cy="236" rx="118" ry="12" fill="#042F2E" fillOpacity="0.22" />

        {/* Main care dashboard card */}
        <g filter="url(#lv-soft)">
          <rect x="58" y="36" width="244" height="178" rx="28" fill="url(#lv-panel)" />
          <rect x="58" y="36" width="244" height="42" rx="28" fill="#0F766E" fillOpacity="0.08" />
          <rect x="58" y="58" width="244" height="20" fill="#0F766E" fillOpacity="0.08" />

          {/* Header bar */}
          <circle cx="84" cy="58" r="8" fill="url(#lv-accent)" />
          <path d="M80 58h8M84 54v8" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
          <rect x="102" y="52" width="72" height="8" rx="4" fill="#0F766E" fillOpacity="0.35" />
          <rect x="102" y="64" width="48" height="6" rx="3" fill="#94A3B8" fillOpacity="0.45" />

          {/* Status chips */}
          <rect x="78" y="92" width="88" height="54" rx="16" fill="#ECFDF5" />
          <rect x="94" y="104" width="40" height="7" rx="3.5" fill="#14B8A6" fillOpacity="0.55" />
          <rect x="94" y="118" width="56" height="6" rx="3" fill="#94A3B8" fillOpacity="0.4" />
          <circle cx="148" cy="119" r="8" fill="#14B8A6" fillOpacity="0.9" />

          <rect x="178" y="92" width="100" height="54" rx="16" fill="#EFF6FF" />
          <rect x="194" y="104" width="48" height="7" rx="3.5" fill="#0284C7" fillOpacity="0.5" />
          <rect x="194" y="118" width="60" height="6" rx="3" fill="#94A3B8" fillOpacity="0.4" />

          {/* Mini ticket rows */}
          <rect x="78" y="160" width="200" height="14" rx="7" fill="#F1F5F9" />
          <rect x="78" y="182" width="160" height="14" rx="7" fill="#F1F5F9" />
          <circle cx="90" cy="167" r="4" fill="#14B8A6" />
          <circle cx="90" cy="189" r="4" fill="#F59E0B" />
        </g>

        {/* Floating medical badge */}
        <g transform="translate(268, 48)">
          <rect width="56" height="56" rx="18" fill="url(#lv-accent)" />
          <path d="M28 16v24M16 28h24" stroke="white" strokeWidth="3.2" strokeLinecap="round" />
        </g>

        {/* Floating heart pulse chip */}
        <g transform="translate(28, 118)">
          <rect width="64" height="40" rx="14" fill="#0F172A" fillOpacity="0.82" />
          <path
            d="M10 22 H18 L22 14 L26 30 L30 20 H42"
            stroke="#5EEAD4"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>

        {/* Floating shield chip */}
        <g transform="translate(286, 156)">
          <rect width="48" height="48" rx="16" fill="#FFFFFF" fillOpacity="0.92" />
          <path
            d="M24 12l12 5v10c0 8-5.5 13-12 15-6.5-2-12-7-12-15V17l12-5z"
            stroke="#0F766E"
            strokeWidth="2.2"
            fill="#CCFBF1"
          />
        </g>
      </svg>
    </div>
  );
}

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(username.trim(), password);
      const dest = location.state?.from || "/";
      navigate(dest, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page fixed inset-0 z-20 flex items-center justify-center overflow-hidden p-3 sm:p-4 md:p-5">
      <div className="absolute end-4 top-4 z-30 flex items-center gap-2 sm:end-6 sm:top-6">
        <Link
          to="/guide"
          className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-slate-200/80 bg-white/90 px-3 text-sm font-semibold text-slate-700 shadow-sm backdrop-blur-sm transition-colors hover:bg-white hover:text-teal-800 dark:border-white/15 dark:bg-slate-900/70 dark:text-slate-100 dark:hover:bg-slate-900"
        >
          <BookOpen className="h-4 w-4" />
          راهنما
        </Link>
        <ThemeToggle />
      </div>
      <div className="login-shell login-enter grid h-full min-h-0 w-full max-w-5xl overflow-hidden rounded-[1.75rem] border border-slate-200/70 shadow-[0_28px_80px_rgb(15_70_90_/_0.14)] dark:border-white/15 dark:shadow-[0_28px_80px_rgb(2_10_24_/_0.5)] lg:grid-cols-[1fr_1fr]">
        <section className="login-scene relative hidden min-h-0 flex-col overflow-hidden px-8 py-7 text-white lg:flex xl:px-11">
          <div className="login-scene-glow" />

          <div className="relative z-10 shrink-0">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/95 backdrop-blur-md">
              <HeartPulse className="h-3.5 w-3.5 text-cyan-200" />
              بیمارستان مطهری
            </div>

            <div className="mt-5 flex items-center gap-4">
              <LogoMark size={52} className="shadow-xl shadow-black/25" />
              <div>
                <p className="text-3xl font-bold tracking-tight">تیک‌یار</p>
                <p className="mt-1 text-sm text-white/70">سامانه پشتیبانی فنی بیمارستان</p>
              </div>
            </div>
          </div>

          <div className="relative z-10 flex min-h-0 flex-1 items-center justify-center py-4">
            <LoginCareVisual />
          </div>

          <div className="relative z-10 shrink-0 max-w-md">
            <h1 className="text-2xl font-bold leading-snug xl:text-3xl">
              مراقبت دیجیتال، پیگیری شفاف
            </h1>
            <p className="mt-3 text-sm leading-7 text-white/72">
              ثبت درخواست، هماهنگی تیم IT و پیگیری وضعیت در یک محیط امن و سازمانی.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium backdrop-blur-sm">
                پیگیری سریع
              </span>
              <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium backdrop-blur-sm">
                ارتباط امن
              </span>
              <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium backdrop-blur-sm">
                هماهنگ با واحدها
              </span>
            </div>
          </div>
        </section>

        <section className="login-enter-delay flex min-h-0 flex-col justify-center overflow-hidden bg-[#f5fafb] px-5 py-6 sm:px-8 sm:py-8 lg:px-10">
          <div className="mx-auto w-full max-w-sm">
            <div className="mb-6 text-center lg:text-start">
              <div className="mb-4 flex justify-center lg:hidden">
                <Logo to="/login" showText={false} size={52} className="pointer-events-none" />
              </div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-teal-600/15 bg-teal-500/10 px-3 py-1 text-xs font-medium text-teal-700">
                <ShieldCheck className="h-3.5 w-3.5" />
                دسترسی کارکنان
              </div>
              <h2 className="text-2xl font-bold text-slate-900">ورود به سامانه</h2>
              <p className="mt-1.5 text-sm text-slate-500">با حساب سازمانی وارد شوید.</p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="username" className="text-sm font-semibold text-slate-800">
                  نام کاربری
                </Label>
                <div className="login-input-wrap">
                  <User className="login-input-icon" />
                  <Input
                    id="username"
                    autoFocus
                    autoComplete="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="نام کاربری سازمانی"
                    required
                    className="login-field h-12 rounded-xl border-slate-200 bg-white ps-11 pe-4 text-base text-slate-900 shadow-none placeholder:text-slate-400 focus-visible:border-teal-500/50 focus-visible:ring-teal-500/20"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="password" className="text-sm font-semibold text-slate-800">
                  رمز عبور
                </Label>
                <div className="login-input-wrap">
                  <Lock className="login-input-icon" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="رمز عبور"
                    required
                    className="login-field h-12 rounded-xl border-slate-200 bg-white ps-11 pe-12 text-base text-slate-900 shadow-none placeholder:text-slate-400 focus-visible:border-teal-500/50 focus-visible:ring-teal-500/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute top-1/2 end-3 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                    aria-label={showPassword ? "مخفی کردن رمز" : "نمایش رمز"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div
                  role="alert"
                  className="flex items-start gap-2.5 rounded-xl border border-urgent/25 bg-urgent/10 px-3.5 py-3 text-sm font-medium text-urgent"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <Button
                type="submit"
                size="lg"
                disabled={loading}
                className="mt-1 h-12 w-full rounded-xl bg-teal-700 text-base shadow-lg shadow-teal-800/20 hover:bg-teal-800"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    در حال ورود...
                  </>
                ) : (
                  <>
                    ورود
                    <ArrowLeft className="h-5 w-5" />
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 flex flex-col items-center gap-3 text-xs text-slate-500 lg:items-start">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-teal-600/80" />
                <span>ارتباط امن با سامانه بیمارستان</span>
              </div>
              <Link
                to="/guide"
                className="inline-flex items-center gap-1.5 font-semibold text-teal-700 transition-colors hover:text-teal-900"
              >
                <BookOpen className="h-3.5 w-3.5" />
                مشاهده راهنمای استفاده
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
