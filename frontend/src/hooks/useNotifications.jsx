import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";

const NotificationsContext = createContext(null);

export function NotificationsProvider({ children }) {
  const { user } = useAuth();
  const [summary, setSummary] = useState({
    unreadTotal: 0,
    ticketsWithUnread: 0,
    totalTickets: 0,
    items: [],
  });
  const [dashboard, setDashboard] = useState(null);
  const socketRef = useRef(null);

  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      const [s, d] = await Promise.all([api.notificationSummary(), api.messageDashboard()]);
      setSummary(s);
      setDashboard(d);
    } catch {
      // ignore when logged out
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setSummary({ unreadTotal: 0, ticketsWithUnread: 0, totalTickets: 0, items: [] });
      setDashboard(null);
      return;
    }

    refresh();

    const socket = io({ path: "/socket.io", withCredentials: true, transports: ["websocket", "polling"] });
    socketRef.current = socket;

    socket.on("notification:update", () => {
      refresh();
    });

    // Vercel serverless has no persistent WebSocket server — poll as fallback
    let pollTimer;
    socket.on("connect_error", () => {
      if (!pollTimer) pollTimer = setInterval(refresh, 15000);
    });
    socket.on("connect", () => {
      if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
    });

    return () => {
      if (pollTimer) clearInterval(pollTimer);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user, refresh]);

  const joinTicket = useCallback((ticketId) => {
    socketRef.current?.emit("ticket:join", ticketId);
  }, []);

  const leaveTicket = useCallback((ticketId) => {
    socketRef.current?.emit("ticket:leave", ticketId);
  }, []);

  const onNewMessage = useCallback((handler) => {
    const socket = socketRef.current;
    if (!socket) return () => {};
    socket.on("message:new", handler);
    return () => socket.off("message:new", handler);
  }, []);

  const markTicketRead = useCallback(
    async (ticketId) => {
      await api.markTicketRead(ticketId);
      await refresh();
    },
    [refresh]
  );

  const markNotificationsSeen = useCallback(
    async (ticketIds) => {
      if (!ticketIds?.length) return;
      const result = await api.markNotificationsSeen(ticketIds);
      if (result?.summary) {
        setSummary(result.summary);
      } else {
        await refresh();
      }
      return result;
    },
    [refresh]
  );

  return (
    <NotificationsContext.Provider
      value={{
        summary,
        dashboard,
        refresh,
        joinTicket,
        leaveTicket,
        onNewMessage,
        markTicketRead,
        markNotificationsSeen,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationsProvider");
  return ctx;
}
