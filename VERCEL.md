# Deploy to Vercel

**Live app (only use this URL):** https://motahari-ticketing-system.vercel.app

## 1. Login

```bash
npx vercel login
```

## 2. Deploy

From the project root — always use the npm script so production is aliased to the Motahari URL:

```bash
cd "/Users/saharbehbahani/Downloads/ticketing-system 2"
npm run deploy:prod
```

Or manually:

```bash
npx vercel --prod --yes
npx vercel alias set <deployment-url> motahari-ticketing-system.vercel.app
```

The project name on Vercel is `motahari-ticketing-system`.
Do **not** treat `ticketing-system-2.vercel.app` as the live app.

## 3. Database (required)

The API needs a hosted Postgres database. Docker Postgres is local-only.

1. Create a free database at [Neon](https://neon.tech) (or Vercel Postgres / Supabase).
2. Run `backend/schema.sql` once against it (SQL editor or `psql`).
3. Add this env var in **Vercel → Project → Settings → Environment Variables**:

| Variable | Value |
|----------|--------|
| `DATABASE_URL` | `postgres://user:pass@host/db?sslmode=require` |

Or via CLI:

```bash
printf '%s' 'YOUR_POSTGRES_URL' | npx vercel env add DATABASE_URL production
npm run deploy:prod
```

### Already configured on production

| Variable | Value |
|----------|--------|
| `JWT_SECRET` | set (random) |
| `CORS_ORIGIN` | `https://motahari-ticketing-system.vercel.app` |
| `COOKIE_SECURE` | `true` |

## 4. Default admins (seeded on first API request)

| Username | Password |
|----------|----------|
| ITMAN1 | ITMAN1 |
| ITMAN2 | ITMAN2 |

## Architecture on Vercel

- **frontend** service → Vite static app (`frontend/dist`)
- **api** service → Express via `server.js` at project root
- Routing in `vercel.json` rewrites `/api/*` → api, everything else → frontend

## Notes

- **Real-time chat (Socket.io)** does not run on Vercel serverless. Notifications fall back to polling every 15 seconds.
- After changing env vars, redeploy: `npm run deploy:prod`

## Local development

Docker (recommended):

```bash
docker compose up --build
```

Open http://localhost:8080
