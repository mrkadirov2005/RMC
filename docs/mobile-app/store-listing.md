# TEMURBEK SCHOOL app: store listing and compliance draft (MOB-171)

Draft answers for the App Store Connect and Google Play Console forms. Items marked **Decide** need the
owner; everything else matches what the app does today (branch `mobile-app-r1`).

## Listing

| Field | Value |
| --- | --- |
| App name | TEMURBEK SCHOOL |
| Bundle ID / package | `uz.temurbekschool.app` |
| Category | Education |
| Price | Free, no in-app purchases, no ads |
| Languages | Uzbek (default), English |
| Support URL / e-mail | **Decide** (the center's site or Telegram channel, and an e-mail) |
| Privacy policy URL | **Decide**: publish the text below on the center's site |

**Subtitle / short description (uz):** O'quvchi va ota-onalar uchun TEMURBEK SCHOOL ilovasi
**Subtitle / short description (en):** Lessons, homework and progress for students and parents

**Description (uz)**

> TEMURBEK SCHOOL o'quvchilari va ota-onalari uchun rasmiy ilova.
> • Dars jadvali, davomat, baholar va coinlar bir joyda
> • Uy vazifalari: test, matn, ovozli javob va rasm yuborish
> • So'z kartochkalari: so'zlarni kerakli kunda takrorlash
> • Ota-onalar uchun: farzandlar natijalari, to'lovlar va xabarnomalar
> • Raqamli o'quvchi ID (QR)
> Hisob markaz tomonidan beriladi: login va parolni administratordan oling.

**Description (en)**

> The official app for TEMURBEK SCHOOL students and parents.
> • Timetable, attendance, grades and coins in one place
> • Homework: quizzes, written, spoken and photo answers
> • Vocabulary flashcards with spaced repetition
> • For parents: each child's results, payments and notifications
> • Digital student ID (QR)
> Accounts are issued by the center: ask the administrator for your login.

**Review notes (both stores):** sign-in only, no sign-up. Provide a demo student and a demo parent account
on production (**Decide**: create `review_student` / `review_parent` with sample data).

**Screenshots:** 6.7" and 6.5" iPhone, 5.5" iPhone, Android phone. Take them from a preview build with the
review accounts: student home with charts, homework with a voice answer, flashcards, profile with ID QR,
parent home, notifications.

## Data the app handles

| Data | Why | Linked to the user | Shared with third parties |
| --- | --- | --- | --- |
| Name, login, phone (from the center's records) | Show the account; SMS code for password reset | Yes | No (SMS goes through the center's own phone gateway) |
| Student's attendance, grades, coins, payments | App function | Yes | No |
| Homework answers: text, voice recordings, photos, PDFs | App function (teacher grading) | Yes | Stored in the center's private storage (AWS S3 if configured) |
| Device push token, device name, app version | Notifications, signed-in device list | Yes | Expo push service delivers notifications |
| Crash reports (only if Sentry is enabled) | Fix crashes | No: names, phones, logins and tokens are removed before sending | Sentry (processor) |
| Telegram account link (bot) | Verify the channel step in onboarding | Yes | Telegram API (membership check) |

Not collected: location, contacts, advertising ID, browsing history, purchases. No tracking, no ads.

### Apple privacy labels

* Data used to track you: **None**.
* Data linked to you: Contact info (name, phone number), User content (audio, photos, other user content),
  Identifiers (user ID), Usage data: none, Diagnostics: none linked.
* Data not linked to you: Diagnostics (crash data), only when Sentry is enabled.

### Google Play data safety

* Data collected: Personal info (name, phone number, user IDs), Audio (voice or sound recordings),
  Photos and files, App info and performance (crash logs, if Sentry is enabled), Device or other IDs (push token).
* Shared: No (service providers acting for the center are not "sharing" under Play's definition).
* Encrypted in transit: Yes (HTTPS only).
* Users can request deletion: Yes, in the app (Settings → Delete account) and by contacting the center.
  Play also needs a **web link** for deletion requests: **Decide** (a page with the center's contact and the
  same request text).

## Children

Students can be under 13. **Decide** one of:

1. **Google Play target audience includes under-13** → the app falls under the Families policy: every SDK must
   be Families-compliant. Sentry is not on the Families self-certified list; build the Play version without
   `EXPO_PUBLIC_SENTRY_DSN` (crash reporting off) or confirm Sentry's status first. Content rating: Everyone.
2. **Target audience 13+** with parents' accounts for younger children → simpler, but then under-13 students
   should not get their own logins.

Apple: rating 4+, not in the Kids category (the Kids category forbids third-party analytics and needs a
parental gate on external links; the app opens Telegram, Instagram and official links).

Video consent for minors is collected in onboarding and given by a parent (stored with history).

## Account deletion

In-app: Settings → *Hisobni o'chirish* sends a request to the center's admins (Mobile app → Requests in the
web panel). The center deletes the student or parent in RMC; payment records required by law are kept.

## Builds (MOB-172)

`mobile/eas.json` has three profiles:

* `development`: dev client, internal.
* `preview`: internal APK / ad hoc, `EXPO_PUBLIC_APP_ENV=staging`, Sentry test button visible.
* `production`: store builds, auto-incremented build numbers, submits Android to the internal track.

Steps (need the owner's Apple Developer and Google Play accounts):

```bash
cd mobile
npx eas-cli login
npx eas-cli init                      # creates the EAS project id (also needed for push)
npx eas-cli build --profile preview --platform all
npx eas-cli build --profile production --platform all
npx eas-cli submit --profile production --platform android   # Play internal testing
npx eas-cli submit --profile production --platform ios       # TestFlight
```

For crash reports with source maps, add in EAS secrets: `EXPO_PUBLIC_SENTRY_DSN`, `SENTRY_ORG`,
`SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN`. Then open Settings → *Sentry test* on a preview build: the error should
appear in Sentry with readable stack frames.
