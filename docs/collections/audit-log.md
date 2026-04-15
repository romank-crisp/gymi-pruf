# Audit Log Collection

**Slug:** `audit-log` · **File:** `src/collections/AuditLog.ts`

An append-only record of every state change and edit on the `exercises` collection. Written automatically by the `writeAuditLog` `afterChange` hook. **Never written or edited by hand.**

## Fields

| Field | Type | Notes |
|-------|------|-------|
| `summary` | text | One-line recap, e.g. `alice@school.ch moved exercise "Nomen erkennen" from generated to published` |
| `action` | select (required) | `created`, `transitioned`, or `edited` |
| `fromState` | text | Previous `lifecycleState`. Null on `created`. |
| `toState` | text | New `lifecycleState`. Same as `fromState` on `edited`. |
| `exercise` | relationship → `exercises` | Nullable — survives if the exercise is hard-deleted. |
| `actor` | relationship → `users` | The user who triggered the change. `null` for system/script actions. |
| `reason` | textarea | Copied from `rejectionReason` on rejection transitions. |

Timestamps (`createdAt`, `updatedAt`) are added automatically by Payload.

## Action types

| Action | When |
|--------|------|
| `created` | A new exercise is inserted |
| `transitioned` | `lifecycleState` changes (e.g. `generated → published`) |
| `edited` | Exercise is updated but state does not change |

## Why it exists

- **Compliance** — who rejected what, when, and why.
- **Reviewer throughput analytics** — how many exercises does a reviewer process per hour?
- **Debugging** — trace unexpected state changes back to an actor and timestamp.

## Access control

```
read:   admin only
create: nobody (hook-only)
update: nobody
delete: nobody
```

## Failure behaviour

The `writeAuditLog` hook **swallows its own errors** — a failed audit write logs to `stderr` but never blocks the exercise save. The audit log is for forensics, not correctness. Losing an occasional log entry is preferable to losing a content edit.
