# Frontend architecture

The frontend follows feature-first boundaries. New CRM work belongs under `src/features/<area>/<feature>` and should keep these responsibilities separate:

- `Page.tsx`: route composition and navigation only. It must not import the shared transport client.
- `components/`: rendering and user interaction.
- `hooks/`: orchestration of API calls and component lifecycle.
- `*Model.ts` or `model/`: pure business rules, transformations, and API payload builders.
- `types.ts`: frontend domain models and API DTOs.
- `tests/`: pure model and behavior tests.

TSX components do not own transport access or business rules. A component may format presentation values and forward events, but network calls belong in `api/`, lifecycle orchestration belongs in `hooks/`, and calculations or payload construction belong in `model/`. Priority page boundaries are enforced by ESLint using `no-restricted-imports`.

## State ownership

- Server data belongs in the existing domain Redux slice or a feature data hook, but not both for the same resource.
- Cross-route client state belongs in Redux.
- Persisted drafts belong in an explicitly persisted Redux slice. Components must not call `localStorage` directly.
- Dialog visibility and temporary input state stay local unless another route must consume them.
- Persisted state must be serializable, scoped by stable entity IDs, and cleared only after confirmed server success.

## Lists

Use `useListSelection` for selection and the pagination helpers for row positions. A list must expose consistent loading, empty, selection, pagination, and bulk-action behavior. React keys use stable entity IDs; visible row numbers are presentation values and must account for pagination.

## Domain rules

Business calculations and payload construction must be pure functions. Pages should call those functions rather than duplicating rules inside event handlers. Add focused tests for scoring, money, attendance, permissions, or destructive bulk operations.

## Error handling

The application route tree is protected by `RouteErrorBoundary`. Expected API errors still belong in feature-level error UI; the boundary is for unexpected rendering failures.

## Migration direction

Refactor incrementally: extract and test a model, extract orchestration into hooks, then reduce the page to composition. Do not rewrite an entire feature without behavior coverage.
