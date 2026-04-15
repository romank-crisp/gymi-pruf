# Integration Tests

**Framework:** [Vitest](https://vitest.dev/) · **Command:** `pnpm test:int`

Tests run against the **real local Postgres database** — no mocks, no in-memory DB. This gives high confidence that the hooks, access control, and state machine actually work end-to-end.

## Running tests

```bash
pnpm test:int
```

Expected output:
```
✓ tests/int/api.int.spec.ts (1 test)
✓ tests/int/lifecycle.int.spec.ts (5 tests)

Test Files  2 passed (2)
Tests       6 passed (6)
```

## Test files

### `api.int.spec.ts`

Smoke test. Boots Payload, calls `payload.find({ collection: 'users' })`, asserts the result is defined. Guards against schema or config regressions breaking basic API access.

### `lifecycle.int.spec.ts`

Guards the exercise state machine. Five tests covering:

| Test | Assertion |
|------|-----------|
| `generated → published` | Succeeds; `lifecycleState` is `published` |
| `generated → retired` | Throws `Illegal lifecycle transition` |
| `generated → rejected` (no reason) | Throws, requires `rejectionReason` |
| `generated → rejected → generated` | Both transitions succeed with reason |
| Audit log on transition | Log has ≥ 2 entries; transition entry has correct `fromState`/`toState` |

Each test creates its own exercise, performs the assertion, and cleans up — no shared state between tests.

## Test setup

```typescript
// vitest.config.mts
// Uses @/payload.config alias pointing to src/payload.config.ts
// Runs with --no-deprecation to suppress Node/Payload version warnings
```

Tests call `getPayload({ config })` directly — the same path as the seed script. No HTTP server is started.

## Adding tests

New integration tests go in `tests/int/`. Helper utilities (login, seedUser) live in `tests/helpers/`.

::: tip Convention
Name integration test files `*.int.spec.ts` so they're easy to filter. If/when unit tests are added (e.g. for validators), use `*.spec.ts`.
:::

## What's not tested yet

- Access control per role (e.g. reviewer cannot read `retired` exercises) — add in Week 2 alongside the reviewer queue.
- Prompt template CRUD — add in Week 3 alongside the generation script.
- Audit log write failures being swallowed — property-based or fault-injection test.
