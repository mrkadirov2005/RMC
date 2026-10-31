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
| Web panel | `/owner/mobile-app` (owner) and `/homework` (admins with Tests permission, teachers) | MOB-160..165 |

Tests: backend unit tests for every new module, plus `service/test/integration/flows/mobile-app.integration.test.js`
(9 end-to-end flows on PostgreSQL); app tests for the API client and helpers. Screens were checked in Chrome
against a seeded database.

## Needs you

1. **Approve or decline** MOB-010, MOB-011, MOB-012 (they change existing code: secrets in compose, CORS, audit fixes).
2. **Push on phones** needs an Expo/EAS project: `npx eas-cli init` in `mobile/`, which adds `extra.eas.projectId`;
   then a development build (`npx eas-cli build --profile development`). Expo Go cannot receive remote push.
3. **Deploy**: four new migrations (`service/db/migrations/20261031*`) run on backend start. Rebuild only the
   backend service.
4. **Optional env**: `HOMEWORK_MAX_COINS` (default 5), `MOBILE_PUSH_WORKER=off`, `MOBILE_MIN_APP_VERSION`.

## Not built yet (next)

- Audio/photo answers and attachments (MOB-055, 143), forgot password by SMS (MOB-024, 111), in-app child
  link request (MOB-032), onboarding with Telegram check (MOB-112, 113), rotating QR (MOB-125),
  flashcards (MOB-145), adoption dashboard (MOB-166), store release (MOB-170..175).
- Release 2 and 3 modules (video, exams, speaking, surveys, chat, AI, premium).

## Try it locally

```bash
# backend (needs Postgres; migrations run on start)
cd service && npm run dev
# app in the browser or Expo Go (use your computer's LAN IP on a phone)
cd mobile && npm install && EXPO_PUBLIC_API_URL=http://localhost:4000 npx expo start
```

Sign in with an existing student or parent username and password from RMC.
