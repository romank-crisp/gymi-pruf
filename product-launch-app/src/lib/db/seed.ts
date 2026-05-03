/**
 * Seed default lists if the database is empty. Idempotent: if any list
 * already exists, this script is a no-op.
 *
 * Run via `pnpm db:seed`.
 */
import path from 'node:path'
import fs from 'node:fs'
import { randomUUID } from 'node:crypto'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { sql } from 'drizzle-orm'
import { lists } from './schema'

const DEFAULT_LISTS = ['App', 'Content', 'Teachers Zone'] as const

function main() {
  const dbPath = process.env.DATABASE_PATH ?? path.resolve(process.cwd(), 'data', 'app.db')
  fs.mkdirSync(path.dirname(dbPath), { recursive: true })
  const sqlite = new Database(dbPath)
  sqlite.pragma('foreign_keys = ON')
  const db = drizzle(sqlite)

  const existingCount = db
    .select({ n: sql<number>`count(*)` })
    .from(lists)
    .get()?.n ?? 0

  if (existingCount > 0) {
    console.log(`✓ ${existingCount} list(s) already present — nothing to seed`)
    sqlite.close()
    return
  }

  for (const [i, name] of DEFAULT_LISTS.entries()) {
    db.insert(lists).values({ id: randomUUID(), name, position: i }).run()
    console.log(`  · created "${name}"`)
  }
  sqlite.close()
  console.log(`✓ seeded ${DEFAULT_LISTS.length} default lists`)
}

main()
