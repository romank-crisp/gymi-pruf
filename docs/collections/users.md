# Users Collection

**Slug:** `users` · **File:** `src/collections/Users.ts`

Handles authentication and roles. Payload's built-in `auth: true` provides email/password login, JWT session management, and the `/api/users/login` endpoint.

## Fields

| Field | Type | Notes |
|-------|------|-------|
| `email` | text (built-in) | Unique. Used as row title in admin. |
| `password` | text (built-in) | Hashed by Payload. Never returned in API responses. |
| `role` | select (required) | `admin`, `reviewer`, or `family`. Default `family`. |
| `displayName` | text | Shown in the reviewer queue and audit log entries. |

## Roles

| Role | Who | What they can do |
|------|-----|-----------------|
| `admin` | Project owner | Full access to everything — all collections, all states, run generation scripts |
| `reviewer` | Primary school teacher | Sees `generated` exercises in their queue; can approve, edit, or reject |
| `family` | Parent / student household | Reads `published` exercises via the mobile API; no admin UI access |

::: warning Role escalation
The `role` field has its own `update` access control — only admins can change a user's role. A reviewer cannot promote themselves to admin.
:::

## Access control

```
admin (UI access):  admin only
create:             admin only
delete:             admin only
read:               admin → all users
                    reviewer/family → own record only
update:             admin → any user
                    reviewer/family → own record only
```

## Future: relational permissions

The flat `role` field is an intentional v1 simplification. When `tutor` and `school` roles arrive, this must be refactored into a permissions relationship (user ↔ scope). Keep all access checks centralised so that refactor is localized.
