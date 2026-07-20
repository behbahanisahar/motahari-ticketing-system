import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { NotificationsProvider } from "@/hooks/useNotifications";
import { AppDialogProvider } from "@/hooks/useAppDialog";
import { ThemeProvider } from "@/hooks/useTheme";
import { AppLayout } from "@/components/AppBackground";
import { Shell } from "@/components/Shell";
import { Toaster } from "@/components/ui/sonner";

import Login from "@/pages/Login";
import Home from "@/pages/Home";
import NewTicket from "@/pages/NewTicket";
import MyTickets from "@/pages/MyTickets";
import TicketDetail from "@/pages/TicketDetail";
import AgentDashboard from "@/pages/AgentDashboard";
import AdminUsers from "@/pages/AdminUsers";
import AdminReports from "@/pages/AdminReports";
import Profile from "@/pages/Profile";
import WorkLog from "@/pages/WorkLog";

function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-full items-center justify-center">
        <p className="rounded-full bg-white/60 px-4 py-2 text-sm text-muted-foreground backdrop-blur-sm">
          در حال بارگذاری...
        </p>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  return children;
}

function RequireRole({ roles, children }) {
  const { user } = useAuth();
  if (!roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

function Protected({ children, roles }) {
  return (
    <RequireAuth>
      {roles ? <RequireRole roles={roles}>{children}</RequireRole> : children}
    </RequireAuth>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
      <AuthProvider>
        <NotificationsProvider>
        <AppDialogProvider>
        <AppLayout>
          <Toaster />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/"
              element={
                <Protected>
                  <Shell><Home /></Shell>
                </Protected>
              }
            />
            <Route
              path="/new"
              element={
                <Protected>
                  <Shell><NewTicket /></Shell>
                </Protected>
              }
            />
            <Route
              path="/mine"
              element={
                <Protected>
                  <Shell><MyTickets /></Shell>
                </Protected>
              }
            />
            <Route
              path="/tickets/:id"
              element={
                <Protected>
                  <Shell><TicketDetail /></Shell>
                </Protected>
              }
            />
            <Route
              path="/dashboard"
              element={
                <Protected roles={["admin"]}>
                  <Shell><AgentDashboard /></Shell>
                </Protected>
              }
            />
            <Route
              path="/reports"
              element={
                <Protected roles={["admin"]}>
                  <Shell><AdminReports /></Shell>
                </Protected>
              }
            />
            <Route
              path="/admin"
              element={
                <Protected roles={["admin"]}>
                  <Shell><AdminUsers /></Shell>
                </Protected>
              }
            />
            <Route
              path="/worklog"
              element={
                <Protected roles={["admin"]}>
                  <Shell><WorkLog /></Shell>
                </Protected>
              }
            />
            <Route
              path="/profile"
              element={
                <Protected roles={["admin"]}>
                  <Shell><Profile /></Shell>
                </Protected>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AppLayout>
        </AppDialogProvider>
        </NotificationsProvider>
      </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
