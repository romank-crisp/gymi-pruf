import 'server-only'
import path from 'node:path'
import fs from 'node:fs'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from './schema'

/**
 * Singleton Drizzle client backed by better-sqlite3.
 *
 * SQLite file lives at <repo>/product-launch-app/data/app.db by default.
 * Override via the DATABASE_PATH env var (used by tests to point at a
 * temp file).
 *
 * Foreign keys are enabled at connection open (better-sqlite3 doesn't
 * enable them by default, and we rely on ON DELETE CASCADE).
 */

function resolveDbPath(): string {
  const override = process.env.DATABASE_PATH
  if (override) return override
  // Default: ./data/app.db relative to the package root
  return path.resolve(process.cwd(), 'data', 'app.db')
}

function createClient() {
  const dbPath = resolveDbPath()
  fs.mkdirSync(path.dirname(dbPath), { recursive: true })
  const sqlite = new Database(dbPath)
  sqlite.pragma('journal_mode = WAL')
  sqlite.pragma('foreign_keys = ON')
  return drizzle(sqlite, { schema })
}

// Module-scoped singleton: across HMR reloads in dev, Next.js reuses the
// same module if we hang it on globalThis.
type Globals = typeof globalThis & {
  __plDb?: ReturnType<typeof createClient>
}
const globals = globalThis as Globals

export const db = globals.__plDb ?? createClient()
if (process.env.NODE_ENV !== 'production') globals.__plDb = db

export { schema }
