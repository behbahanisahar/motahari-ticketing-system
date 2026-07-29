# Production on 192.168.113.239

This is your **hospital LAN production** host — not Vercel and not your laptop.

**Live URL:** http://192.168.113.239:8080

## Critical: Windows date/time zone

Chat times use the server’s **timezone**, not only the numbers on the clock.

1. Settings → Time & language → Date & time  
2. Set time zone to **(UTC+03:30) Tehran** (not US Pacific, UTC, etc.)  
3. Turn on automatic time, then **Sync now**  
4. **Restart the Node backend** (timezone is read when Node starts)

Check: http://192.168.113.239:8080/api/health  

- `tehranNow` must match the real clock in Iran  
- `nodeTimezoneOffsetMinutes` must be **`-210`**  
- If `hint` says timezone is not Tehran, fix the OS zone before anything else  

Only changing the clock while leaving the wrong zone (e.g. Pacific) makes the app show times like **21:42** when it is **11:12**.

## Without Docker (typical hospital setup)

On the production machine:

```bash
git pull

cd frontend
npm install
npm run build

cd ../backend
npm install
# stop the old Node process, then:
set PORT=8080
npm start
```

(`PORT` may already be set in your backend `.env`.)

## With Docker (optional)

```bash
npm run lan:up
```

## Notes

- Default demo logins work until LDAP is configured (see README).
- Do **not** expose this server to the public internet; keep it LAN-only.
- Messages saved while the OS timezone was wrong keep wrong timestamps; new messages are correct after the zone fix + backend restart.
