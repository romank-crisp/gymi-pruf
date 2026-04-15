# Gymi-Vorbereitung — Content Engine

Backend for the Gymnasium entrance-exam prep app. See `CLAUDE.md` for project
context and `docs/project-documentation.md` for the full spec.

This repo contains the **content engine** only (Payload CMS + Postgres). The
mobile app will be scoped later and will consume this API.

## Stack

- [Payload 3](https://payloadcms.com) (TypeScript, Next.js 16, React 19)
- Postgres 16 (local via Homebrew; Cloud SQL in prod)
- Node 20 LTS (pinned via `fnm`)
- pnpm 10

## First-time setup (macOS)

```bash
brew install fnm postgresql@16
brew services start postgresql@16
createdb gymi_pruf_dev

fnm install 20 && fnm use 20
corepack enable && corepack prepare pnpm@latest --activate

cp .env.example .env
# edit .env — at minimum set PAYLOAD_SECRET to a random 32+ char string

pnpm install
pnpm seed        # creates admin user + one reference exercise
pnpm dev         # http://localhost:3000/admin
```

Default seed credentials are in `.env` (`SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`).

## Scripts

| Command | What it does |
|---|---|
| `pnpm dev` | Run Payload admin on `localhost:3000` |
| `pnpm seed` | Create admin + reference exercise (idempotent) |
| `pnpm test:int` | Vitest integration tests (requires DB running) |
| `pnpm generate:types` | Regenerate `src/payload-types.ts` from collections |
| `pnpm lint` | ESLint |

## Collections

- **users** — admin / reviewer / family. Role-based access.
- **exercises** — the single collection for all 2,020 drill exercises across all 11 formats.
- **prompt-templates** — inputs to the AI generation pipeline. Admin-owned, versioned.
- **audit-log** — append-only. Written by hook on every exercise state change.
- **media** — images / audio for image-based and audio-based exercises.

## Exercise lifecycle

```
generated ──▶ published ──▶ retired
      │
      └─▶ rejected ──▶ generated (requeue)
```

Enforced in `src/hooks/enforceLifecycleTransition.ts`. Any other transition throws.
`rejected` requires a `rejectionReason`. See `tests/int/lifecycle.int.spec.ts` for
the contract.

## What's next

Following the 4-week plan in `CLAUDE.md`:

- **Week 2** — reviewer queue UI (approve / edit / reject), audit log views.
- **Week 3** — Anthropic generation pipeline (`scripts/generate.ts`), auto-validation.
- **Week 4** — deploy to Cloud Run + Cloud SQL.
