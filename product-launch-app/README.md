# Product Launch App

A small kanban + roadmap app for managing the **Gymi-Vorbereitung** product build. Single screen, black-and-white, accessible to Claude Code via REST + MCP.

```
┌────────────────┬──────────────────────────────────────────────────┐
│ Lists          │  App                                             │
│                │  ─── Backlog · Started · Checked · Review · Done │
│ ● App        ⋯ │                                                  │
│ ○ Content      │  [task cards, drag between cols]                 │
│ ○ Teachers     │                                                  │
│ + New list     │                                                  │
└────────────────┴──────────────────────────────────────────────────┘
```

## Quick start

```bash
cd product-launch-app

pnpm install
pnpm db:migrate          # creates data/app.db with the schema
pnpm db:seed             # seeds App / Content / Teachers Zone
pnpm dev                 # starts on http://localhost:3001
```

Or from the repo root: `pnpm pl:dev`.

## Stack

- **Next.js 16** (App Router, RSC + Route Handlers) on port `3001`
- **TypeScript strict** + **Tailwind v4** + **shadcn/ui** (neutral / black-and-white palette)
- **SQLite** via `better-sqlite3` + **Drizzle ORM**
- `@dnd-kit` for kanban drag-and-drop
- `react-markdown` + `remark-gfm` for the description editor
- **Zod** validators shared between the REST API and the MCP server
- **Vitest** for unit tests on the data layer

## Folder layout

```
product-launch-app/
├── data/                      ← SQLite file (gitignored)
├── drizzle/                   ← generated migrations
├── mcp-server/                ← stdio MCP server (separate package)
├── src/
│   ├── app/
│   │   ├── api/               ← REST endpoints
│   │   ├── page.tsx           ← single-screen UI
│   │   └── globals.css        ← b&w palette + markdown styles
│   ├── components/
│   │   ├── ui/                ← shadcn primitives
│   │   ├── kanban/            ← Board, Column, TaskCard, TaskSheet
│   │   ├── sidebar/           ← ListSidebar
│   │   └── markdown-editor.tsx
│   └── lib/
│       ├── db/                ← Drizzle client, schema, migrate, seed
│       ├── repositories/      ← lists + tasks (all business logic)
│       ├── validators.ts      ← shared zod schemas
│       ├── api-client.ts      ← typed wrapper used by the UI
│       ├── api-helpers.ts     ← error envelope + zod adapter
│       └── format.ts          ← token + date formatters
└── tests/                     ← Vitest specs against a tmp SQLite file
```

## REST API

| Verb | Path | Notes |
|---|---|---|
| GET | `/api/lists` | All lists, ordered by `position` |
| POST | `/api/lists` | `{ name }` — creates at end |
| PATCH | `/api/lists/:id` | `{ name?, position? }` |
| DELETE | `/api/lists/:id` | Cascades to tasks |
| GET | `/api/tasks?listId=&status=` | Filter optional |
| GET | `/api/tasks/:id` | |
| POST | `/api/tasks` | `{ listId, title, description?, status? }` |
| PATCH | `/api/tasks/:id` | `{ title?, description?, tokensSpent?, status? }` |
| DELETE | `/api/tasks/:id` | |
| POST | `/api/tasks/:id/move` | `{ status, position }` — atomic move with rebalance |

Errors come back as `{ error: { code, message, details? } }` with codes `VALIDATION_ERROR / NOT_FOUND / INTERNAL_ERROR`.

## MCP server

Stdio transport, 10 tools mirroring REST one-for-one. Proxies via `fetch()` to the Next.js app.

```bash
# build once
cd product-launch-app/mcp-server
pnpm install
pnpm build

# register with Claude Code
claude mcp add product-launch \
  node "$(pwd)/dist/index.js"
```

Once registered, in any Claude Code session:

```
mcp__product-launch__list_lists()
mcp__product-launch__create_task({ listId, title, description })
mcp__product-launch__move_task({ id, status: "review", position: 0 })
```

The Next.js app must be running for the MCP server to do anything (`pnpm dev`).

Override the API URL via env var:

```bash
PRODUCT_LAUNCH_API_URL=http://localhost:9999 \
  claude mcp add product-launch node /abs/path/dist/index.js
```

## Data model

```
lists                       tasks
─────                       ─────
id (uuid)                   id (uuid)
name                        list_id (fk → lists.id, cascade)
position                    status enum: backlog|started|checked|review|done
created_at                  title
updated_at                  description (markdown, nullable)
                            position
                            tokens_spent (whole int)
                            created_at, updated_at
                            completed_at (set when status enters "done")
```

`completed_at` is auto-managed by the repository on status transitions in/out of `done`. Token count is set manually (e.g. via the MCP `update_task` tool when closing a task).

## Scripts

| Command | What it does |
|---|---|
| `pnpm dev` | Next.js dev server on `:3001` |
| `pnpm build` | Production build |
| `pnpm start` | Production server on `:3001` |
| `pnpm test` | Vitest run (21 specs against a tmp SQLite file) |
| `pnpm test:watch` | Vitest watch mode |
| `pnpm db:generate` | Generate a new migration from schema changes |
| `pnpm db:migrate` | Apply pending migrations |
| `pnpm db:seed` | Idempotent seed of the 3 default lists |
| `pnpm lint` | ESLint |

## What's not in v1

- No auth / multi-user — single-user local app
- No comments, attachments, activity feed, due dates, priorities
- No automatic token tracking (manual int — Claude can fill it via MCP when closing a task)
- No bulk operations
- No deployment recipe (it's a local app)

See [`PLAN.md`](./PLAN.md) for the full architecture document and a list of v2 ideas.
