# TEMURBEK SCHOOL mobile app: status

Branch `mobile-app-r1`. Ticket status lives in `tickets.xlsx` (Status and Notes columns); code for each
ticket is tagged `@MOB-###` on the line before it (`grep -rn "@MOB-" service ui mobile`).

## Built (Release 1 core)

| Area | What works | Tickets |
| --- | --- | --- |
| Sign-in | Student and parent login with role detection, 15 min access + 30 day single-use refresh tokens, device list, sign-out per device, reuse detection | MOB-020..023, 110, 114 |
| Student app | Home (next lesson, attendance, coins, homework to do, results, rules, announcements), Learn (homework, timetable, results, attendance), leaderboard, profile, coins, payments | MOB-031, 120..124 |
| Parent app | Child switcher, home with payment due, children, progress with per-group monthly averages, payments, homework (read only), more | MOB-025..030, 130..134 |
| Homework | Bank (level > book > unit > lesson > task), one task format (choice, gap, matching, written), approval, assign to a group (optionally after the next lesson), autosave, auto-scoring, teacher grading, coins, notifications | MOB-050..054, 056, 140..142, 144, 163, 165 |
| Notifications | Outbox and worker over Expo push, watchers for attendance, grades, coins, payments; inbox with unread count; per-category switches | MOB-040..043, 126 |
| Content | Official links, announcements (with push), rules with versions and acceptance, help requests with answers | MOB-060..063, 150..153, 160..162, 164 |
| Account | Forgot password by SMS code (10 min, 5 tries, 3 codes an hour, all devices signed out); student ID QR that changes every minute; parent asks to add a child from the app, admin approves in the existing Telegram → Parent requests panel | MOB-024, 032, 111, 124, 125 |
| Media answers | Homework questions answered by voice recording or by photos/PDFs; uploaded through signed URLs with size and type limits and retries, then moved to Google Drive with a direct download link (stays on the server until Drive is set up); teachers listen and open files when grading | MOB-055, 143 |
| Flashcards | Practice → So'z kartochkalari: consolidation words of the student's groups with spaced repetition (Again/Hard/Good/Easy), 10 new words a day, pronunciation read by the phone | MOB-145 |
| Distribution | No store for now: the signed APK (`mobile/scripts/build-apk.sh`) goes on Google Drive, admins publish it under Mobile app → App versions, parents install from `/#/app`; the app blocks versions below the minimum and reminds about newer ones | MOB-172, 175 |
| Release groundwork | Sentry crash reporting with personal data removed (off: no Sentry account), in-app account deletion request, EAS build profiles, Maestro smoke flows, store-listing draft for later | MOB-107, 170, 171 |
| Server | Secrets out of `docker-compose.yml`, CORS limited to the web panel, last audit bugs fixed; health check with Telegram alerts, GitHub uptime check, backup restore drill (`docs/mobile-app/server-runbook.md`) | MOB-010..012, 173 |
| Onboarding | Optional first-run steps: Telegram channel (checked by the bot), Instagram (opened only), video consent (a parent answers for a minor; history kept), notification permission; reopen from Settings | MOB-112, 113 |
| Charts | Home charts of attendance, scores and coins, by month or by day | MOB-127, 128 |
| Web panel | `/owner/mobile-app` (owner, with a Usage tab of adoption numbers), `/homework` (admins with Tests permission, teachers), `/student-id` (admins and teachers check a scanned ID) | MOB-160..166 |

Tests: backend unit tests for every new module, plus `service/test/integration/flows/mobile-app.integration.test.js`
(14 end-to-end flows on PostgreSQL); app tests for the API client and helpers. Screens were checked in Chrome
against a seeded database.

## Needs you

Step by step in `docs/mobile-app/server-runbook.md`:

1. **Before deploying**: add `DB_PASSWORD` and `JWT_SECRET` (today's values) to `~/RMC/.env`; compose refuses
   to start without them.
2. **Google Drive**: run `service/scripts/gdrive-auth.js` once with the center's Google account and put the four
   `GDRIVE_*` values into `.env`.
3. **Deploy**: ten new migrations (`service/db/migrations/20261031*`) run on backend start. Rebuild only the
   backend service. nginx must allow 25 MB bodies.
4. **Publish the APK**: build, upload to Drive, publish under Mobile app → App versions. Keep `mobile/credentials/`
   (the signing key) backed up.
5. **Alerts**: a Telegram bot token and the owner's chat id in `.env` and in GitHub secrets, the cron line for
   `scripts/server-health.sh`, and one run of `scripts/restore-drill.sh`.
6. **Push on phones** needs an Expo project id (`npx eas-cli init`, a free Expo account). Until then, push
   notifications do not reach phones; the in-app inbox still works.
7. **Optional env**: `HOMEWORK_MAX_COINS` (default 5), `MOBILE_PUSH_WORKER=off`, `MOBILE_MIN_APP_VERSION` (emergency
   minimum), `MOBILE_ID_SECRET`, SMS gateway and Telegram bot settings as before (`TELEGRAM_BOT_TOKEN`,
   `TELEGRAM_REQUIRED_CHANNEL`, `TELEGRAM_BOT_USERNAME`).

## Not built yet (next)

- Store release: not planned for now (owner's decision). Maestro flows, `eas.json` and the store-listing draft
  stay ready for later. Pilot with one group (MOB-174) after the APK is published.
- Release 2 and 3 modules (video, exams, speaking, surveys, chat, AI, premium).

## Try it locally

```bash
# backend (needs Postgres; migrations run on start)
cd service && npm run dev
# app in the browser or Expo Go (use your computer's LAN IP on a phone)
cd mobile && npm install && EXPO_PUBLIC_API_URL=http://localhost:4000 npx expo start
```

Sign in with an existing student or parent username and password from RMC.
