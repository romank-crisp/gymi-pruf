# Seed Script

**File:** `scripts/seed.ts` · **Command:** `pnpm seed`

Bootstraps a fresh local or staging database with the minimum data needed to work:

1. An **admin user** (email + password from `.env`)
2. A **reference exercise** — a manually authored Wortarten tap-to-tag item that exercises every metadata field

## Usage

```bash
pnpm seed
```

The script is **idempotent** — safe to re-run. It skips rows that already exist (matched by email for users, by title for exercises) and logs whether it created or skipped each item.

## Environment variables

Both must be set in `.env` before running:

```dotenv
SEED_ADMIN_EMAIL=admin@gymi-pruf.local
SEED_ADMIN_PASSWORD=<your password>
```

The script throws immediately if either is missing.

::: danger Production
Never run `pnpm seed` against the production database. It creates a predictable admin account whose password is in your `.env` file.
:::

## Reference exercise

The seeded exercise is a `tap_to_tag` Wortarten exercise titled **"Nomen erkennen — Tiere im Garten"**:

- 5 items, each a sentence with tokenised words
- `correctIndices` marks which tokens are Nomen
- Created with `lifecycleState: 'published'` and `provenance.generationBatchId: 'seed-manual'`
- Difficulty 1, examRelevance 3, canton `ZH`

This serves as the reference for what a well-formed exercise looks like in the database.

## How it works

```typescript
const payload = await getPayload({ config })

// 1. Check if admin exists by email
// 2. Create if not found
// 3. Check if reference exercise exists by title
// 4. Create if not found
// 5. process.exit(0)
```

The script uses `getPayload()` directly (no HTTP) — it connects to the database specified by `DATABASE_URL` in `.env`.
