# TEMURBEK SCHOOL mobile app

Student and parent app (React Native + Expo SDK 58, Expo Router). Talks to the RMC backend at
`/api/mobile/v1` (see `service/src/modules/mobile`). Plans and tickets: `docs/mobile-app/`.

## Run

```bash
npm install
EXPO_PUBLIC_API_URL=http://<backend-host>:4000 npx expo start
```

- Phone: install **Expo Go**, scan the QR code. The phone must reach the backend URL, so use the
  computer's LAN IP (not `localhost`).
- Browser preview: press `w`, or `npx expo start --web`.

## Check

```bash
npm run typecheck
npm test
```

## Layout

- `src/app/` routes: `login`, `student/*` tabs, `parent/*` tabs, shared detail screens
  (`attendance`, `coins`, `results`, `schedule`, `payments`, `settings`; parents pass `?child=<id>`).
- `src/api/` client with token refresh, typed queries.
- `src/screens/` sections shared by student and parent screens.
- Code for each ticket is tagged `// @MOB-###` on the line before it: `grep -rn "@MOB-" src`.

## Smoke tests (Maestro)

`.maestro/` has flows for sign-in, student home, parent home and homework submit. They need a development
or preview build on a simulator or phone and test accounts on the backend it points to:

```bash
maestro test .maestro -e STUDENT_USER=... -e STUDENT_PASS=... -e PARENT_USER=... -e PARENT_PASS=...
```

## Builds and release

Profiles are in `eas.json` (development, preview, production). Store forms, privacy answers and the build
steps are in `docs/mobile-app/store-listing.md`. Crash reporting (Sentry) is on only when
`EXPO_PUBLIC_SENTRY_DSN` is set; see `src/lib/crash.ts`.
