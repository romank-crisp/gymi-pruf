# Exercise Lifecycle

Every exercise moves through a strict state machine enforced server-side. Illegal transitions throw before the database write.

## States

| State | Meaning | Who can see it |
|-------|---------|---------------|
| `generated` | Created by AI (or manually), awaiting teacher review | Admin, Reviewer |
| `published` | Approved, live in the app | Admin, Reviewer (read), Family |
| `rejected` | Rejected by reviewer — with a required reason | Admin only |
| `retired` | Previously published, now withdrawn | Admin only |

## Legal transitions

```
generated ──▶ published    (reviewer approves)
generated ──▶ rejected     (reviewer rejects — reason required)
rejected  ──▶ generated    (admin requeues after prompt fix)
published ──▶ retired      (admin withdraws from app)
```

All other transitions are **illegal** and throw:

```
Error: Illegal lifecycle transition: generated → retired.
Allowed from generated: published, rejected.
```

## Diagram

```
              ┌─────────────┐
   AI / admin │             │
  ────────────▶  generated  │
              │             │
              └──────┬──────┘
                     │
          ┌──────────┴──────────┐
          │                     │
    approve (reviewer)    reject (reviewer)
          │                     │  reason required
          ▼                     ▼
   ┌─────────────┐       ┌─────────────┐
   │  published  │       │  rejected   │
   │  (live)     │       │             │
   └──────┬──────┘       └──────┬──────┘
          │                     │ re-queue (admin)
    retire (admin)               │
          │                     ▼
          ▼               ┌─────────────┐
   ┌─────────────┐        │  generated  │
   │   retired   │        │  (again)    │
   │  (terminal) │        └─────────────┘
   └─────────────┘
```

## Implementation

The state machine lives in **`src/hooks/enforceLifecycleTransition.ts`**, registered as a `beforeChange` hook on the `Exercises` collection.

```typescript
const LEGAL_TRANSITIONS: Record<string, readonly string[]> = {
  generated: ['published', 'rejected'],
  published: ['retired'],
  rejected:  ['generated'],
  retired:   [],           // terminal
}
```

On every update:
1. Read the current state from `originalDoc.lifecycleState`.
2. Read the intended state from `data.lifecycleState`.
3. If unchanged — pass through.
4. If the transition is not in the allowed list — throw.
5. If transitioning to `rejected` without a `rejectionReason` — throw.

On `create`, no `originalDoc` exists so the check is skipped — new exercises may start at any state (needed for the seed script and data migrations).

## Audit trail

Every state transition is recorded in the [Audit Log](./collections/audit-log) by the `writeAuditLog` `afterChange` hook, capturing `fromState`, `toState`, the actor, and the reason (for rejections).
