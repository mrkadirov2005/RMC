---
name: update-affected-tests
description: Keep automated tests synchronized with implementation changes. Use whenever Codex creates, edits, refactors, fixes, or removes production behavior, UI flows, API contracts, database behavior, validation, accessibility labels, routes, selectors, or data transformations in a repository that has tests. Also use when a user asks to implement a feature or bug fix and expects affected unit, integration, or end-to-end tests to remain accurate.
---

# Update Affected Tests

Treat test maintenance as part of implementation, not as optional follow-up work.

## Workflow

1. Inspect repository instructions and test configuration before editing.
2. Identify the changed observable contract: inputs, outputs, UI text, roles, selectors, routes, payloads, persistence, errors, and side effects.
3. Search for affected tests using feature names, component or module names, endpoints, selectors, labels, fixtures, workflow IDs, and old behavior.
4. Update existing affected tests in the same change. Add coverage when the new behavior has no adequate test.
5. Update shared fixtures, helpers, seeds, mocks, snapshots, workflow inventories, and test documentation when their contract changes.
6. Verify narrowly first, then run the smallest relevant broader suite permitted by the user and environment.
7. Report which tests changed, what was verified, and anything that remains unverified.

## Test selection

- Update unit tests for changed local logic and rendering.
- Update integration tests for changed service, database, validation, authorization, or API behavior.
- Update browser and E2E tests for changed user journeys, accessible names, form order, navigation, persisted state, or backend responses.
- Search beyond the nearest test file when shared helpers or contracts are involved.

## Quality rules

- Test the requested behavior and meaningful failure paths, not implementation details.
- Prefer stable roles, labels, test IDs, and public APIs over fragile DOM structure or styling selectors.
- Do not make a failing test pass by deleting assertions, broadening them until meaningless, adding arbitrary waits, marking tests skipped or fixme, or mocking away the changed behavior.
- Preserve workflow IDs and inventory uniqueness unless the product workflow itself is intentionally removed.
- Keep tests independently repeatable. Use disposable fixtures or deterministic setup for mutations.
- When a product bug causes a test failure, fix the product rather than rewriting the test to accept incorrect behavior.
- When intended behavior changes, update both implementation and assertions describing the old contract.

## Verification constraints

- Respect explicit user instructions not to launch browsers, servers, or test suites. Still update affected test files and perform safe static checks when allowed.
- Do not claim tests pass unless they were executed successfully.
- If execution is blocked, state the exact command the user can run and distinguish compile or static validation from runtime test validation.
- Do not silently leave known affected tests stale. If a test cannot be updated safely, explain the concrete blocker before completing the task.

## Completion checklist

- [ ] Search for affected tests and helpers.
- [ ] Update or add the necessary test coverage.
- [ ] Update fixtures, seeds, mocks, snapshots, and inventories when affected.
- [ ] Run permitted focused validation.
- [ ] Accurately report validation and remaining risks.
