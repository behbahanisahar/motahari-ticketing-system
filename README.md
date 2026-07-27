# Internal IT Ticketing System

A simple, Persian (RTL) helpdesk ticketing system built for internal company use.
Employees log in with their **domain (Active Directory) credentials**, fill out a very
short form (subject, description, their team, computer name, priority), and the
IT team triages/works tickets from a dashboard.

- **Backend:** Node.js + Express + PostgreSQL, auth via LDAP bind against Active Directory, sessions via httpOnly JWT cookie.
- **Frontend:** React + Vite + Tailwind + shadcn/ui-style components, fully in Persian, RTL layout.
- **Roles:** `user` (creates/tracks own tickets), `agent` (works all tickets), `admin` (also manages roles/teams).

---

## 0. Quick local run — zero configuration

Want to just try it out on your laptop, no Active Directory, no `.env` editing?

```bash
docker compose up --build
```

Then open **http://localhost:4000** and log in with:

| Username | Password | Role |
|----------|----------|------|
| `admin`  | `admin123` | admin |
| `agent`  | `agent123` | agent (support staff) |
| `sara`   | `sara123`  | regular employee |
| `reza`   | `reza123`  | regular employee |

This works because:
- The backend automatically falls back to a **built-in mock login** whenever
  `LDAP_URL` isn't set (see `backend/src/auth/mockAuth.js`) — no real domain
  controller needed.
- `docker-compose.yml` already bakes in working defaults for the database
  connection, JWT secret, and CORS, so there's nothing to fill in.
- The login page itself shows these demo credentials whenever mock mode is active.

When you're ready to go live with real Active Directory, jump to section 3 and
set `LDAP_URL`/`LDAP_DOMAIN`/etc. — as soon as `LDAP_URL` is set, mock mode
turns off automatically and real AD login takes over.

---

## 0b. Open on LAN IP (e.g. `http://192.168.113.239:4000`)

Hospital **production** is the machine at `192.168.113.239` — see [PRODUCTION.md](./PRODUCTION.md).

On that machine:

```bash
npm run lan:up
```

Then open **http://192.168.113.239:4000** from any PC on the same network.

To stop:

```bash
npm run lan:down
```

---

## 1. How "only our domain can use it" works

This app enforces access two ways, and you should use **both**:

1. **Login is tied to your AD domain.** The backend performs an LDAP bind against
   your domain controller (`LDAP_URL` / `LDAP_DOMAIN`) — only valid domain accounts
   can log in. There is no public sign-up.
2. **Network restriction (recommended, do this at the infra level):** host this on an
   internal server / internal DNS name (e.g. `helpdesk.yourcompany.local`) that is
   only reachable from inside your corporate network or VPN. Do not expose the
   server's port directly to the internet. A reverse proxy (nginx/IIS) with an
   internal-only firewall rule, or binding it to an internal network interface, is
   the simplest way to do this.

---

## 2. Prerequisites

- Node.js 18+
- PostgreSQL 14+ (or use the included `docker-compose.yml`)
- Network access from this server to a domain controller (LDAP/389 or LDAPS/636)
- A read-only AD **service account** (for looking up user profile info like display name/department after a successful login bind)

---

## 3. Backend setup (manual, without Docker)

`.env` is optional — every setting has a working local default (see
`backend/src/config.js`). Only create one once you're pointing at a real
database and Active Directory:

```bash
cd backend
cp .env.example .env
# edit .env: DATABASE_URL, LDAP_URL, LDAP_DOMAIN, LDAP_BASE_DN,
#            LDAP_BIND_DN, LDAP_BIND_PASSWORD, JWT_SECRET, ADMIN_USERNAMES

npm install
```

Create the database (either run Postgres yourself, or use Docker):

```bash
# from the project root
docker compose up -d postgres
```

If you're not using Docker, create the DB and load the schema manually:

```bash
createdb ticketing
psql "$DATABASE_URL" -f schema.sql
```

Start the backend:

```bash
npm start
# Ticketing backend running on port 4000
```

### First admin login

Add your own AD username to `ADMIN_USERNAMES` in `.env` **before your first login**.
The first time you log in with that username, your account is automatically
promoted to `admin`. From the "Manage Users" (مدیریت کاربران) page you can then
promote colleagues to `agent` (support staff) or `admin`.

### LDAPS (recommended for production)

If your domain controller requires LDAPS, set `LDAP_URL=ldaps://dc01.yourcompany.local:636`.
If it uses a private/internal CA certificate, you may need to supply the CA cert to
Node — ask your PKI team, or terminate TLS at a trusted internal proxy.

---

## 4. Frontend setup

```bash
cd frontend
npm install
npm run dev
```

This runs the dev server on `http://localhost:5173` and proxies `/api` requests to
the backend on port 4000 (see `vite.config.js`).

For production, build static files and serve them behind your reverse proxy:

```bash
npm run build
# outputs to frontend/dist — serve with nginx/IIS, or `npm run preview`
```

Set `CORS_ORIGIN` in the backend `.env` to match the exact URL employees will use
(e.g. `http://helpdesk.yourcompany.local`), and set `COOKIE_SECURE=true` once you
serve everything over HTTPS.

---

## 5. Customizing teams (departments)

A default list of departments is seeded in `schema.sql` (IT, Finance, HR, Sales,
etc., in Persian). Admins can add more from the API (`POST /api/meta/teams`) — a
UI for this can be added to the Admin page if you'd like; for now it's easiest to
insert directly:

```sql
INSERT INTO teams (name) VALUES ('نام واحد جدید');
```

---

## 6. What each role sees

| Role  | Can do |
|-------|--------|
| user  | Submit new tickets, view/comment on their own tickets |
| agent | Everything a user can do, plus the full ticket dashboard: filter by status/priority/team, change status/priority, assign tickets to themselves or colleagues |
| admin | Everything an agent can do, plus promote/demote other users' roles |

---

## 7. Project structure

```
backend/
  schema.sql          # PostgreSQL schema + seed data
  src/
    server.js          # Express app entry point
    db.js               # PostgreSQL pool
    auth/ldap.js        # AD bind + profile lookup
    middleware/auth.js  # JWT cookie verification + role guard
    routes/auth.js      # /api/auth/*
    routes/tickets.js   # /api/tickets/*
    routes/meta.js      # /api/meta/* (teams, users, agents)
frontend/
  src/
    pages/              # Login, NewTicket, MyTickets, TicketDetail, AgentDashboard, AdminUsers
    components/         # Shell (layout/nav), PriorityPicker, StatusBadges
    components/ui/      # shadcn-style Button/Input/Select/Table/Card/Badge...
    lib/                # api.js (fetch wrapper), constants.js (priority/status labels)
    hooks/useAuth.jsx    # current-user context
docker-compose.yml     # PostgreSQL for local/dev use
```

---

## 8. Notes / things to double check before go-live

- Fonts are loaded from Google Fonts (Vazirmatn). If your network is fully
  air-gapped, self-host the font files instead (see comment in `index.html`).
- Set a strong, random `JWT_SECRET`.
- Set `COOKIE_SECURE=true` and serve over HTTPS in production.
- Consider adding a scheduled Postgres backup for the `tickets` table.
