# Product Launch App — Implementation Plan

A small kanban + roadmap app for managing the **Gymi-Vorbereitung** product build. Lives in this repo as a **standalone Next.js application**, isolated from the Payload curriculum app. Accessible to Claude Code via REST + MCP so it can create/update tasks during sessions.

---

## 1. Goals & Non-goals

### Goals (v1)

- **One screen** — sidebar (lists) + kanban board (columns) + task side panel.
- **5 columns** per list: `backlog → started → checked → review → done`.
- **CRUD** on lists and tasks (UI + API + MCP).
- **System fields** captured per task: ID, created_at, updated_at, completed_at, tokens_spent.
- **Black & white** visual design — no accent colors.
- **Claude Code integration** — both REST and a local MCP server expose the same operations.

### Non-goals (v1)

- No multi-user, no auth, no roles. Single-user local app.
- No comments, attachments, or activity feed.
- No automatic token tracking (manual int field — Claude Code can fill it via MCP when closing a task).
- No deployment to Cloud Run; runs locally.
- No notifications, due dates, priorities. Add later if needed.
- No drag-to-reorder *between lists* — tasks belong to one list. Drag only within columns of one list and across columns within that list.

---

## 2. Stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js 15 (App Router, RSC + Route Handlers) | Same Node/TS toolchain as the parent repo |
| Language | TypeScript strict | |
| UI kit | shadcn/ui (Radix + Tailwind v4) | `Card`, `Button`, `Dialog`, `Sheet`, `Input`, `Textarea`, `Badge`, `DropdownMenu` |
| Drag-and-drop | `@dnd-kit/core` + `@dnd-kit/sortable` | Kanban dragging + within-column reorder |
| Icons | `lucide-react` | Default with shadcn |
| Storage | **SQLite** (`better-sqlite3`) | File at `product-launch-app/data/app.db`. Synchronous driver — fine for single-user local app |
| ORM / migrations | Drizzle ORM + drizzle-kit | Type-safe, schema-as-code, easy migrations |
| Validation | Zod | Shared schemas between API + MCP + client |
| MCP SDK | `@modelcontextprotocol/sdk` | Stdio transport |
| Test | Vitest | Unit tests for the data layer + zod schemas |

---

## 3. Repository layout

```
product-launch-app/
├── PLAN.md                         ← this file
├── README.md
├── package.json
├── tsconfig.json
├── next.config.ts
├── tailwind.config.ts
├── components.json                 ← shadcn config
├── drizzle.config.ts
├── .env.local                      ← DATABASE_URL=file:./data/app.db
├── data/
│   └── app.db                      ← SQLite file (gitignored except .gitkeep)
├── drizzle/
│   └── 0000_init.sql               ← generated migrations
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx                ← single-screen UI
│   │   ├── globals.css
│   │   └── api/
│   │       ├── lists/
│   │       │   ├── route.ts        ← GET, POST
│   │       │   └── [id]/route.ts   ← PATCH, DELETE
│   │       └── tasks/
│   │           ├── route.ts        ← GET (with filters), POST
│   │           └── [id]/
│   │               ├── route.ts    ← GET, PATCH, DELETE
│   │               └── move/route.ts ← POST (status + position)
│   ├── components/
│   │   ├── ui/                     ← shadcn primitives
│   │   ├── kanban/
│   │   │   ├── Board.tsx
│   │   │   ├── Column.tsx
│   │   │   └── TaskCard.tsx
│   │   ├── sidebar/
│   │   │   ├── ListSidebar.tsx
│   │   │   └── ListItem.tsx
│   │   └── task/
│   │       ├── TaskSheet.tsx       ← right side panel for task detail
│   │       └── TaskForm.tsx
│   ├── lib/
│   │   ├── db/
│   │   │   ├── client.ts           ← drizzle + better-sqlite3 instance
│   │   │   ├── schema.ts           ← drizzle table definitions
│   │   │   └── seed.ts             ← seed App / Content / Teachers Zone
│   │   ├── repositories/
│   │   │   ├── lists.ts
│   │   │   └── tasks.ts
│   │   ├── validators.ts           ← zod schemas (request + entity)
│   │   └── api-client.ts           ← thin client wrapper used by UI
│   └── hooks/
│       └── useBoard.ts             ← board state + optimistic updates
├── mcp-server/
│   ├── package.json                ← separate package, sibling to app
│   ├── index.ts                    ← stdio MCP server
│   └── tools.ts                    ← tool definitions, calls REST API
└── tests/
    ├── repositories.spec.ts
    └── validators.spec.ts
```

---

## 4. Database schema

```ts
// src/lib/db/schema.ts
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

export const lists = sqliteTable('lists', {
  id: text('id').primaryKey(),                   // uuid
  name: text('name').notNull(),
  position: integer('position').notNull().default(0),
  createdAt: text('created_at').notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`),
})

export const tasks = sqliteTable('tasks', {
  id: text('id').primaryKey(),                   // uuid
  listId: text('list_id').notNull().references(() => lists.id, { onDelete: 'cascade' }),
  status: text('status', {
    enum: ['backlog', 'started', 'checked', 'review', 'done'],
  }).notNull().default('backlog'),
  title: text('title').notNull(),
  description: text('description'),
  position: integer('position').notNull().default(0),
  tokensSpent: integer('tokens_spent').notNull().default(0),
  createdAt: text('created_at').notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`),
  completedAt: text('completed_at'),             // set when status becomes 'done'
})
```

**Indexes**:
- `(list_id, status, position)` for ordered fetch within a column
- `(list_id, position)` for list-level ordering of tasks (rare, but cheap)

**ID strategy**: `crypto.randomUUID()` everywhere. Short, unguessable, no FK churn on rename.

**Cascade**: deleting a list deletes its tasks. The UI shows a confirm dialog with task count.

---

## 5. REST API contract

All endpoints under `/api/`. JSON in/out. No auth (single-user local).

### Lists

| Verb | Path | Body | Response |
|---|---|---|---|
| GET | `/api/lists` | — | `List[]` (ordered by `position`) |
| POST | `/api/lists` | `{ name }` | `List` (201) |
| PATCH | `/api/lists/:id` | `{ name?, position? }` | `List` |
| DELETE | `/api/lists/:id` | — | `204` (cascades tasks) |

### Tasks

| Verb | Path | Body | Response |
|---|---|---|---|
| GET | `/api/tasks?listId=&status=` | — | `Task[]` (ordered by `position`) |
| GET | `/api/tasks/:id` | — | `Task` |
| POST | `/api/tasks` | `{ listId, title, description?, status? }` | `Task` (201) |
| PATCH | `/api/tasks/:id` | `{ title?, description?, tokensSpent?, status? }` | `Task` |
| DELETE | `/api/tasks/:id` | — | `204` |
| POST | `/api/tasks/:id/move` | `{ status, position }` | `Task` |

### Status transitions

No state machine in v1 — any status → any status is allowed. The kanban encourages forward flow but doesn't enforce it. Setting `status = 'done'` auto-fills `completed_at = now()`. Moving away from `done` clears it.

### Errors

Standard JSON: `{ error: { code: string, message: string, details?: object } }`. Codes: `VALIDATION_ERROR`, `NOT_FOUND`, `INTERNAL_ERROR`.

---

## 6. MCP server design

A small standalone Node process at `mcp-server/index.ts`, registered with Claude Code via:

```bash
claude mcp add product-launch \
  node /absolute/path/to/product-launch-app/mcp-server/dist/index.js
```

### Transport

Stdio. Local-only. No HTTP, no auth.

### Tool list

Mirrors the REST API one-for-one. All tools share a small zod schema set re-exported from the app's `src/lib/validators.ts`.

| MCP tool | Description |
|---|---|
| `list_lists` | Returns all lists |
| `create_list({ name })` | Adds a list at the end |
| `update_list({ id, name?, position? })` | |
| `delete_list({ id })` | Cascades tasks |
| `list_tasks({ listId?, status? })` | Filter by list and/or status |
| `get_task({ id })` | Full task |
| `create_task({ listId, title, description?, status? })` | |
| `update_task({ id, title?, description?, tokensSpent?, status? })` | |
| `delete_task({ id })` | |
| `move_task({ id, status, position })` | Atomic column-and-order change |

### Implementation choice

The MCP server **calls the running Next.js app's REST API** via `fetch('http://localhost:3000/api/...')`. Two reasons:

1. Single source of truth for business logic (Drizzle queries, validation, position rebalancing).
2. The MCP process can be tiny and stateless — no DB connection, no migrations, just a thin adapter.

Trade-off: the Next.js dev/prod server must be running for MCP to work. That's acceptable — the app and the MCP are always used together. The MCP server fails fast with a clear error if the app isn't reachable.

### Configuration

- `PRODUCT_LAUNCH_API_URL` env var (default `http://localhost:3000`)
- The MCP `index.ts` reads this once at startup.

---

## 7. UI architecture

### Single page: `app/page.tsx`

Server-renders the initial board state (lists + selected list's tasks) using direct repository calls. Hydrates with a small client-side store for drag interactions and form mutations.

### State management

- **No global state library** for v1. React `useState` + `useTransition` are enough.
- Server actions for mutations, with a thin `revalidatePath('/')` after each.
- Optimistic updates on drag (re-arrange locally, then PATCH; on failure, refetch).

### Layout

```
┌────────────────┬────────────────────────────────────────────┐
│                │  ▾ App                                     │
│ LISTS          │  ┌──────────┬──────────┬──────────┬────────┤
│                │  │ Backlog  │ Started  │ Checked  │  Done  │
│ • App        ⋯ │  │  (5)     │  (2)     │  (1)     │  (8)   │
│ ○ Content    ⋯ │  ├──────────┼──────────┼──────────┼────────┤
│ ○ Teachers   ⋯ │  │ [card]   │ [card]   │ [card]   │ [card] │
│                │  │ [card]   │ [card]   │          │ [card] │
│ + New list     │  │ [card]   │          │          │        │
│                │  └──────────┴──────────┴──────────┴────────┘
└────────────────┴────────────────────────────────────────────┘
                                       ↓ click any task card
                            ┌──────────────────────────┐
                            │  Task detail (Sheet)     │
                            │  ─────────────────────── │
                            │  Title:   [editable]     │
                            │  Status:  [select]       │
                            │  ──                      │
                            │  Description             │
                            │  [textarea]              │
                            │  ──                      │
                            │  ID:        abc-123      │
                            │  Created:   2026-04-30   │
                            │  Updated:   2026-05-01   │
                            │  Completed: —            │
                            │  Tokens spent: [42]      │
                            │  ──                      │
                            │  [Save]     [Delete]     │
                            └──────────────────────────┘
```

### Components

| Component | Responsibility |
|---|---|
| `Board` | Top-level: receives current list + tasks, renders 5 columns, owns DnDContext |
| `Column` | One status column. Sortable list of tasks |
| `TaskCard` | Title (truncated), token chip if > 0, click → opens TaskSheet |
| `ListSidebar` | List of lists, active highlighting, `+ New list`, hover → ⋯ menu |
| `ListItem` | One list row with rename/delete via DropdownMenu |
| `TaskSheet` | Right-anchored Sheet, edit form + system fields + delete |
| `TaskForm` | Inline form used inside TaskSheet (and for "+ Add task" in column footers) |

### Drag-and-drop

`@dnd-kit/core` with `SortableContext` per column.
- Drag within a column → reorder by swapping `position`.
- Drag across columns → change `status` + recompute `position`.
- Single PATCH to `/api/tasks/:id/move` with `{ status, position }`.
- Server rebalances neighbours: insert at `position = N` shifts everyone with `position >= N` by `+1`.

### Hotkeys (nice-to-have, only if cheap)

- `n` → new task in current column (focus first column if no column hovered)
- `Esc` → close TaskSheet
- `cmd+enter` → save TaskSheet

---

## 8. Black & white design system

- Tailwind palette: only `zinc` shades + `white` and `black`.
- Background: `zinc-50` (light surface), cards on `white` with `zinc-200` borders.
- Text: `zinc-900` primary, `zinc-500` secondary, `zinc-400` placeholder.
- Status pills: outlined, no fill — column header carries the status name.
- Active list: `zinc-900` background with `white` text. Inactive: hover → `zinc-100`.
- Token chip: small pill, `zinc-100` background, monospace font.
- Drag preview: card with `shadow-md` and `ring-1 ring-zinc-900`.
- Focus ring: `ring-2 ring-zinc-900`.

No gradients, no shadows beyond a single elevation level, no rounded corners larger than `rounded-md` (6px).

---

## 9. Implementation phases

Each phase ends in a working state with at least a smoke test or visible UI. Commits at each ✓.

### Phase 0 — Plan + branch (this PR opens here)

- ✓ New branch `ProductLaunchApp` off `main`.
- ✓ This `PLAN.md` committed as the PR body.
- Open as **Draft PR** so reviewers can comment on the plan before code lands.

### Phase 1 — Scaffold

1. `pnpm create next-app` in `product-launch-app/` (TS, App Router, Tailwind, no src dir → re-organise to src).
2. `pnpm add drizzle-orm better-sqlite3 zod @dnd-kit/core @dnd-kit/sortable @modelcontextprotocol/sdk`.
3. `pnpm add -D drizzle-kit @types/better-sqlite3 vitest`.
4. `pnpx shadcn@latest init` → black/white theme.
5. `pnpx shadcn@latest add button card input textarea sheet dialog dropdown-menu badge label`.
6. Tailwind palette override → only zinc + black + white.
7. `data/.gitkeep`, add `data/*.db*` to `.gitignore`.

**Done when**: `pnpm dev` shows a hello-world page on `:3001` (different port than the Payload app on `:3000`).

### Phase 2 — Database + repositories

1. Drizzle schema (`schema.ts`) for `lists` + `tasks`.
2. `drizzle.config.ts` pointing at `data/app.db`.
3. Generate first migration: `pnpm drizzle-kit generate`.
4. Migrator script: `pnpm db:migrate`.
5. Seed script: `pnpm db:seed` → creates "App", "Content", "Teachers Zone" if empty.
6. Repository functions in `lib/repositories/*.ts` — fully typed, no Drizzle types leaking outside.
7. Vitest suite for repositories — covers create / list / update / delete / move + position rebalancing edge cases.

**Done when**: `pnpm test` is green and `sqlite3 data/app.db ".tables"` shows both tables.

### Phase 3 — REST API

1. Zod request/response schemas in `lib/validators.ts`.
2. Route handlers under `app/api/*` — thin layer: parse → call repo → respond.
3. Error envelope helper.
4. Smoke test with `curl`:
   ```bash
   curl localhost:3001/api/lists
   curl -X POST localhost:3001/api/tasks \
     -H 'content-type: application/json' \
     -d '{"listId":"...","title":"Wire MCP"}'
   ```
5. (Optional) integration test with Vitest + a temp DB file.

**Done when**: all 12 endpoints respond correctly, validated via curl matrix.

### Phase 4 — UI

1. `app/page.tsx` server component fetches initial state.
2. `ListSidebar` with active state and CRUD via DropdownMenu (rename inline, delete with confirm).
3. `Board` + 5 `Column`s wired to current list.
4. `TaskCard` with click → `TaskSheet`.
5. `TaskForm` inline at the bottom of each column for quick-add.
6. `@dnd-kit` integration: drag within and across columns, optimistic update, server roundtrip.
7. Loading / empty states (skeleton on first render, "No tasks yet — add one ↓").
8. Responsive minimal: works on a 13" screen, scrolls horizontally on smaller widths.

**Done when**: I can create a list, add tasks, drag them through all 5 columns, edit, delete — all without page reloads.

### Phase 5 — MCP server

1. Sibling package in `mcp-server/` with its own `package.json` (depends on `@modelcontextprotocol/sdk` + `zod`).
2. `tools.ts` defines all 10 tools with zod input schemas.
3. `index.ts` wires the stdio server, dispatches each tool to a `fetch(API_URL + ...)` call.
4. Build step: `pnpm --filter mcp-server build` → outputs `dist/index.js`.
5. README snippet for `claude mcp add ...` registration.
6. Smoke test from Claude Code: `mcp__product-launch__create_task({listId:..., title:"..."}` shows up in the UI within seconds.

**Done when**: a Claude Code session creates and updates tasks visible in the running app.

### Phase 6 — Polish + ship

1. Convert PR from Draft to Ready.
2. README at `product-launch-app/README.md`: install, dev, build, MCP setup, screenshots.
3. Add `pnpm pl:dev` shortcut to root `package.json` to run the app from the repo root.
4. Add `data/app.db` to `.gitignore` (not tracked — local-only).
5. Squash if commits are noisy; otherwise leave per-phase commits.
6. Merge to `main`.

---

## 10. Testing

- **Unit (Vitest)** — repositories, validators, position rebalancing math.
- **Smoke (manual)** — full kanban flow: create list, add 3 tasks, drag, edit, delete. Repeat via MCP from a Claude session.
- **No e2e** for v1. The app is single-user, single-screen, cheap to manually verify.

---

## 11. Open questions (please confirm or push back)

1. **Port** — proposed `3001` to avoid collision with the Payload app on `:3000`. OK?
2. **Default lists** — seed "App / Content / Teachers Zone"? Or start empty and let me create them via MCP?
3. **Token unit** — integer "tokens" (millions of API tokens? thousands?). I'm leaning **whole tokens** as the source of truth (no rounding); display as `42k` in the UI when ≥ 1000. OK?
4. **MCP authentication** — local stdio = no auth needed. If you ever want to access from a remote agent, we'd add a bearer token. Acceptable for v1?
5. **Description editing** — plain textarea for v1. Markdown rendering is a 30-min add-on later. OK to defer?
6. **Bulk operations** — none. Add later if you find yourself needing them. OK?

---

## 12. Risks & mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| `better-sqlite3` native build fails on macOS upgrade | Can't run | Pin Node 20, document with README; fallback `libsql` (pure-JS) is a 10-min swap |
| Position rebalancing bugs (gaps, dupes) | Cards jump on drag | Use float positions or 1024-step gaps; rebalance lazily when gap < 8 |
| Next.js + better-sqlite3 in serverless | N/A — local only | We pin to `output: 'standalone'`, run as a long-lived process |
| Drift between REST and MCP | Inconsistent CRUD | MCP **proxies** REST; no separate DB code path |

---

## 13. Out-of-scope but obvious next steps (v2 ideas)

- Auto-track tokens by reading Claude Code session transcripts.
- Per-task linked Claude Code session (open/start a session from a task card).
- Inter-task dependencies (`blocks` / `depends-on`).
- Markdown in description with a tiny preview toggle.
- Export / import JSON for backup.
- Cloud Run deploy with a single shared SQLite (or Postgres) for multi-device.
