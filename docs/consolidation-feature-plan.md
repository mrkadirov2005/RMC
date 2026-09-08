# Vocabulary Consolidation Exercises — Feature Plan

**Status:** Planning only. No code has been written. This document is the spec to implement against.

**One-line summary:** A teacher attaches a set of up to 10 vocabulary words (each with up to 5 accepted translations) to a specific class session, then shares a single link to the class group chat. Students open the link with no login, pick their name, and take the exercise in a locked-down, full-page mode — see the word, type a translation — can retry as many times as they want, and the teacher sees per-student submission and trial counts on that session.

---

## 1. Research findings (what already exists and what doesn't)

- **`modules/tests`** is this codebase's existing exam engine (`tests`, `test_assignments`, `test_questions`, `test_submissions`, `test_answers`, `test_results_summary` tables). It already has a `matching` question type, but it's `manualGraded: true` — a teacher has to grade it by hand, not auto-graded against multiple accepted answers. It also carries a lot of exam-engine concepts that don't apply here: reading passages, rubrics, negative marks, essay word limits, multi-question ordering. Reusing it would mean bending an exam-grading model into a vocabulary-drill model. **Recommendation: build a small dedicated module (`consolidations`) instead of extending `tests`.** It shares the same DB and code conventions but isn't shoehorned into the exam engine's shape.
- **No anti-cheat/lockdown mechanism exists anywhere in the UI today** — no `visibilitychange`, `fullscreenchange`, `blur`, or `beforeunload` handlers anywhere in `ui/src`. This is new, not an extension of something existing.
- **`SessionWorkflowPage.tsx`** (`ui/src/features/crm/classes/SessionWorkflowPage.tsx`) is where a teacher already runs a class session today — it has tabs for Attendance / Homework / Activity / Points, each reading/writing data scoped to one `session_id`. This is the natural home for a new tab, confirmed as the placement choice for this feature.
- **`sessions` table** (`class_id`, `teacher_id`, `session_date`, `status`, soft-deleted via `deleted_at`) is the existing "one class meeting" concept this feature attaches to — confirmed as the assignment target ("assigns to that session").
- **Existing conventions to follow**, all already established across the audit's 43 implemented tickets: soft delete via `deletedAt`, `center_id` on every table for tenant scoping, `shared/tenant.ts`'s `getScopedCenterId` for resolving the caller's center (never trust a client-supplied `center_id` for non-global users), `class-validator` DTOs wired through `validateBody`/`validateParams`, `db.transaction(...)` for any multi-row write, CommonJS `module.exports` + `export {};` file shape, and — critically — **the silent-strip DTO risk**: `middleware/validation.ts` runs with `whitelist: true`, so any DTO written for this feature must be checked against the actual UI payload before merging, not derived from the schema alone.

## 2. Confirmed design decisions

These were open questions; answers below drive the rest of this document.

1. **Exercise direction:** student sees the main word, types a translation. Correct if it case-insensitively (trimmed) matches any one of that word's up-to-5 accepted translations.
2. **Trial semantics:** one trial = one full pass through all words in the set (up to 10). Submitting ends the trial and records pass/fail + score. A student can always start a new trial afterward, whether the previous one passed or not — there is no hard retry cap.
3. **Lockdown:** browser-based approximation only — forced fullscreen, `visibilitychange`/`blur`/tab-switch detection, violation logging, auto-submit after a violation threshold. **This is explicitly not real Safe Exam Browser** and cannot fully prevent leaving the screen (a second device, OS-level screenshot, or a sufficiently determined student can still defeat it). State this limitation to stakeholders before shipping; if real SEB integration is wanted later, that's a separate, much larger project (distributing `.seb` config files, verifying the SEB browser-exam-key server-side).
4. **UI placement:** a new "Consolidation" tab inside the existing `SessionWorkflowPage`, alongside Attendance/Homework/Activity/Points.
5. **Shareable link, no login required:** the exercise must be reachable by a single URL a teacher pastes into a class group chat — no student login. When a student opens it, they identify themselves by picking their name from that session's class roster; there is no password or verification step. **This is a deliberate, confirmed tradeoff**, not an oversight: it means anyone holding the link can submit a trial under any enrolled student's name, so the teacher's submission report cannot be treated as cryptographically trustworthy — only as a soft signal, the same way a paper worksheet with a name written at the top is a soft signal. §4a and §6a cover the mitigations that were still worth building in at no cost to friction (unguessable link token, IP/device capture, a same-name-already-submitted nudge) and the ones that were explicitly not built because they'd add a verification step (a password, a phone-number check).

## 3. Data model

Four new tables, following this codebase's existing naming/typing conventions (serial PK, `center_id` on every table, `snake_case` DB columns mapped to `camelCase` Drizzle fields, soft delete where the row represents a durable record a teacher might want to undo).

### `consolidation_sets`
The "consolidation record" itself — a set of words assigned to one session.

| Column | Type | Notes |
|---|---|---|
| `consolidation_set_id` | serial PK | |
| `center_id` | integer | tenant scope |
| `class_id` | integer | denormalized from the session for query convenience, same pattern `sessions.classId` already uses |
| `session_id` | integer, not null | the session this set is assigned to — one set per session (see §8 for the "reassign" edge case) |
| `teacher_id` | integer, not null | who created it |
| `title` | varchar(255), nullable | optional label, e.g. "Unit 5 Vocabulary" |
| `violation_limit` | integer, default 3 | how many lockdown violations before auto-submit (teacher-configurable at creation, see §6) |
| `share_token` | varchar(64), not null, unique | random URL-safe token (e.g. `crypto.randomBytes(24).toString('base64url')`) — the public link is `https://.../#/consolidate/:share_token`. **Never the sequential `consolidation_set_id`** — a guessable id would let anyone enumerate other sessions' exercises, the same class of mistake the audit's Critical Finding #2 (rooms IDOR) closed. Generated at creation; see §4a for rotation. |
| `deleted_at` | timestamp, nullable | soft delete |
| `created_at`, `updated_at` | timestamp | |

Indexes: `idx_consolidation_sets_session` on `session_id`, `idx_consolidation_sets_class` on `class_id`, `idx_consolidation_sets_center` on `center_id`, `idx_consolidation_sets_deleted_at` on `deleted_at`, `uniqueIndex idx_consolidation_sets_share_token` on `share_token`.

### `consolidation_words`
Each word in a set, up to 10 per set.

| Column | Type | Notes |
|---|---|---|
| `consolidation_word_id` | serial PK | |
| `consolidation_set_id` | integer, not null | FK |
| `word_order` | integer, not null | 1-10, display order |
| `main_word` | varchar(255), not null | |
| `translations` | jsonb, not null | array of up to 5 strings, all treated as correct — e.g. `["salom", "assalom", "assalomu aleykum", "salomat"]`. JSONB array matches the existing `test_questions.correctAnswer`/`.options` convention for this exact kind of "small list of acceptable values" data — no separate translations table needed. |

Indexes: `idx_consolidation_words_set` on `consolidation_set_id`.

No soft delete on this table — words are immutable once any trial has answered against them (see §8); editing a set with existing trials is out of scope for v1.

### `consolidation_trials`
One row per full attempt by one student.

| Column | Type | Notes |
|---|---|---|
| `trial_id` | serial PK | |
| `consolidation_set_id` | integer, not null | FK |
| `student_id` | integer, not null | FK |
| `center_id` | integer | tenant scope, denormalized for query convenience |
| `trial_number` | integer, not null | 1, 2, 3... — this student's Nth attempt at this set |
| `status` | varchar(20), not null | `'in_progress'` \| `'completed'` \| `'auto_submitted'` (hit the violation limit) |
| `started_at` | timestamp, not null | |
| `submitted_at` | timestamp, nullable | null while in progress |
| `correct_count` | integer, nullable | filled on submit |
| `total_words` | integer, nullable | snapshot of word count at submit time (defends against a set being edited between trials, though v1 doesn't allow editing a set with trials — cheap insurance) |
| `is_passed` | boolean, nullable | `correct_count === total_words` |
| `violation_count` | integer, default 0 | incremented live as violations are reported (see §6), independent of submission |
| `time_taken_seconds` | integer, nullable | |
| `via_share_link` | boolean, default false | true if this trial was started through the public link (§4a) rather than an authenticated portal session — lets the teacher's dashboard visually flag trials with no identity assurance |
| `ip_address` | varchar(50), nullable | captured from the request, same convention as `test_submissions.ipAddress` — a forensic aid, not an access control |
| `user_agent` | text, nullable | captured from the request header — same purpose as `ip_address`, helps a teacher notice e.g. five "different students" all submitting from what looks like the same device/browser in the same minute |

Indexes: `idx_consolidation_trials_set` on `consolidation_set_id`, `idx_consolidation_trials_student` on `student_id`, `uniqueIndex idx_consolidation_trials_set_student_number` on `(consolidation_set_id, student_id, trial_number)` (prevents a race from creating two trials with the same number), `idx_consolidation_trials_status` on `status`.

### `consolidation_answers`
One row per word, per trial.

| Column | Type | Notes |
|---|---|---|
| `answer_id` | serial PK | |
| `trial_id` | integer, not null | FK |
| `consolidation_word_id` | integer, not null | FK |
| `student_answer` | text, nullable | what they typed; null if they left it blank and the trial auto-submitted |
| `is_correct` | boolean, not null | computed server-side at submit time — **never trust a client-supplied correctness flag** |

Indexes: `idx_consolidation_answers_trial` on `trial_id`, `uniqueIndex idx_consolidation_answers_trial_word` on `(trial_id, consolidation_word_id)`.

This shape deliberately mirrors `test_submissions`/`test_answers` (trial ~ submission, consolidation_answers ~ test_answers) so anyone who already knows the tests module recognizes the pattern immediately.

## 4. Backend API

New module: `service/src/modules/consolidations/` with the standard `controllers/`, `services/`, `repositories/` split this codebase uses everywhere else. New route file `service/src/routes/consolidationRoutes.ts`, mounted in `index.ts` as:

```
app.use('/api/consolidations', requireAuth, requireRole('superuser', 'teacher', 'student'), consolidationRoutes);
```

with per-route role/ownership checks layered on top, matching the `classRoutes` mixed-role pattern.

| Method | Route | Caller | Purpose |
|---|---|---|---|
| POST | `/api/consolidations` | teacher/superuser | Create a set + its words for a session, in one `db.transaction`. Body: `session_id`, `title?`, `violation_limit?`, `words: [{ main_word, translations: string[] }]` (1-10 items, each `translations` 1-5 items). Rejects if the caller (teacher) doesn't own the session's class, or if a non-deleted set already exists for that session (see §8). |
| GET | `/api/consolidations/session/:sessionId` | teacher/superuser | Fetch the set for a session **with** translations — for the teacher's own review/edit view. |
| GET | `/api/consolidations/session/:sessionId/student-view` | student | Fetch the set for a session **without** translations — just `main_word` + `word_order`, for taking the exercise. 403 if the student isn't enrolled in that session's class. |
| GET | `/api/consolidations/session/:sessionId/results` | teacher/superuser | The results dashboard: for every student enrolled in the session's class, whether they've submitted at least one trial, their trial count, and their best (`is_passed`) and latest trial summaries. This is the "click a session, see who submitted" view. |
| GET | `/api/consolidations/trials/:trialId` | teacher/superuser, or the student who owns it | Full detail of one trial: every word, the student's answer, correctness, violation count — the drill-down from the results dashboard. |
| POST | `/api/consolidations/:setId/trials` | student | Start a new trial. Creates a `consolidation_trials` row with the next `trial_number` for (set, student), `status: 'in_progress'`, `started_at: now()`. Returns the trial id and the word list (without translations). |
| POST | `/api/consolidations/trials/:trialId/violation` | student | Log one lockdown violation (tab switch / blur / fullscreen exit). Increments `violation_count`; if it reaches the set's `violation_limit`, the service auto-submits the trial server-side using whatever answers have been saved so far (see §6) and marks `status: 'auto_submitted'`. Called via `navigator.sendBeacon`-compatible endpoint (must accept a plain POST with no response body dependency, since `sendBeacon` can't read the response). |
| PATCH | `/api/consolidations/trials/:trialId/answer` | student, only their own in-progress trial | Save one answer as the student types it (autosave per word, so a violation-triggered auto-submit doesn't lose already-entered answers). Body: `consolidation_word_id`, `answer`. Upserts into `consolidation_answers` with `is_correct: null` until final grading at submit. |
| POST | `/api/consolidations/trials/:trialId/submit` | student, only their own in-progress trial | Final submit. Grades every answer server-side against `consolidation_words.translations` (case-insensitive, trimmed match against any entry in the array), sets `correct_count`, `total_words`, `is_passed`, `status: 'completed'`, `submitted_at`, `time_taken_seconds`. |
| DELETE | `/api/consolidations/:setId` | teacher/superuser who owns it | Soft-delete a set (only if it has zero trials — see §8). |

**DTOs needed** (written against the actual UI payload once the UI exists, per the silent-strip rule — do not write these from this table alone): `CreateConsolidationSetDto` (nested word array, each word validated: `main_word` non-empty string, `translations` array of 1-5 non-empty strings, `@ArrayMinSize(1) @ArrayMaxSize(10)` on the outer words array), `SaveAnswerDto`, `SubmitTrialDto` (if any client-supplied metadata like `time_taken_seconds` is trusted — prefer computing it server-side from `started_at` to `now()` instead, since a client-supplied duration is trivially spoofable and this codebase already has a documented "TOCTOU-ish" pattern finding elsewhere it should not repeat).

**Server-side grading, never client-side:** the student-facing word list never includes `translations`; correctness is computed only in the `/submit` handler by re-fetching `consolidation_words` and comparing. This matches the existing `test_answers` pattern (`isCorrect` computed server-side) and prevents a student from reading the network tab to find answers.

## 4a. Public shareable-link API

A second, separate route file, `service/src/routes/consolidatePublicRoutes.ts`, mounted **without** `requireAuth` — this is intentionally public, gated by knowledge of the unguessable `share_token` instead of a JWT, the same shape as the existing `owner.controller.ts` registration endpoint (public route, gated by a secret value instead of a session). Mount as:

```
app.use('/api/consolidate', consolidatePublicRateLimiter, consolidatePublicRoutes);
```

`consolidatePublicRateLimiter` — a dedicated `express-rate-limit` instance, following the exact precedent already established for the other public/login endpoints in `service/src/index.ts` (see the audit's RMC-009). This is now a genuinely public, unauthenticated surface, so it needs the same throttling as the login routes, not an exemption.

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/consolidate/:shareToken` | Validates the token. Returns the session/class label, the word list **without translations**, and the roster of that session's enrolled students as `{ student_id, first_name, last_name }` — nothing else about them. Returns a generic 404 for both "token doesn't exist" and "set was deleted" (don't distinguish, so a guesser can't tell a dead link from a never-existing one). |
| POST | `/api/consolidate/:shareToken/trials` | Body: `{ student_id }`, which **must** be one of the ids returned by the GET above for this exact token — reject (400) any id not in that session's roster. This is why the roster is server-resolved, not free text: the client can only ever pick a real enrolled student, never type an arbitrary name. Creates the trial with `via_share_link: true` and `ip_address`/`user_agent` captured from the request. If this `student_id` already has a `completed` trial for this set today, the response includes that trial's summary so the UI can show the "already submitted, continue anyway?" nudge from §6a before creating a new one. |
| PATCH | `/api/consolidate/:shareToken/trials/:trialId/answer` | Same autosave behavior as the authenticated route. Must verify `trialId`'s `consolidation_set_id` matches the set that `shareToken` resolves to — otherwise a link holder who happens to guess/enumerate a `trialId` from a *different* set could poke at it. Trial ids are sequential integers, so this check is load-bearing, not optional. |
| POST | `/api/consolidate/:shareToken/trials/:trialId/violation` | Same as authenticated, same token-to-trial scoping check. |
| POST | `/api/consolidate/:shareToken/trials/:trialId/submit` | Same as authenticated, same token-to-trial scoping check. |

**Authenticated-side additions to support this** (added to the `/api/consolidations` table above): `POST /api/consolidations/:setId/regenerate-link` (teacher/superuser who owns the set) — issues a new `share_token`, immediately invalidating the old one, for when a link leaks somewhere it shouldn't have. The set-creation response and the results-dashboard view should both surface the current shareable URL with a "Copy link" action, and the regenerate action with a confirmation ("students using the old link will no longer be able to access it").

**What is and isn't protected here, stated plainly:**
- *Is* protected: the token is unguessable, so only someone who actually received the link (or a link to a trial within it) can reach anything. Rate limiting prevents brute-forcing the token space. Trial-to-token scoping prevents cross-set access even by a legitimate link-holder.
- *Is not* protected: which enrolled student is actually behind the keyboard. Anyone with the link can submit as any name on that roster. This was an explicit, confirmed product decision (§2, item 5), not a gap to fix later — but it should not be forgotten when the results dashboard is built (§7 flags trials with `via_share_link: true` visually for exactly this reason).

## 5. Scoring and trial logic

- A word is correct if the trimmed, case-folded student answer equals the trimmed, case-folded form of **any** entry in that word's `translations` array. No partial credit, no fuzzy matching in v1 (Levenshtein/typo-tolerance is a plausible v2 enhancement, not in scope here).
- `is_passed = correct_count === total_words` — all words correct, no partial pass.
- Trial numbering: `trial_number` is `1 + (count of that student's prior trials on this set)`, computed inside the same transaction that creates the new trial, guarded by the unique index in §3 so a double-click or race can't create two trials with the same number.
- No cap on trial count. A student can retry indefinitely, including after already passing — this was an explicit confirmed decision.
- Auto-submitted trials (hit violation limit) are graded the same way as a normal submit, using whatever answers were autosaved — a partially-answered trial can still show as failed with a partial `correct_count`, which is useful signal for the teacher (partial answers + a violation flag reads very differently from a clean pass).

## 6. Lockdown / anti-leave design (browser-based approximation)

Runs entirely in a new dedicated full-page route, `ui/src/features/student/TakeConsolidationPage.tsx` (not embedded in the portal shell, similar isolation to `TakeTestPage.tsx`).

**On trial start:**
1. Request fullscreen via the Fullscreen API (`element.requestFullscreen()`). If the browser blocks it (must be a user gesture) — require an explicit "Start Exercise" button click as the triggering gesture, matching how browsers require fullscreen requests to originate from a direct user interaction.
2. Register listeners: `document.addEventListener('visibilitychange', ...)`, `window.addEventListener('blur', ...)`, `document.addEventListener('fullscreenchange', ...)` (catches Escape-key fullscreen exit), `window.addEventListener('beforeunload', ...)` (browser-native "are you sure you want to leave" prompt — this one the browser controls the wording of, we can't customize it, but it does fire).

**On any violation event** (tab hidden, window blurred, fullscreen exited):
1. Immediately POST to `/api/consolidations/trials/:trialId/violation` via `navigator.sendBeacon` (survives the page actually unloading, unlike a normal fetch which can get cancelled) — this is why that endpoint must not depend on reading a response body.
2. Show an on-screen warning overlay when the student returns ("Leaving the exercise screen is not allowed. Violation 2 of 3 — one more and your exercise will be submitted automatically.").
3. If the violation count returned by the endpoint (or tracked optimistically client-side) reaches the set's `violation_limit`, immediately call `/submit` with whatever's been autosaved and show a "Your exercise was submitted automatically because you left the screen too many times" screen — no further interaction possible.

**What this does NOT prevent** (state this explicitly to the teacher/admin audience, ideally as UI copy on the set-creation screen so expectations are set correctly): a second physical device, a screenshot, screen-recording software, or a student who simply accepts the fullscreen-exit consequence. This is a deterrent and an audit trail (the teacher sees violation counts per trial), not a hard technical guarantee. If stronger guarantees are ever required, that's the real-SEB integration path explicitly declined for this iteration.

**§6a — this applies identically to trials started via the public link.** The lockdown logic doesn't care whether the trial started from an authenticated portal session or the public roster-picker — same fullscreen/visibility/blur listeners, same violation endpoint (just called through the `/api/consolidate/:shareToken/...` path instead of `/api/consolidations/...`), same auto-submit behavior. The one addition specific to the link flow is the pre-start nudge mentioned in §4a: if the picked student already has a `completed` trial for this set today, show "It looks like [name] already completed this — continue anyway?" before calling the start-trial endpoint. This catches accidental double-attempts (a student re-clicking the group link, not realizing they already did it) — it does not and cannot catch deliberate impersonation, since anyone can just say "yes, continue anyway."

## 7. UI design

### Teacher side — new "Consolidation" tab in `SessionWorkflowPage.tsx`

Add `'consolidation'` to the existing `WorkflowTab` union and `WORKFLOW_TABS` array (`ui/src/features/crm/classes/SessionWorkflowPage.tsx:27-33`), following the exact pattern the existing four tabs already use for tab state and URL sync.

**If no set exists yet for this session:** a creation form — up to 10 rows, each with a "Main word" text input and up to 5 "Translation" text inputs (start with 1 translation field shown, an "+ Add another accepted translation" button reveals more, up to 5), plus an "+ Add word" button (up to 10 rows) and the `violation_limit` setting (default 3, teacher can adjust). Submits to `POST /api/consolidations`.

**Immediately after creation, and any time the set already exists:** show the shareable link prominently — the full `https://.../#/consolidate/:share_token` URL, a "Copy link" button, and a "Regenerate link" action (behind a confirmation, since it invalidates the old link per §4a). This is the primary way a teacher is expected to reach students, so it shouldn't be buried.

**Results dashboard:**
- A summary strip: "X of Y students submitted" (Y = class roster size for this session, X = distinct students with ≥1 trial).
- A table, one row per enrolled student: name, submitted (yes/no), trial count, best result (e.g. "8/10 ✓" if passed, or "6/10" if never passed), latest violation count, and a small badge on any trial where `via_share_link: true` — this is the visual cue tying back to §4a's "no identity assurance on link-started trials" caveat, so a teacher glancing at the table isn't misled into treating every row as equally certain.
- Clicking a student row expands or navigates to the trial-detail view (`GET /trials/:trialId`) showing every word, their answer, correct/incorrect, and (for link-started trials) the captured IP/user-agent as a secondary forensic detail, for their most recent (or a selected) trial.

### Student side

Two entry paths reach the same exercise-taking UI:

1. **Via the authenticated portal** (a student who's logged in normally): within the student portal's schedule/dashboard, a session that has an active consolidation set shows a "Vocabulary Exercise available" indicator (or, if they've already got a trial history, "Best: 8/10 — Try again"). This reuses the portal's existing self-scoped-by-`req.user.id` pattern, and hits the authenticated `/api/consolidations/...` routes — no roster picker needed, their identity is already known.
2. **Via the shared link** (new, per this request): a new fully public page, `ui/src/features/public/ConsolidatePublicPage.tsx`, served at `/consolidate/:shareToken` and explicitly **not** wrapped in the app's authenticated route guard or sidebar shell — a student following a group-chat link should never be asked to log in. Flow: fetch `GET /api/consolidate/:shareToken` → show the class/session label and a searchable "Who are you?" list built from the returned roster → student taps their name → (if that student already has a completed trial today, show the §6a nudge) → `POST .../trials` → proceed into the same exercise UI as path 1.

**The exercise UI itself** (shared by both entry paths, parameterized by either a JWT+trial or a shareToken+trial): launches as `TakeConsolidationPage`, a dedicated route outside the normal app shell — enters fullscreen immediately on start, one word at a time (or all 10 on one scrollable screen — either works; one-at-a-time is easier to keep the student's attention locked and matches "students should not leave or change the screen" more literally, so default to one-at-a-time with a progress indicator "Word 3 of 10").

**After submit:** a results screen showing score, which words were right/wrong (and what the accepted answers were, for the ones they missed — helps them study, though this is a product call the teacher may want to disable per-set; consider a `show_answers_after_submit` boolean on `consolidation_sets` if that concern comes up during implementation review, not committing to it here since it wasn't requested), and a "Try Again" button that starts a new trial through whichever path (portal or link) got them there.

## 8. Edge cases and open questions for implementation review

These are judgment calls narrow enough that they don't change the overall shape of the plan, but should be resolved (by the implementer, or a quick follow-up question) before or during implementation rather than guessed silently:

- **Reassigning a set to a different session, or editing words after trials exist:** v1 treats a set as immutable once any trial exists against it (matches the note in §3). If a teacher needs to fix a typo in a word after students have started, the simplest safe path is: soft-delete the set (only allowed with zero trials, per §4's DELETE route) and create a new one — meaning a typo caught after the first trial requires the teacher to either accept it or explicitly decide what happens to those trials. Flag this to the teacher-facing UI copy rather than silently allowing an edit that would retroactively invalidate scored trials.
- **What if a session has no consolidation set** (the common case, most sessions won't have one) — the tab should show the creation form, not an error state; this is the expected default, not an edge case, just calling it out so it isn't implemented as a 404.
- **Multiple sessions, same class, same words:** the plan as specified creates a new set per session even if the teacher wants to reuse the same 10 words next week. A "duplicate from a previous session's set" convenience (pre-fill the creation form from an existing set) is a reasonable small addition but not required for v1 — mentioned here so it isn't forgotten if requested later.
- **Enrolled-student list for the results dashboard:** "enrolled in the session's class" should use whatever the existing attendance tab already uses to enumerate a session's roster (`SessionWorkflowPage`'s existing attendance-loading code path) rather than a new roster query — reuse, don't reinvent.
- **Mobile/tablet fullscreen support:** the Fullscreen API has inconsistent behavior on iOS Safari in particular (historically limited/no support for `requestFullscreen` on iOS). If students are expected to take this on tablets, this needs a real device test early — flagging now so it isn't discovered late.
- **Telegram's in-app browser:** the link will mostly get opened from inside Telegram's chat view, which renders in Telegram's own embedded browser rather than the phone's real browser and has weaker Fullscreen API support. No special handling planned for this — it's just a plain link, nothing Telegram-specific to build — but worth a quick manual check during testing that the lockdown still engages reasonably there, since that's the actual environment most students will open it in.

## 9. Testing plan (once implemented)

Following this codebase's now-established convention (see `docs/backend-module-audit.md` Appendix D — every module has jest coverage), new test files at `modules/consolidations/{controllers,services,repositories}/tests/*.test.js`:

- Grading correctness: case-insensitivity, trimming, and that a wrong-but-close answer is genuinely marked wrong (no accidental fuzzy match).
- Trial numbering under concurrent/rapid start requests (the unique index in §3 exists specifically to make this testable and safe).
- Auto-submit-on-violation-limit: a trial with partial autosaved answers, hitting the violation cap, ends up `status: 'auto_submitted'` with the partial answers graded, not discarded.
- Access control: a student can't fetch another student's trial detail; a student can't fetch the teacher-view endpoint (with translations) for the exercise they're about to take; a teacher can't create a set for a session belonging to a class they don't teach (unless superuser/owner).
- Results dashboard counts match a hand-built fixture (same fixture-based-assertion discipline the audit's reports-module tests already established).
- **Public link (§4a) specific:** an invalid or deleted-set token gets a generic 404 (not a distinguishable "wrong token" vs "right token, deleted set" response); `POST .../trials` rejects a `student_id` not on that token's roster with 400; a trial created under token A cannot be answered/submitted/violation-logged through token B's routes even with a guessed trial id; the regenerate-link endpoint immediately makes the old token 404 and the new one work; the dedicated rate limiter actually throttles (a jest/supertest-style test hitting the route N+1 times where N is the configured limit).

## 10. Suggested implementation order

1. Schema migration for the 4 tables (§3).
2. Backend module + routes + DTOs (§4), teacher-create and teacher-view-with-translations endpoints first, since they're needed to seed data for testing the rest.
3. Grading logic (§5) with jest tests before wiring any UI to it.
4. Student trial endpoints (start/answer/submit/violation) (§4), tested via the API directly (curl/Postman/jest) before the lockdown UI exists.
5. Public link endpoints (§4a) — the token lookup, roster-scoped trial creation, cross-token scoping check, rate limiter, and regenerate-link — tested via the API directly before any public UI exists, since the scoping check is the one piece of this whole feature where a mistake is a real access-control bug, not just a UX gap.
6. Teacher UI: the new tab in `SessionWorkflowPage` (§7), both the creation form and the results dashboard, including the copy-link/regenerate-link affordances.
7. Student UI, portal path: wire the existing-login entry point into `TakeConsolidationPage` first (simpler, no roster-picker needed) — build it without the lockdown (a plain "type your answers" page that already works end-to-end), then layer the fullscreen/visibility lockdown (§6) on top once the core flow is proven.
8. Student UI, public-link path: `ConsolidatePublicPage` (§7) — the roster picker and the "already submitted, continue anyway?" nudge — reusing the same (already-lockdown-tested) `TakeConsolidationPage` from step 7.
9. Real-device test of fullscreen behavior on whatever tablets/browsers students actually use, per the mobile caveat in §8, before considering it done — test this via the public-link path specifically, since that's the one most likely to be opened on a phone from inside a chat app's in-app browser (Telegram's built-in browser, in particular, has its own quirks with fullscreen requests that are worth checking early).
