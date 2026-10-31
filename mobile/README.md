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
