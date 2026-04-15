# Collections Overview

The content engine has five Payload collections. Four are domain-specific; `Media` is a standard Payload built-in.

| Collection | Slug | Group | Purpose |
|------------|------|-------|---------|
| [Exercises](./exercises) | `exercises` | Content | Every exercise in the app |
| [Users](./users) | `users` | — | Auth, roles, reviewer identity |
| [Prompt Templates](./prompt-templates) | `prompt-templates` | Content Engine | Inputs to the AI generation pipeline |
| [Audit Log](./audit-log) | `audit-log` | System | Append-only record of all exercise state changes |
| Media | `media` | — | File uploads (images, audio) via Payload built-in |

## Access control summary

|  | Admin | Reviewer | Family / unauthenticated |
|--|-------|----------|--------------------------|
| Exercises (read) | All states | `generated` + `published` | `published` only |
| Exercises (write) | Create, update, delete | Update only | — |
| Users | Full CRUD | Read own record | Read own record |
| Prompt Templates | Full CRUD | Read only | — |
| Audit Log | Read only | — | — |

## Admin UI groups

Payload's sidebar uses the `group` property to organise collections:

- **Content** — Exercises
- **Content Engine** — Prompt Templates
- **System** — Audit Log
- *(ungrouped)* — Users, Media
