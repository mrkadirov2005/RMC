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
| Media answers | Homework questions answered by voice recording or by photos/PDFs; private storage behind short-lived signed URLs, size and type limits, retries after network loss; teachers listen and open files when grading | MOB-055, 143 |
| Flashcards | Practice → So'z kartochkalari: consolidation words of the student's groups with spaced repetition (Again/Hard/Good/Easy), 10 new words a day, pronunciation read by the phone | MOB-145 |
| Onboarding | Optional first-run steps: Telegram channel (checked by the bot), Instagram (opened only), video consent (a parent answers for a minor; history kept), notification permission; reopen from Settings | MOB-112, 113 |
| Charts | Home charts of attendance, scores and coins, by month or by day | MOB-127, 128 |
| Web panel | `/owner/mobile-app` (owner, with a Usage tab of adoption numbers), `/homework` (admins with Tests permission, teachers), `/student-id` (admins and teachers check a scanned ID) | MOB-160..166 |

Tests: backend unit tests for every new module, plus `service/test/integration/flows/mobile-app.integration.test.js`
(13 end-to-end flows on PostgreSQL); app tests for the API client and helpers. Screens were checked in Chrome
against a seeded database.

## Needs you

1. **Approve or decline** MOB-010, MOB-011, MOB-012 (they change existing code: secrets in compose, CORS, audit fixes).
2. **Push on phones** needs an Expo/EAS project: `npx eas-cli init` in `mobile/`, which adds `extra.eas.projectId`;
   then a development build (`npx eas-cli build --profile development`). Expo Go cannot receive remote push.
3. **Deploy**: eight new migrations (`service/db/migrations/20261031*`) run on backend start. Rebuild only the
   backend service.
4. **Optional env**: `HOMEWORK_MAX_COINS` (default 5), `MOBILE_PUSH_WORKER=off`, `MOBILE_MIN_APP_VERSION`,
   `MOBILE_ID_SECRET` (signs the ID QR; falls back to `JWT_SECRET`).
5. **SMS**: reset codes go through the existing SMS gateway (`SMS_GATEWAY_USERNAME`/`PASSWORD`). Without it, production
   answers "SMS unavailable" and development prints the code in the server log. The account's phone is the student's
   own phone, else the saved parent phone; a parent's own phone.
6. **Telegram check** uses the bot's settings: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_REQUIRED_CHANNEL`, `TELEGRAM_BOT_USERNAME` on the
   backend too. The bot must be an admin of the channel. `MOBILE_INSTAGRAM_URL` (or an Instagram official link) sets the Instagram step.
7. **File storage**: set `MEDIA_S3_BUCKET` and `MEDIA_S3_REGION` (and AWS credentials, e.g. an instance role with
   s3:PutObject/GetObject/DeleteObject on that bucket; the bucket stays private, with CORS allowing PUT from the app).
   Without a bucket, files are kept in `service/uploads/media` (`MEDIA_LOCAL_DIR`) and served by the backend; behind
   nginx set `MEDIA_PUBLIC_BASE_URL` to the public API origin and allow 25 MB bodies on `/api/media-local/`.

## Not built yet (next)

- flashcards (MOB-145), crash reporting (MOB-107), store release (MOB-170..175).
- Release 2 and 3 modules (video, exams, speaking, surveys, chat, AI, premium).

## Try it locally

```bash
# backend (needs Postgres; migrations run on start)
cd service && npm run dev
# app in the browser or Expo Go (use your computer's LAN IP on a phone)
cd mobile && npm install && EXPO_PUBLIC_API_URL=http://localhost:4000 npx expo start
```

Sign in with an existing student or parent username and password from RMC.
