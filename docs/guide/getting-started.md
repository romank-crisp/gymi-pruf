# Getting Started

Everything you need to run the content engine locally in under five minutes.

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node | 20 LTS | `fnm install 20 && fnm use 20` |
| pnpm | ≥ 10 | `corepack enable && corepack prepare pnpm@latest --activate` |
| PostgreSQL | 16 | `brew install postgresql@16` |

## 1. Clone and install

```bash
git clone git@github.com:romank-crisp/gymi-pruf.git
cd gymi-pruf
pnpm install
```

## 2. Configure environment

```bash
cp .env.example .env
```

Open `.env` and set the values:

```dotenv
DATABASE_URL=postgresql://localhost:5432/gymi_pruf_dev
PAYLOAD_SECRET=<any long random string>

SEED_ADMIN_EMAIL=admin@gymi-pruf.local
SEED_ADMIN_PASSWORD=<choose a password>
```

## 3. Start Postgres

```bash
brew services start postgresql@16
createdb gymi_pruf_dev   # one-time
```

## 4. Seed the database

```bash
pnpm seed
```

This creates the admin user and a reference Wortarten exercise. Safe to re-run — skips existing rows.

## 5. Start the dev server

```bash
pnpm dev
```

Admin UI → [http://localhost:3000/admin](http://localhost:3000/admin)

Log in with the `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` you set in `.env`.

## 6. Run the docs (this site)

```bash
pnpm docs:dev
```

Docs → [http://localhost:5173](http://localhost:5173)

## 7. Run integration tests

```bash
pnpm test:int
```

Expected output: **6 tests, 6 passed**.

## Available scripts

| Script | What it does |
|--------|-------------|
| `pnpm dev` | Next.js dev server (Payload admin on `:3000`) |
| `pnpm build` | Production Next.js build |
| `pnpm seed` | Seed admin user + reference exercise |
| `pnpm test:int` | Run Vitest integration tests against local Postgres |
| `pnpm docs:dev` | VitePress dev server on `:5173` |
| `pnpm docs:build` | Build static docs site |
| `pnpm generate:types` | Re-generate `src/payload-types.ts` from current schema |
| `pnpm lint` | ESLint |
