# Execution Plan: Vocabulary Consolidation Exercises

## Context

The feature itself is already fully designed and approved in `docs/consolidation-feature-plan.md`: a teacher attaches up to 10 vocabulary words (each with up to 5 accepted translations) to a class session, shares a single link to the class's Telegram group with no login required, students pick their name and complete the exercise in a locked-down full-page mode, and the teacher sees per-student submission/trial counts on that session.

What's being planned here is different: **how to actually build it** — how many subagents, in what order, which phases can run in parallel versus must run sequentially, and where this repo's existing skills (`/code-review`, `/simplify`, `run`) fit into the build. This matters because this exact session already ran a comparably-sized effort (a 43-ticket backend remediation followed by a 37-ticket test-writing pass, both split across subagent batches) and hit real, avoidable problems the first time — a subagent given incomplete context about the test suite broke 5 test files, and two batches missed regressions that only a coordinator-level re-verification caught. This plan applies those lessons directly rather than re-learning them.

Two rounds of research grounded this plan against the actual repo, not just the spec doc: an Explore pass confirmed the exact UI patterns to copy (`CreateTestPage.tsx`'s dynamic-list handling, `OwnerRegisterPage.tsx`'s public-page shape, and that `TakeTestPage.tsx` is *not* a valid full-page template since its layout trick depends on an authenticated user that won't exist for the public link flow) and caught a real bug in the original doc (the app uses `HashRouter`, so shareable URLs need a `#/` segment the doc's examples were missing). A Plan pass then used that plus this session's own prior-work lessons to produce the phase breakdown below, which I independently spot-checked against `App.tsx` before finalizing.

## Phase breakdown

Ten phases plus one coordinator checkpoint, sequenced by **file-overlap risk** — the same principle the prior 43-ticket work used: phases that touch the same file run strictly sequentially with no isolation; phases confirmed to touch disjoint files run in parallel.

### Phase 1 — Schema migration (solo, first)
New migration `service/db/migrations/<timestamp>-consolidations.js` (raw SQL `CREATE TABLE IF NOT EXISTS` for all 4 tables + indexes, modeled on `service/db/migrations/20260831000001-teacher-kpis.js`'s `up`/`down` shape), plus the 4 corresponding Drizzle `pgTable` definitions appended to `service/src/db/schema.ts` and added to its `module.exports`. Give this subagent §3 of the feature doc verbatim, the migration naming/timestamp convention, and the exact schema.ts end-of-file shape to match. Nothing else can start before this lands.

### Phase 2 — Backend: create + teacher-view + DTOs (sequential, after 1)
New `service/src/modules/consolidations/{controllers,services,repositories}/` (mirroring `test.controller.ts`/`test.service.ts`/`test.repository.ts`), `service/src/dtos/consolidations.dto.ts`, `service/src/routes/consolidationRoutes.ts`. Implements `POST /api/consolidations`, `GET /api/consolidations/session/:sessionId`, `DELETE /api/consolidations/:setId`. One new `require` + one new `app.use(...)` line in `service/src/index.ts`. Give this subagent: §4 of the doc, the `getScopedCenterId` ownership-check convention, `middleware/validation.ts`'s own code-comment warning about the silent-strip DTO risk (quote it verbatim), the `pool.db.transaction(...)` pattern from `test.service.ts`, and the explicit note that `consolidation_words` has **no** soft delete (breaks the usual pattern, per §3 — flag it so it isn't "fixed" by mistake).

### Phase 3 — Backend: student trial endpoints + grading (sequential, after 2)
Same three files as Phase 2, adding the student-facing routes plus the grading function (§5) as an isolated, testable service function. New jest tests at `modules/consolidations/services/tests/` and `.../repositories/tests/`. Must run after Phase 2 — same files. Give this subagent: §5, the exact grading rule (trimmed/case-folded match against *any* of a word's translations, computed server-side only — the student-view endpoint must never leak `translations`), and the `jest --runInBand` + `modules/<name>/<layer>/tests/<file>.test.js` conventions.

### Phase 4 — Backend: public link routes (sequential, after 3)
New `service/src/routes/consolidatePublicRoutes.ts`, new public handlers added to the same `consolidation.service.ts`/`.controller.ts`, a new `consolidatePublicRateLimiter` in `index.ts` (modeled on the existing `authRateLimiter`), plus the authenticated `POST /:setId/regenerate-link` route. Kept as its own phase/commit rather than merged into Phase 3 specifically because §4a is the doc's own flagged highest-risk piece — an access-control bug here, not just a UX gap. Give this subagent §4a in full and an explicit instruction that the cross-token-to-trial scoping check is load-bearing, not optional (trial ids are sequential integers).

### Phase 5 — Coordinator verification checkpoint (no subagent)
After Phases 1-4 land: independently run `tsc --noEmit` and the full `service` jest suite, diff against a baseline recorded **before Phase 1 starts** (test file count has been climbing all session — recount, don't assume a number). Do not take Phases 2-4's own "tests pass" self-reports as sufficient — this is the exact check that caught real regressions two batches missed earlier in this session. Follow with a `/code-review` pass over the full backend diff before any UI phase starts consuming these endpoints.

### Phase 6 — Teacher UI tab (parallel with Phase 7)
Edits `ui/src/features/crm/classes/SessionWorkflowPage.tsx` (adds `'consolidation'` to the existing `WorkflowTab` union/`WORKFLOW_TABS` array), new `consolidationApi.ts` (mirrors `sessionWorkflowApi.ts`), likely a new `ConsolidationTab.tsx` component given the host file is already 524 lines. **Confirmed by direct inspection that this phase needs zero edits to `App.tsx`** — the session-workflow route already exists at line 634 — which is what makes parallelizing with Phase 7 safe. Give this subagent: §7 (teacher side), the `CreateTestPage.tsx` dynamic-list pattern verbatim (`addWord`/`updateWord(id, updates)`/`deleteWord(id)`, nested translation add/update/delete, client ids via `Date.now().toString()`, no form library exists in this codebase), the roster-reuse note (reuse `SessionWorkflowPage`'s existing attendance-loading roster path, don't reinvent), and the HashRouter fix — the "Copy link" button must build `${window.location.origin}/#/consolidate/${shareToken}`.

### Phase 7 — Public landing + exercise-taking page, no lockdown yet (parallel with Phase 6)
New `ui/src/features/public/ConsolidatePublicPage.tsx` and `ui/src/features/student/TakeConsolidationPage.tsx`, both self-contained per `OwnerRegisterPage.tsx`'s shape (own `<main className="min-h-screen ...">`, no `Layout`, no Redux auth dependency — explicitly **not** modeled on `TakeTestPage.tsx`, which only achieves its full-page look via `Layout.tsx`'s authenticated-user-only `hideSidebar` conditional). Two new route entries in `App.tsx`: a bare public route for `/consolidate/:shareToken` (no `ProtectedRoute`/`Layout`, following the `/owner/register` precedent exactly) and a `ProtectedRoute`-wrapped route for the portal entry point. Give this subagent: §7 (student side) and §6/§6a with the explicit instruction to build the core flow (start/answer/submit/violation-log wiring) *without* the fullscreen/visibility listeners yet, the `OwnerRegisterPage.tsx` template with the note on why `TakeTestPage.tsx` doesn't work, and the same HashRouter fix as Phase 6.

*(Coordinator: `/code-review` over the combined Phase 6/7 diff once both land, before Phase 8 builds on top.)*

### Phase 8 — Lockdown layer (sequential, after 7)
Edits `TakeConsolidationPage.tsx` only — Fullscreen API request-on-start, `visibilitychange`/`blur`/`fullscreenchange`/`beforeunload` listeners, `navigator.sendBeacon` violation posts, warning overlay, auto-submit-on-limit. No backend changes (the violation endpoint already exists). This is the one phase with **zero existing precedent anywhere in the repo** (confirmed via grep — no `sendBeacon`/`fullscreenchange`/`visibilitychange` in `ui/src` today), so the subagent works from §6/§6a's spec text alone. Two things to tell it explicitly: fullscreen must be requested from the "Start Exercise" button's own `onClick`, not a `useEffect` (browsers silently reject fullscreen requests not tied to a direct user gesture), and the violation endpoint must not depend on reading a response body since `sendBeacon` can't read one.

**Verification for this phase is a genuine judgment call, not just another test-writing step:** tell the Phase 8 subagent to use the `run` skill itself before declaring done — launch the app, go through the public-link path (most students will actually arrive this way), click Start, verify fullscreen engages, switching tabs shows the warning and increments the counter, hitting the limit auto-submits and locks input. That catches everything a subagent *can* self-verify. It cannot verify real iOS Safari quirks or actual Telegram in-app-browser behavior — a `run`-skill browser session isn't a real phone. **Flag that explicitly as an unresolved follow-up for you to check on an actual device inside Telegram before rolling this out to students**, rather than letting the subagent's "looked fine in Chrome" self-report stand in for it.

### Phase 9 — Remaining test coverage (parallel batch of up to 3, after backend fully committed)
Fills any §9 checklist gaps not already covered inline by Phases 2-4: controller-layer access-control tests (student can't fetch another student's trial, can't hit the teacher-view endpoint; teacher can't create a set for a class they don't teach), results-dashboard fixture-based count tests. These are disjoint per-layer test files, so — like the prior work's parallel QA batches — this can be 1-3 subagents split by layer (controller / service / repository), only after Phases 1-4 are committed and stable. Fewer, larger tickets are also fine here; the 3-way split is an efficiency option, not something file-overlap forces.

### Phase 10 — Final `/simplify` pass (solo, last)
One pass across the entire feature diff, after everything above has landed. Deliberately not done per-phase — a simplify pass run before both the teacher-side and public-side API clients exist can't see, for example, that they share enough shape to extract a common request helper. Seeing the whole feature at once is when this pass is actually useful.

## Skill-tool placement

- **`/code-review`**: twice — after Phase 4 (full backend, before UI consumes it) and after Phases 6+7 together (full core UI, before Phase 8 layers lockdown on top of it).
- **`run`**: primarily Phase 8's own self-verification (the one piece of this feature no automated test can confirm, since Fullscreen/`visibilitychange` need a real browser event loop). Optionally also a quick sanity `run` right after Phase 6/7 land, before investing Phase 8's effort on top of a possibly-broken base.
- **`/simplify`**: once, at the very end (Phase 10).

## Summary table

| Phase | Description | Group | Subagents |
|---|---|---|---|
| 1 | Schema migration | Sequential, solo | 1 |
| 2 | Backend: create + teacher-view | Sequential, after 1 | 1 |
| 3 | Backend: trial endpoints + grading | Sequential, after 2 | 1 |
| 4 | Backend: public link routes | Sequential, after 3 | 1 |
| 5 | Verification checkpoint + `/code-review` | Coordinator action | 0 |
| 6 | Teacher UI tab | Parallel group A | 1 |
| 7 | Public landing + exercise page (no lockdown) | Parallel group A | 1 |
| — | `/code-review` over combined 6+7 | Coordinator action | 0 |
| 8 | Lockdown layer + `run`-skill self-verify | Sequential, after 7 | 1 |
| — | Manual real-device follow-up | Flagged for you | 0 |
| 9 | Remaining test coverage | Parallel group B | up to 3 |
| 10 | Final `/simplify` pass | Sequential, last | 1 |

**Total: roughly 8-10 subagents** across the whole feature — 6 solo sequential phases, 2 in parallel group A, up to 3 in parallel group B (negotiable down to 1).

## Verification

- After every backend phase (1-4): `cd service && npx tsc --noEmit` and `npx jest --runInBand` compared against the baseline recorded before Phase 1.
- After every UI phase (6-8): `cd ui && npx tsc -p tsconfig.app.json --noEmit` and `npx vitest run`.
- Phase 5 and the post-6/7 checkpoint are the two points where I re-verify independently rather than trust a subagent's own report, per this session's own established lesson that self-reports alone weren't reliable enough on the first pass through the earlier 43-ticket work.
- Phase 8's lockdown behavior gets a `run`-skill live-browser pass as part of that phase, plus an explicit flagged gap for you to test on a real phone inside Telegram before students use it — this is not something any automated step in this plan can close.
- One outstanding doc fix to make during implementation, not before: `docs/consolidation-feature-plan.md`'s §3/§4a/§7 URL examples need the `#/` HashRouter segment corrected — Phase 6 or 7's subagent should be told to fix this in the doc alongside building the actual "copy link" UI, so the doc and the code agree.
