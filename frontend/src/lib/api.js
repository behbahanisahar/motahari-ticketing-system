const BASE = import.meta.env.VITE_API_URL || "/api";

async function request(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  if (!isFormData && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${BASE}${path}`, {
    credentials: "include",
    ...options,
    headers,
  });

  let data = null;
  try {
    data = await res.json();
  } catch (_) {
    // no body
  }

  if (!res.ok) {
    throw new Error((data && data.error) || "خطایی رخ داد. لطفاً دوباره تلاش کنید.");
  }
  return data;
}

export const api = {
  login: (username, password) =>
    request("/auth/login", { method: "POST", body: JSON.stringify({ username, password }) }),
  logout: () => request("/auth/logout", { method: "POST" }),
  me: () => request("/auth/me"),
  updateProfile: (displayName) =>
    request("/auth/profile", { method: "PATCH", body: JSON.stringify({ displayName }) }),

  teams: () => request("/meta/teams"),
  createTeam: (name) =>
    request("/meta/teams", { method: "POST", body: JSON.stringify({ name }) }),
  updateTeam: (id, name) =>
    request(`/meta/teams/${id}`, { method: "PATCH", body: JSON.stringify({ name }) }),
  deleteTeam: (id) => request(`/meta/teams/${id}`, { method: "DELETE" }),
  admins: () => request("/meta/admins"),
  users: (params = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== "" && v != null));
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return request(`/meta/users${suffix}`);
  },
  createUser: (payload) =>
    request("/meta/users", { method: "POST", body: JSON.stringify(payload) }),
  updateUser: (id, payload) =>
    request(`/meta/users/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),

  statsCalendar: () => request("/stats/calendar"),
  stats: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== "" && v !== null && v !== undefined)
    );
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return request(`/stats${suffix}`);
  },

  createTicket: (payload) => {
    if (typeof FormData !== "undefined" && payload instanceof FormData) {
      return request("/tickets", { method: "POST", body: payload });
    }
    return request("/tickets", { method: "POST", body: JSON.stringify(payload) });
  },
  ticketScreenshotUrl: (id, { download = false } = {}) =>
    `${BASE}/tickets/${id}/screenshot${download ? "?download=1" : ""}`,
  myTickets: (params = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== "" && v != null));
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return request(`/tickets/mine${suffix}`);
  },
  allTickets: (params = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v));
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return request(`/tickets${suffix}`);
  },
  ticket: (id) => request(`/tickets/${id}`),
  updateTicket: (id, payload) =>
    request(`/tickets/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  addComment: (id, body) =>
    request(`/tickets/${id}/comments`, { method: "POST", body: JSON.stringify({ body }) }),

  markTicketRead: (id) => request(`/tickets/${id}/read`, { method: "POST" }),
  markNotificationsSeen: (ticketIds) =>
    request("/notifications/mark-seen", {
      method: "POST",
      body: JSON.stringify({ ticketIds }),
    }),

  notificationSummary: () => request("/notifications/summary"),
  notifications: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== "" && v != null && v !== undefined)
    );
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return request(`/notifications${suffix}`);
  },
  messageDashboard: () => request("/notifications/dashboard"),

  workLogs: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== "" && v != null && v !== undefined)
    );
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return request(`/worklogs${suffix}`);
  },
  createWorkLog: (payload) =>
    request("/worklogs", { method: "POST", body: JSON.stringify(payload) }),
  updateWorkLog: (id, payload) =>
    request(`/worklogs/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  rejectWorkLog: (id, reason) =>
    request(`/worklogs/${id}/reject`, { method: "POST", body: JSON.stringify({ reason }) }),
  deleteWorkLog: (id) => request(`/worklogs/${id}`, { method: "DELETE" }),
};
