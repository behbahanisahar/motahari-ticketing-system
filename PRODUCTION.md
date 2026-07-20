# Production on 192.168.113.239

This is your **hospital LAN production** host — not Vercel and not your laptop.

**Live URL:** http://192.168.113.239:8080

## What you need on that server

1. Docker Desktop (Windows) or Docker Engine (Linux)
2. This project folder copied onto that machine
3. Port **8080** allowed in the Windows/Linux firewall for the LAN

## Deploy (on the production machine)

Open a terminal **on 192.168.113.239**, then:

```bash
cd path\to\ticketing-system-2
docker compose -f docker-compose.yml -f docker-compose.lan.yml up --build -d
```

Or from the project root:

```bash
npm run lan:up
```

Check it is running:

```bash
docker compose -f docker-compose.yml -f docker-compose.lan.yml ps
```

Then open http://192.168.113.239:8080 from any PC on the hospital network.

## Update (redeploy new code)

Copy the updated project to the server, then run `npm run lan:up` again (or the `docker compose ... up --build -d` command above).

## Stop

```bash
npm run lan:down
```

## Notes

- Default demo logins work until LDAP is configured (see README).
- Change `JWT_SECRET` in `docker-compose.lan.yml` before real use.
- Postgres data is kept in a Docker volume (`pgdata`) across rebuilds.
- Do **not** expose this server to the public internet; keep it LAN-only.
