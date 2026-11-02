# Server runbook: mobile app release (MOB-010, 011, 055, 172, 173)

Everything here runs on the EC2 host (`ssh ec2-user@3.211.136.121`, repo in `~/RMC`) after the
`mobile-app-r1` branch is merged to `main`. Never run `docker-compose down -v`: rebuild single
services only.

## 1. Secrets into `~/RMC/.env` (MOB-010), before pulling

`docker-compose.yml` no longer contains the database password or `JWT_SECRET`; compose refuses to
start without them. **Add them to `.env` before `git pull`**, with the values production uses today
(the database volume was created with that password; a new JWT secret would sign everyone out):

```bash
cd ~/RMC
cp .env .env.bak-$(date +%F)
# Current values, read from the running containers:
docker inspect crm_backend --format '{{range .Config.Env}}{{println .}}{{end}}' | grep -E '^(DB_PASSWORD|JWT_SECRET)='
# Append them to .env (same lines), then check:
grep -c -E '^(DB_PASSWORD|JWT_SECRET)=.' .env    # must print 2
chmod 600 .env
```

`.env.example` in the repo lists every key. Rotating the secrets later is a separate step: a new
`JWT_SECRET` signs out every web and app user; a new database password needs
`ALTER USER crm_user PASSWORD '…'` first, then the `.env` change.

## 2. Google Drive for homework files (MOB-055)

On your own computer (not the server):

1. Google Cloud Console with the center's Google account: create a project, enable **Google Drive
   API**, configure the OAuth consent screen (External, then **Publish app**: in "Testing" the token
   expires after 7 days), create an OAuth client of type **Desktop app**.
2. `GDRIVE_CLIENT_ID=… GDRIVE_CLIENT_SECRET=… node service/scripts/gdrive-auth.js`
   signs in, creates the folder "TEMURBEK SCHOOL uploads" and prints four `GDRIVE_*` lines.
3. Put the four lines into `~/RMC/.env` on the server.

Files are opened to "anyone with the link" so the app and the web panel can play them; links are
long random ids and are only shown to the student, their parents and staff. Without the `GDRIVE_*`
values, files stay on the server in the `media_uploads` volume and move to Drive once it is set up.

## 3. Deploy

```bash
cd ~/RMC
git stash && git pull --ff-only && git stash pop     # keeps the server's service/.env.example edit
docker-compose config -q && echo config ok           # fails here if .env is incomplete: fix .env, nothing was changed
docker-compose up -d --build --no-deps backend       # runs the new migrations on start
docker logs --tail 50 crm_backend                    # look for "[media]" and migration lines
curl -s localhost:4000/api/mobile/v1/app-config
```

nginx: homework uploads go through `/api/media-local/`, up to 25 MB. In the API server block:
`client_max_body_size 25m;` then `sudo nginx -t && sudo systemctl reload nginx`.

CORS (MOB-011) now allows only `https://temurbek.e-tizim.uz`. If the panel is ever opened from
another address, add it to `CORS_ALLOWED_ORIGINS` in `.env` (comma separated) and rebuild the backend.

## 4. Publish the app (MOB-172)

1. Build on the Mac: `cd mobile && ./scripts/build-apk.sh` (bump `version` in `app.json` for each
   new release). Back up `mobile/credentials/` (the signing key): without it, users cannot update
   over the old app.
2. Upload `mobile/dist/temurbek-school-<version>.apk` to Google Drive, share it with **Anyone with
   the link**.
3. Web panel → Mobile app → **App versions**: version, the Drive link, what's new. Set "Oldest
   version that still works" only when old versions must stop (they then see a blocking update screen).
4. Share with parents: `https://temurbek.e-tizim.uz/#/app` (download page with install steps) or the
   direct link `https://api-temurbek.e-tizim.uz/api/mobile/v1/download`.

## 5. Monitoring and backups (MOB-173)

**Alerts to the owner's Telegram.** Create a bot with @BotFather (or reuse the backup bot), send it a
message from the owner's account, read the chat id from
`https://api.telegram.org/bot<token>/getUpdates`. Then:

* `.env` on the server: `ALERT_TELEGRAM_BOT_TOKEN=…`, `ALERT_TELEGRAM_CHAT_ID=…`
* `crontab -e`: `*/15 * * * * bash ~/RMC/scripts/server-health.sh >> ~/rmc-health.log 2>&1`
  (backend health, containers, disk over 85%, memory, last backup older than 26 hours).
  Test: `bash scripts/server-health.sh`.
* GitHub → repository → Settings → Secrets → Actions: the same two values. The **Uptime** workflow
  checks the API and the panel from outside every 10 minutes, so an alert arrives even when the
  whole server is down. Run it once by hand from the Actions tab.

**Restore drill.** `bash scripts/restore-drill.sh` restores last night's dump into a throwaway
container and prints row counts next to production. Do it now, then once a month. Record the date
and the restore time here.

| Date | Backup | Restore time | Result |
| --- | --- | --- | --- |
| | | | |

**Sizing.** The host is a `t3a.small` (2 GB RAM + 2 GB swap) with Postgres, Mongo, the backend,
the bot, backups and Drizzle Studio. The app adds a push worker and file uploads (each upload is held
in memory up to 25 MB while it is written). Check after a week of the pilot:

```bash
free -m; docker stats --no-stream; grep -c "Out of memory" /var/log/messages 2>/dev/null
```

If available memory stays under ~300 MB or swap is used a lot, move to `t3a.medium` (4 GB): stop,
change instance type, start. The Elastic IP keeps the address; Docker starts on boot.
Stopping Drizzle Studio (`docker-compose stop drizzle-studio`) frees memory in the meantime.
