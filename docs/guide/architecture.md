# Architecture

## Overview

```
┌───────────────────────────────────────────────────────┐
│                   Content Engine                       │
│                                                        │
│  ┌──────────────┐     ┌──────────────────────────┐    │
│  │  Payload CMS │────▶│     Postgres (local:5432) │    │
│  │  (Next.js)   │     │  or Cloud SQL (prod)      │    │
│  │  :3000/admin │     └──────────────────────────┘    │
│  └──────┬───────┘                                      │
│         │ REST + GraphQL                               │
│         ▼                                              │
│  ┌──────────────┐     ┌──────────────────────────┐    │
│  │  Generation  │────▶│  Anthropic API (Claude)  │    │
│  │  scripts/    │     └──────────────────────────┘    │
│  └──────────────┘                                      │
└───────────────────────────────────────────────────────┘
         │
         │ REST API (future)
         ▼
  Mobile App (not yet scoped)
```

## Tech choices

| Concern | Choice | Why |
|---------|--------|-----|
| CMS | [Payload 3](https://payloadcms.com/) | TypeScript-native, self-hosted, owns schema, REST + GraphQL, good admin UI |
| Database | PostgreSQL 16 | Relational, familiar, required by Payload's Postgres adapter |
| Runtime | Node 20 LTS | Pinned via `.nvmrc` / `fnm` |
| Package manager | pnpm 10 | Efficient, workspace-ready for later monorepo split |
| AI generation | Anthropic Claude (via SDK) | Content quality; prompt caching reduces cost |
| Test framework | [Vitest](https://vitest.dev/) | Fast, ESM-native, runs against real Postgres |
| Docs | [VitePress](https://vitepress.dev/) | Markdown-first, zero config, fast |

## Directory structure

```
gymi-pruf/
├── src/
│   ├── app/
│   │   ├── (frontend)/          # Thin Next.js shell (placeholder)
│   │   └── (payload)/           # Payload admin + API routes
│   ├── collections/
│   │   ├── Exercises.ts         # Main content collection
│   │   ├── Users.ts             # Auth + roles
│   │   ├── PromptTemplates.ts   # AI generation inputs
│   │   ├── AuditLog.ts          # Append-only transition log
│   │   └── Media.ts             # File uploads (Payload built-in)
│   ├── hooks/
│   │   ├── enforceLifecycleTransition.ts  # beforeChange: state machine
│   │   └── writeAuditLog.ts               # afterChange: audit trail
│   └── payload.config.ts        # Root Payload configuration
├── scripts/
│   └── seed.ts                  # Dev/staging seed script
├── tests/
│   ├── int/
│   │   ├── api.int.spec.ts      # Basic API smoke test
│   │   └── lifecycle.int.spec.ts  # State machine + audit log tests
│   └── helpers/                 # Shared test utilities
├── docs/                        # This documentation site (VitePress)
├── .env.example                 # Environment variable template
└── package.json
```

## Production hosting (Week 4)

| Component | Service |
|-----------|---------|
| Payload server | Google Cloud Run (containerised) |
| Database | Cloud SQL for PostgreSQL (private IP) |
| Media storage | Cloud Storage + signed URLs |
| Secrets | Secret Manager |

## Key design decisions

### Payload over a custom Express API
Payload gives us a fully-featured admin UI, auth, REST, and GraphQL for free. The mobile app will consume the REST API directly once it exists. We don't need a separate layer.

### Flat role field (for now)
Users have a single `role: 'admin' | 'reviewer' | 'family'`. Per CLAUDE.md this is an intentional simplification — it must be refactored into relational permissions when `tutor` and `school` roles arrive. Keep all access checks behind the helpers in `src/access/` (to be extracted) so the refactor is localized.

### `items` as JSON, not polymorphic Payload fields
Exercise items are stored as an untyped `json` field rather than a union of Payload block types. This keeps the admin UI simple and the Postgres schema stable as new formats are added. Per-format validation is done in `src/validators/items/` (Week 3).

### One collection for all exercises
All 2,020+ exercises live in a single `exercises` table, differentiated by `format` and `section`. This makes aggregate queries, difficulty calibration, and content metrics trivial. No multi-table joins to count total exercises.
